import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { logError } from '@/lib/logger';
import { getCustomerFacingAdminName } from '@/lib/messages/admin-sender';
import { buildCustomerMessageEmail } from '@/lib/messages/customer-email';
import { recordMessageEmailDebugEvent } from '@/lib/messages/email-debug';
import {
  extractSupportThreadId,
  normalizeSupportSubject,
} from '@/lib/messages/threading';

function verifyMailgunSignature(timestamp: string, token: string, signature: string): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) return false;

  const hmac = crypto
    .createHmac('sha256', signingKey)
    .update(`${timestamp}${token}`)
    .digest('hex');

  return hmac === signature;
}

function extractThreadId(subject: string): string | null {
  const match = subject.match(/\[msg_([^\]]+)\]/);
  if (match) return `msg_${match[1]}`;
  return null;
}

function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1] : emailString;
}

function getPlainText(html: string | null, text: string | null): string {
  if (text) return text;
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function buildMessageIdVariants(value: string) {
  const normalized = value.replace(/[<>]/g, '').trim();
  if (!normalized) return [];

  return Array.from(new Set([normalized, `<${normalized}>`]));
}

function extractMessageIds(headerValue: string | null | undefined) {
  const raw = String(headerValue || '').trim();
  if (!raw) return [];

  const bracketMatches = Array.from(raw.matchAll(/<([^>]+)>/g)).map((match) => match[1]);
  if (bracketMatches.length > 0) {
    return bracketMatches;
  }

  return raw
    .split(/\s+/)
    .map((part) => part.replace(/[<>]/g, '').trim())
    .filter(Boolean);
}

function extractThreadIdFromMessageIds(messageIds: string[]) {
  for (const messageId of messageIds) {
    const threadId = extractSupportThreadId(messageId);
    if (threadId) {
      return threadId;
    }
  }

  return null;
}

function getInboundHeaderMap(formData: FormData) {
  const headers = new Map<string, string>();

  formData.forEach((value, key) => {
    if (typeof value !== 'string') return;
    headers.set(key.toLowerCase(), value);
  });

  const rawMessageHeaders = headers.get('message-headers');
  if (rawMessageHeaders) {
    try {
      const parsed = JSON.parse(rawMessageHeaders);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (Array.isArray(entry) && entry.length >= 2) {
            headers.set(String(entry[0]).toLowerCase(), String(entry[1]));
          }
        }
      }
    } catch {
      // Ignore malformed Mailgun message-headers payloads and fall back to direct fields.
    }
  }

  return headers;
}

async function findMessageByProviderReferences(messageIds: string[]) {
  const variants = Array.from(new Set(messageIds.flatMap(buildMessageIdVariants)));
  if (variants.length === 0) {
    return null;
  }

  const { data: queueRows, error: queueError } = await supabaseAdmin
    .from('email_dispatch_queue')
    .select('customer_message_id, sent_at')
    .in('provider_message_id', variants)
    .not('customer_message_id', 'is', null)
    .order('sent_at', { ascending: false });

  if (queueError || !queueRows || queueRows.length === 0) {
    return null;
  }

  for (const row of queueRows) {
    if (!row.customer_message_id) continue;

    const { data: message } = await supabaseAdmin
      .from('customer_messages')
      .select('*, orders(order_number)')
      .eq('id', row.customer_message_id)
      .maybeSingle();

    if (message) {
      return message;
    }
  }

  return null;
}

async function findMessageByThreadId(threadId: string | null) {
  if (!threadId) return null;

  const { data: message } = await supabaseAdmin
    .from('customer_messages')
    .select('*, orders(order_number)')
    .eq('email_thread_id', threadId)
    .maybeSingle();

  return message || null;
}

async function findMessageBySenderAndSubject(senderEmail: string, subject: string) {
  const normalizedSenderEmail = extractEmail(senderEmail).trim().toLowerCase();
  const normalizedSubject = normalizeSupportSubject(subject);

  if (!normalizedSenderEmail || !normalizedSubject) {
    return null;
  }

  const { data: messages, error } = await supabaseAdmin
    .from('customer_messages')
    .select('*, orders(order_number)')
    .eq('customer_email', normalizedSenderEmail)
    .order('updated_at', { ascending: false })
    .limit(25);

  if (error || !messages || messages.length === 0) {
    return null;
  }

  return messages.find((message) => normalizeSupportSubject(message.subject) === normalizedSubject) || null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const headerMap = getInboundHeaderMap(formData);

    const timestamp = formData.get('timestamp')?.toString() || '';
    const token = formData.get('token')?.toString() || '';
    const signature = formData.get('signature')?.toString() || '';

    if (!verifyMailgunSignature(timestamp, token, signature)) {
      logError('mailgun-webhook-invalid-signature', { timestamp, token, signature });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const from = formData.get('from')?.toString() || '';
    const sender = formData.get('sender')?.toString() || from;
    const senderEmail = extractEmail(sender).trim().toLowerCase();
    const recipient =
      formData.get('recipient')?.toString() ||
      formData.get('To')?.toString() ||
      formData.get('to')?.toString() ||
      headerMap.get('to') ||
      process.env.EMAIL_FROM ||
      'post@tinglum.com';
    const subject = formData.get('subject')?.toString() || '';
    const normalizedSubject = normalizeSupportSubject(subject);
    const html = formData.get('stripped-html')?.toString() || null;
    const text = formData.get('stripped-text')?.toString() || null;
    const messageId =
      formData.get('Message-Id')?.toString() || formData.get('message-id')?.toString() || null;

    const inReplyToIds = extractMessageIds(headerMap.get('in-reply-to'));
    const referenceIds = extractMessageIds(headerMap.get('references'));
    const candidateMessageIds = [...inReplyToIds, ...referenceIds];

    const headerThreadId = extractThreadIdFromMessageIds(candidateMessageIds);
    const subjectThreadId = extractThreadId(subject);
    let matchStrategy: string | null = null;
    let message = await findMessageByProviderReferences(candidateMessageIds);
    let threadId = message?.email_thread_id || null;
    if (message) {
      matchStrategy = 'provider_reference';
    }

    if (!message) {
      threadId = headerThreadId;
      message = await findMessageByThreadId(threadId);
      if (message) {
        matchStrategy = 'header_thread_id';
      }
    }

    if (!message) {
      threadId = subjectThreadId;
      message = await findMessageByThreadId(threadId);
      if (message) {
        matchStrategy = 'subject_thread_token';
      }
    }

    if (!message) {
      message = await findMessageBySenderAndSubject(senderEmail, subject);
      threadId = message?.email_thread_id || null;
      if (message) {
        matchStrategy = 'sender_subject_fallback';
      }
    }

    if (!message) {
      await recordMessageEmailDebugEvent({
        emailThreadId: headerThreadId || subjectThreadId || null,
        customerEmail: senderEmail,
        direction: 'inbound',
        eventType: 'inbound_email_unmatched',
        matchStatus: 'unmatched',
        matchStrategy: 'none',
        senderEmail,
        recipientEmail: recipient,
        emailSubject: subject,
        normalizedSubject,
        providerMessageId: messageId,
        details: {
          inReplyToIds,
          referenceIds,
          candidateMessageIds,
          headerThreadId,
          subjectThreadId,
        },
      });
      logError('mailgun-webhook-no-thread-reference', {
        senderEmail,
        subject,
        inReplyToIds,
        referenceIds,
      });
      return NextResponse.json({ success: true, message: 'No thread reference found' });
    }

    await recordMessageEmailDebugEvent({
      messageId: message.id,
      emailThreadId: threadId || message.email_thread_id || null,
      customerEmail: message.customer_email || senderEmail,
      direction: 'inbound',
      eventType: 'inbound_email_matched',
      matchStatus: 'matched',
      matchStrategy,
      senderEmail,
      recipientEmail: recipient,
      emailSubject: subject,
      normalizedSubject,
      providerMessageId: messageId,
      details: {
        inReplyToIds,
        referenceIds,
        candidateMessageIds,
        headerThreadId,
        subjectThreadId,
      },
    });

    const replyText = getPlainText(html, text);
    if (!replyText.trim()) {
      await recordMessageEmailDebugEvent({
        messageId: message.id,
        emailThreadId: threadId || message.email_thread_id || null,
        customerEmail: message.customer_email || senderEmail,
        direction: 'inbound',
        eventType: 'inbound_email_empty',
        matchStatus: 'error',
        matchStrategy,
        senderEmail,
        recipientEmail: recipient,
        emailSubject: subject,
        normalizedSubject,
        providerMessageId: messageId,
      });
      return NextResponse.json({ error: 'Empty reply' }, { status: 400 });
    }

    const adminEmail = process.env.EMAIL_FROM || 'post@tinglum.com';
    const adminDomain = adminEmail.split('@')[1];
    const senderDomain = senderEmail.split('@')[1];
    const isFromAdmin = senderDomain === adminDomain;
    const adminSenderName = isFromAdmin
      ? getCustomerFacingAdminName({
          name: formData.get('From')?.toString() || sender,
          email: senderEmail,
        })
      : null;

    const { data: reply, error: replyError } = await supabaseAdmin
      .from('message_replies')
      .insert({
        message_id: message.id,
        admin_name: isFromAdmin ? adminSenderName : message.customer_name || senderEmail,
        reply_text: replyText,
        is_internal: false,
        is_from_customer: !isFromAdmin,
        source: 'email',
        email_message_id: messageId,
      })
      .select()
      .single();

    if (replyError) {
      await recordMessageEmailDebugEvent({
        messageId: message.id,
        emailThreadId: threadId || message.email_thread_id || null,
        customerEmail: message.customer_email || senderEmail,
        direction: 'inbound',
        eventType: 'inbound_reply_create_failed',
        matchStatus: 'error',
        matchStrategy,
        senderEmail,
        recipientEmail: recipient,
        emailSubject: subject,
        normalizedSubject,
        providerMessageId: messageId,
        details: {
          error: replyError.message || null,
          details: replyError.details || null,
          hint: replyError.hint || null,
        },
      });
      logError('mailgun-webhook-reply-create', replyError);
      return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }

    const newStatus = isFromAdmin ? 'in_progress' : 'open';
    await supabaseAdmin
      .from('customer_messages')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', message.id);

    await recordMessageEmailDebugEvent({
      messageId: message.id,
      emailThreadId: threadId || message.email_thread_id || null,
      customerEmail: message.customer_email || senderEmail,
      direction: 'inbound',
      eventType: 'inbound_reply_stored',
      matchStatus: 'matched',
      matchStrategy,
      senderEmail,
      recipientEmail: recipient,
      emailSubject: subject,
      normalizedSubject,
      providerMessageId: messageId,
      details: {
        replyId: reply.id,
        source: 'email',
        isFromAdmin,
        newStatus,
      },
    });

    if (isFromAdmin && message.customer_email) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no';
        const isAdminInitiated = message.initiated_by === 'admin';
        const rendered = isAdminInitiated
          ? buildCustomerMessageEmail({
              locale: 'no',
              customerName: message.customer_name || 'Kunde',
              adminName: adminSenderName,
              subjectLine: message.subject,
              messageText: replyText,
              portalUrl: `${appUrl}/min-side`,
              portalLabel: 'Min side',
            })
          : await renderManagedTemplate({
              templateKey: 'support.reply.customer.notification',
              locale: 'no',
              variables: {
                customer_name: message.customer_name || 'Kunde',
                thread_id: String(message.email_thread_id || `msg_${message.id}`),
                subject_line: message.subject,
                reply_text: replyText,
                admin_name: adminSenderName || 'Tinglum G\u00E5rd',
                portal_url: `${appUrl}/min-side`,
                portal_label: 'Min side',
              },
            });

        if (!rendered) {
          throw new Error('Missing customer notification template');
        }

        await dispatchEmail({
          to: message.customer_email,
          subject: rendered.subject,
          html: rendered.html,
          classification: 'support',
          templateKey: isAdminInitiated
            ? 'support.message.customer.admin_initiated'
            : ((rendered as any).templateKey as string) || 'support.reply.customer.notification',
          sourcePath: '/api/webhooks/email-reply',
          customerMessageId: message.id,
        });
      } catch (emailError) {
        logError('mailgun-webhook-customer-notification', emailError);
      }
    } else if (!isFromAdmin && adminEmail) {
      try {
        const orderNumber = message.orders?.order_number || null;
        const rendered = await renderManagedTemplate({
          templateKey: 'support.reply.admin.notification',
          locale: 'no',
          variables: {
            thread_id: String(message.email_thread_id || `msg_${message.id}`),
            customer_name: message.customer_name || 'Kunde',
            customer_phone: message.customer_phone || '',
            customer_email: message.customer_email || '',
            order_number: orderNumber ? `Ordre: ${orderNumber}` : '',
            subject_line: message.subject,
            reply_text: replyText,
          },
        });

        if (!rendered) {
          throw new Error('Missing template support.reply.admin.notification');
        }

        await dispatchEmail({
          to: adminEmail,
          subject: rendered.subject,
          html: rendered.html,
          classification: 'support',
          templateKey: rendered.templateKey,
          sourcePath: '/api/webhooks/email-reply',
          customerMessageId: message.id,
        });
      } catch (emailError) {
        logError('mailgun-webhook-admin-notification', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      reply_id: reply.id,
      thread_id: threadId || message.email_thread_id || null,
      source: 'email',
    });
  } catch (error) {
    logError('mailgun-webhook-main', error);
    return NextResponse.json({ error: 'Server error processing email' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: 'email-reply-webhook',
    description: 'Handles inbound email replies from Mailgun',
  });
}
