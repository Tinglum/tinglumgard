import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { recordMessageEmailDebugEvent } from '@/lib/messages/email-debug';
import { buildSupportThreadMessageId } from '@/lib/messages/threading';
import { getNoReplyAddress } from '@/lib/messages/no-reply-address';

const MESSAGE_TYPES = new Set(['support', 'inquiry', 'complaint', 'feedback', 'referral_question']);
const RELATED_ORDER_SOURCES = new Set(['pig', 'egg', 'chicken']);

function normalizePhone(value?: string | null) {
  return (value || '').replace(/\D/g, '');
}

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function isPhoneMatch(sessionPhone?: string | null, messagePhone?: string | null) {
  const a = normalizePhone(sessionPhone);
  const b = normalizePhone(messagePhone);
  if (!a || !b) return false;
  if (a === b) return true;

  const a8 = a.slice(-8);
  const b8 = b.slice(-8);
  if (a8.length === 8 && b8.length === 8 && a8 === b8) return true;

  const a4 = a.slice(-4);
  const b4 = b.slice(-4);
  return a4.length === 4 && b4.length === 4 && a4 === b4;
}

function isEmailMatch(sessionEmail?: string | null, messageEmail?: string | null) {
  const a = normalizeEmail(sessionEmail);
  const b = normalizeEmail(messageEmail);
  return Boolean(a) && Boolean(b) && a === b;
}

function buildIdentityOrFilter(sessionPhone?: string | null, sessionEmail?: string | null) {
  const parts: string[] = [];
  const rawPhone = (sessionPhone || '').trim();
  const normalizedPhone = normalizePhone(sessionPhone);
  const normalizedEmail = normalizeEmail(sessionEmail);

  if (rawPhone) {
    parts.push(`customer_phone.eq.${rawPhone}`);
  }
  if (normalizedPhone.length >= 8) {
    parts.push(`customer_phone.ilike.%${normalizedPhone.slice(-8)}`);
  }
  if (normalizedEmail) {
    parts.push(`customer_email.ilike.${normalizedEmail}`);
  }

  return parts.join(',');
}

// GET /api/messages - Fetch customer's messages
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.phoneNumber && !session?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const identityFilter = buildIdentityOrFilter(session.phoneNumber, session.email as string | undefined);

    let query = supabaseAdmin
      .from('customer_messages')
      .select(`
        *,
        message_replies (
          id,
          admin_name,
          reply_text,
          is_internal,
          is_from_customer,
          created_at
        )
      `)
      .order('updated_at', { ascending: false });

    if (identityFilter) {
      query = query.or(identityFilter);
    }

    const { data: messages, error } = await query;

    if (error) {
      logError('messages-get', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    const ownMessages = (messages || []).filter((message: any) => {
      return (
        isPhoneMatch(session.phoneNumber, message.customer_phone) ||
        isEmailMatch(session.email as string | undefined, message.customer_email)
      );
    });

    return NextResponse.json({ messages: ownMessages });
  } catch (error) {
    logError('messages-get-main', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/messages - Create new message
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.phoneNumber && !session?.email) {
      logError('messages-post-no-session', { session });
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { subject, message, message_type, order_id, related_order_source, related_order_id } =
      await request.json();

    if (!subject || !message || !message_type || !MESSAGE_TYPES.has(String(message_type))) {
      logError('messages-post-missing-fields', {
        subject: !!subject,
        message: !!message,
        message_type: !!message_type,
      });
      return NextResponse.json(
        { error: 'Subject, message, and message_type are required' },
        { status: 400 }
      );
    }

    if (
      (related_order_source &&
        (!RELATED_ORDER_SOURCES.has(String(related_order_source)) || !related_order_id)) ||
      (!related_order_source && related_order_id)
    ) {
      return NextResponse.json({ error: 'Invalid related order reference' }, { status: 400 });
    }

    const relatedOrderSource = String(related_order_source || '').trim() || (order_id ? 'pig' : null);
    const relatedOrderId = String(related_order_id || order_id || '').trim() || null;
    const legacyOrderId = relatedOrderSource === 'pig' ? relatedOrderId : null;

    const { data: newMessage, error } = await supabaseAdmin
      .from('customer_messages')
      .insert({
        customer_phone: session.phoneNumber || null,
        customer_name: session.name || null,
        customer_email: session.email || null,
        subject,
        message,
        message_type,
        order_id: legacyOrderId,
        status: 'open',
        priority: 'normal',
        initiated_by: 'customer',
        related_order_source: relatedOrderSource,
        related_order_id: relatedOrderId,
      })
      .select()
      .single();

    if (error) {
      logError('messages-post-db-error', {
        error: error?.message,
        details: error?.details,
        hint: error?.hint,
        phone: session.phoneNumber || null,
      });
      return NextResponse.json({ error: 'Failed to create message', details: error?.message }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no';
    const threadId = String(newMessage.email_thread_id || `msg_${newMessage.id}`);
    let orderNumber: string | null = null;

    if (relatedOrderId && relatedOrderSource === 'pig') {
      const { data: orderData } = await supabaseAdmin
        .from('orders')
        .select('order_number')
        .eq('id', relatedOrderId)
        .maybeSingle();
      orderNumber = orderData?.order_number || null;
    } else if (relatedOrderId && relatedOrderSource === 'egg') {
      const { data: orderData } = await supabaseAdmin
        .from('egg_orders')
        .select('order_number')
        .eq('id', relatedOrderId)
        .maybeSingle();
      orderNumber = orderData?.order_number || null;
    } else if (relatedOrderId && relatedOrderSource === 'chicken') {
      const { data: orderData } = await supabaseAdmin
        .from('chicken_orders')
        .select('order_number')
        .eq('id', relatedOrderId)
        .maybeSingle();
      orderNumber = orderData?.order_number || null;
    }

    if (session.email) {
      const outboundMessageId = buildSupportThreadMessageId(threadId, 'customer-confirmation');
      try {
        const rendered = await renderManagedTemplate({
          templateKey: 'support.message.customer.confirmation',
          locale: 'no',
          variables: {
            customer_name: session.name || 'Kunde',
            thread_id: threadId,
            subject_line: subject,
            order_number: orderNumber ? `Ordre: ${orderNumber}` : '',
            message_text: message,
            portal_url: `${appUrl}/min-side`,
            portal_label: 'Min side',
          },
        });

        if (!rendered) {
          throw new Error('Missing template support.message.customer.confirmation');
        }

        const dispatchResult = await dispatchEmail({
          to: session.email,
          subject: rendered.subject,
          html: rendered.html,
          replyTo: getNoReplyAddress(),
          headers: {
            'Message-ID': outboundMessageId,
            'X-Tinglum-Thread-Id': threadId,
          },
          classification: 'support',
          templateKey: rendered.templateKey,
          sourcePath: '/api/messages',
          customerMessageId: newMessage.id,
        });

        await recordMessageEmailDebugEvent({
          messageId: newMessage.id,
          emailThreadId: threadId,
          customerEmail: session.email,
          direction: 'outbound',
          eventType: dispatchResult.success
            ? 'outbound_customer_confirmation_sent'
            : 'outbound_customer_confirmation_failed',
          matchStatus: dispatchResult.success ? 'matched' : 'error',
          matchStrategy: 'thread_headers',
          senderEmail: process.env.EMAIL_FROM || 'post@tinglum.com',
          recipientEmail: session.email,
          emailSubject: rendered.subject,
          providerMessageId: dispatchResult.id || null,
          details: {
            queueId: dispatchResult.queueId || null,
            hiddenMessageId: outboundMessageId,
            templateKey: rendered.templateKey,
            error: dispatchResult.error || null,
          },
        });

        if (!dispatchResult.success) {
          logError('messages-customer-confirmation-email-dispatch-failed', {
            messageId: newMessage.id,
            threadId,
            queueId: dispatchResult.queueId || null,
            error: dispatchResult.error || 'unknown_dispatch_error',
          });
        }
      } catch (emailError) {
        logError('messages-customer-confirmation-email', emailError);
        await recordMessageEmailDebugEvent({
          messageId: newMessage.id,
          emailThreadId: threadId,
          customerEmail: session.email,
          direction: 'outbound',
          eventType: 'outbound_customer_confirmation_failed',
          matchStatus: 'error',
          matchStrategy: 'thread_headers',
          senderEmail: process.env.EMAIL_FROM || 'post@tinglum.com',
          recipientEmail: session.email,
          emailSubject: subject,
          details: {
            hiddenMessageId: outboundMessageId,
            templateKey: 'support.message.customer.confirmation',
            error: emailError instanceof Error ? emailError.message : String(emailError),
          },
        });
      }
    }

    const adminEmail = process.env.EMAIL_FROM || 'post@tinglum.com';
    if (adminEmail) {
      try {
        const rendered = await renderManagedTemplate({
          templateKey: 'support.message.admin.new',
          locale: 'no',
          variables: {
            thread_id: threadId,
            customer_name: session.name || 'Ukjent',
            customer_phone: session.phoneNumber || '',
            customer_email: session.email || 'Ikke oppgitt',
            order_number: orderNumber ? `Ordre: ${orderNumber}` : '',
            message_type,
            subject_line: subject,
            message_text: message,
          },
        });

        if (!rendered) {
          throw new Error('Missing template support.message.admin.new');
        }

        await dispatchEmail({
          to: adminEmail,
          subject: rendered.subject,
          html: rendered.html,
          replyTo: getNoReplyAddress(),
          classification: 'support',
          templateKey: rendered.templateKey,
          sourcePath: '/api/messages',
          customerMessageId: newMessage.id,
        });
      } catch (emailError) {
        logError('messages-admin-notification-email', emailError);
      }
    }

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    logError('messages-post-catch', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
