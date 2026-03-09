import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { logError } from '@/lib/logger';

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const timestamp = formData.get('timestamp')?.toString() || '';
    const token = formData.get('token')?.toString() || '';
    const signature = formData.get('signature')?.toString() || '';

    if (!verifyMailgunSignature(timestamp, token, signature)) {
      logError('mailgun-webhook-invalid-signature', { timestamp, token, signature });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const from = formData.get('from')?.toString() || '';
    const sender = formData.get('sender')?.toString() || from;
    const subject = formData.get('subject')?.toString() || '';
    const html = formData.get('stripped-html')?.toString() || null;
    const text = formData.get('stripped-text')?.toString() || null;
    const messageId = formData.get('Message-Id')?.toString() || formData.get('message-id')?.toString() || null;

    const threadId = extractThreadId(subject);
    if (!threadId) {
      return NextResponse.json({ success: true, message: 'No thread ID found' });
    }

    const { data: message, error: messageError } = await supabaseAdmin
      .from('customer_messages')
      .select('*, orders(order_number)')
      .eq('email_thread_id', threadId)
      .single();

    if (messageError || !message) {
      logError('mailgun-webhook-message-not-found', { threadId, error: messageError });
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const senderEmail = extractEmail(sender);
    const replyText = getPlainText(html, text);
    if (!replyText.trim()) {
      return NextResponse.json({ error: 'Empty reply' }, { status: 400 });
    }

    const adminEmail = process.env.EMAIL_FROM || 'post@tinglum.com';
    const adminDomain = adminEmail.split('@')[1];
    const senderDomain = senderEmail.split('@')[1];
    const isFromAdmin = senderDomain === adminDomain;

    const { data: reply, error: replyError } = await supabaseAdmin
      .from('message_replies')
      .insert({
        message_id: message.id,
        admin_name: isFromAdmin ? 'Admin (via email)' : message.customer_name,
        reply_text: replyText,
        is_internal: false,
        source: 'email',
        email_message_id: messageId,
      })
      .select()
      .single();

    if (replyError) {
      logError('mailgun-webhook-reply-create', replyError);
      return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }

    const newStatus = isFromAdmin ? 'in_progress' : 'open';
    await supabaseAdmin
      .from('customer_messages')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', message.id);

    if (isFromAdmin && message.customer_email) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no';
        const rendered = await renderManagedTemplate({
          templateKey: 'support.reply.customer.notification',
          locale: 'no',
          variables: {
            customer_name: message.customer_name || 'Kunde',
            thread_id: `msg_${message.id}`,
            subject_line: message.subject,
            reply_text: replyText,
            admin_name: 'Tinglum Gard',
            portal_url: `${appUrl}/min-side`,
            portal_label: 'Min side',
          },
        });

        if (!rendered) {
          throw new Error('Missing template support.reply.customer.notification');
        }

        await dispatchEmail({
          to: message.customer_email,
          subject: rendered.subject,
          html: rendered.html,
          classification: 'support',
          templateKey: rendered.templateKey,
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
            thread_id: `msg_${message.id}`,
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
      thread_id: threadId,
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
