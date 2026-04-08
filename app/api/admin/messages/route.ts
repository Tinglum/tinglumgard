import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';
import { dispatchEmail } from '@/lib/email/dispatch';
import { buildCustomerMessageEmail } from '@/lib/messages/customer-email';
import { getCustomerFacingAdminName } from '@/lib/messages/admin-sender';
import { recordMessageEmailDebugEvent } from '@/lib/messages/email-debug';
import { buildSupportThreadMessageId } from '@/lib/messages/threading';
import { needsAdminAttention } from '@/lib/messages/admin-attention';

const MESSAGE_TYPES = new Set(['support', 'inquiry', 'complaint', 'feedback', 'referral_question']);
const PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const RELATED_ORDER_SOURCES = new Set(['pig', 'egg', 'chicken']);

function normalizeEmail(value?: string | null) {
  const email = String(value || '').trim().toLowerCase();
  return email || null;
}

function normalizePhone(value?: string | null) {
  const phone = String(value || '').trim();
  return phone || null;
}

function buildOrderBlock(locale: 'no' | 'en', orderNumber: string | null, orderSource: string | null) {
  if (!orderNumber) return '';

  const sourceLabel =
    orderSource === 'egg'
      ? locale === 'en'
        ? 'Hatching eggs'
        : 'Rugeegg'
      : orderSource === 'chicken'
        ? locale === 'en'
          ? 'Chickens'
          : 'Kyllinger'
        : locale === 'en'
          ? 'Mangalitsa'
          : 'Mangalitsa';

  const label = locale === 'en' ? 'Regarding order' : 'Gjelder ordre';

  return `<p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#6B5B4E;">${label}: ${orderNumber}${sourceLabel ? ` (${sourceLabel})` : ''}</p>`;
}

async function resolveOrderNumber(source: string | null, id: string | null) {
  if (!source || !id) return null;

  if (source === 'pig') {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('order_number')
      .eq('id', id)
      .maybeSingle();
    return data?.order_number || null;
  }

  if (source === 'egg') {
    const { data } = await supabaseAdmin
      .from('egg_orders')
      .select('order_number')
      .eq('id', id)
      .maybeSingle();
    return data?.order_number || null;
  }

  if (source === 'chicken') {
    const { data } = await supabaseAdmin
      .from('chicken_orders')
      .select('order_number')
      .eq('id', id)
      .maybeSingle();
    return data?.order_number || null;
  }

  return null;
}

// GET /api/admin/messages - Get all messages (with filtering)
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');

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
          source,
          created_at
        )
      `)
      .order('updated_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (type) query = query.eq('message_type', type);

    const { data: messages, error } = await query;

    if (error) {
      logError('admin-messages-get', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    const allMessages = messages || [];

    const stats = {
      total: allMessages.length,
      open: allMessages.filter((message) => message.status === 'open').length,
      in_progress: allMessages.filter((message) => message.status === 'in_progress').length,
      resolved: allMessages.filter((message) => message.status === 'resolved').length,
      attention_required: allMessages.filter(needsAdminAttention).length,
    };

    return NextResponse.json({ messages: allMessages, stats });
  } catch (error) {
    logError('admin-messages-get-main', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/admin/messages - Create a new admin-initiated support thread
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const subject = String(body?.subject || '').trim();
    const message = String(body?.message || '').trim();
    const messageType = String(body?.message_type || '').trim();
    const priority = String(body?.priority || 'normal').trim();
    const customerName = String(body?.customer_name || '').trim();
    const customerEmail = normalizeEmail(body?.customer_email);
    const customerPhone = normalizePhone(body?.customer_phone);
    const relatedOrderSource = String(body?.related_order_source || '').trim() || null;
    const relatedOrderId = String(body?.related_order_id || '').trim() || null;

    if (!subject || !message || !MESSAGE_TYPES.has(messageType)) {
      return NextResponse.json(
        { error: 'Subject, message, and valid message_type are required' },
        { status: 400 }
      );
    }

    if (!PRIORITIES.has(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }

    if (!customerEmail && !customerPhone) {
      return NextResponse.json(
        { error: 'Customer must have at least an email or phone number' },
        { status: 400 }
      );
    }

    if (
      (relatedOrderSource && (!RELATED_ORDER_SOURCES.has(relatedOrderSource) || !relatedOrderId)) ||
      (!relatedOrderSource && relatedOrderId)
    ) {
      return NextResponse.json({ error: 'Invalid related order reference' }, { status: 400 });
    }

    const adminName = getCustomerFacingAdminName({
      name: session.name,
      email: session.email,
    });
    const fallbackCustomerName = customerName || customerEmail || customerPhone || 'Customer';
    const legacyOrderId = relatedOrderSource === 'pig' ? relatedOrderId : null;

    const { data: newMessage, error } = await supabaseAdmin
      .from('customer_messages')
      .insert({
        order_id: legacyOrderId,
        customer_phone: customerPhone,
        customer_name: fallbackCustomerName,
        customer_email: customerEmail,
        subject,
        message,
        message_type: messageType,
        status: 'in_progress',
        priority,
        initiated_by: 'admin',
        initiated_by_admin_name: adminName,
        related_order_source: relatedOrderSource,
        related_order_id: relatedOrderId,
      })
      .select(`
        *,
        message_replies (
          id,
          admin_name,
          reply_text,
          is_internal,
          is_from_customer,
          source,
          created_at
        )
      `)
      .single();

    if (error) {
      logError('admin-messages-post-insert', error);
      return NextResponse.json({ error: 'Failed to create message thread' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no';
    const threadId = String(newMessage.email_thread_id || `msg_${newMessage.id}`);
    const orderNumber = await resolveOrderNumber(relatedOrderSource, relatedOrderId);
    let emailDispatched = false;

    if (customerEmail) {
      const outboundMessageId = buildSupportThreadMessageId(threadId, 'admin-message');
      try {
        const rendered = buildCustomerMessageEmail({
          locale: 'no',
          customerName: fallbackCustomerName,
          adminName,
          subjectLine: subject,
          messageText: message,
          portalUrl: `${appUrl}/min-side`,
          portalLabel: 'Min side',
          orderContextHtml: buildOrderBlock('no', orderNumber, relatedOrderSource),
        });

        const dispatchResult = await dispatchEmail({
          to: customerEmail,
          subject: rendered.subject,
          html: rendered.html,
          headers: {
            'Message-ID': outboundMessageId,
            'X-Tinglum-Thread-Id': threadId,
          },
          classification: 'support',
          templateKey: 'support.message.customer.admin_initiated',
          sourcePath: '/api/admin/messages',
          customerMessageId: newMessage.id,
          sendImmediately: true,
        });

        emailDispatched = dispatchResult.success;

        await recordMessageEmailDebugEvent({
          messageId: newMessage.id,
          emailThreadId: threadId,
          customerEmail,
          direction: 'outbound',
          eventType: dispatchResult.success
            ? 'outbound_admin_message_sent'
            : 'outbound_admin_message_failed',
          matchStatus: dispatchResult.success ? 'matched' : 'error',
          matchStrategy: 'thread_headers',
          senderEmail: session.email || process.env.EMAIL_FROM || 'post@tinglum.com',
          recipientEmail: customerEmail,
          emailSubject: rendered.subject,
          providerMessageId: dispatchResult.id || null,
          details: {
            queueId: dispatchResult.queueId || null,
            hiddenMessageId: outboundMessageId,
            templateKey: 'support.message.customer.admin_initiated',
            sendImmediately: true,
            error: dispatchResult.error || null,
          },
        });

        if (!dispatchResult.success) {
          logError('admin-messages-post-email-dispatch-failed', {
            messageId: newMessage.id,
            threadId,
            queueId: dispatchResult.queueId || null,
            error: dispatchResult.error || 'unknown_dispatch_error',
          });
        }
      } catch (emailError) {
        logError('admin-messages-post-email', emailError);
        await recordMessageEmailDebugEvent({
          messageId: newMessage.id,
          emailThreadId: threadId,
          customerEmail,
          direction: 'outbound',
          eventType: 'outbound_admin_message_failed',
          matchStatus: 'error',
          matchStrategy: 'thread_headers',
          senderEmail: session.email || process.env.EMAIL_FROM || 'post@tinglum.com',
          recipientEmail: customerEmail,
          emailSubject: subject,
          details: {
            hiddenMessageId: outboundMessageId,
            templateKey: 'support.message.customer.admin_initiated',
            sendImmediately: true,
            error: emailError instanceof Error ? emailError.message : String(emailError),
          },
        });
      }
    }

    return NextResponse.json(
      {
        message: newMessage,
        emailDispatched,
        delivery:
          customerEmail && emailDispatched
            ? 'email_and_portal'
            : customerPhone
              ? 'portal_only'
              : 'email_only',
      },
      { status: 201 }
    );
  } catch (error) {
    logError('admin-messages-post-main', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
