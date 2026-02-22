import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/client';
import { getAdminReplyNotificationTemplate } from '@/lib/email/templates';
import { logError } from '@/lib/logger';

/**
 * Webhook endpoint for handling inbound email replies from Mailgun
 * Mailgun inbound webhook is sent as form-data.
 */

function verifyMailgunSignature(timestamp: string, token: string, signature: string): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) return false;

  const hmac = crypto
    .createHmac('sha256', signingKey)
    .update(`${timestamp}${token}`)
    .digest('hex');

  return hmac === signature;
}

// Extract thread ID from email subject
function extractThreadId(subject: string): string | null {
  const match = subject.match(/\[msg_([^\]]+)\]/);
  if (match) {
    return `msg_${match[1]}`;
  }
  return null;
}

// Extract clean email address from "Name <email@example.com>" format
function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1] : emailString;
}

function getPlainText(html: string | null, text: string | null): string {
  if (text) return text;
  if (html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
  return '';
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

    console.log('Mailgun webhook received:', { sender, subject });

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
        const isEggMessage = typeof message.message_type === 'string' && message.message_type.startsWith('egg');
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no';
        const emailTemplate = getAdminReplyNotificationTemplate({
          customerName: message.customer_name || 'Kunde',
          messageId: message.id,
          subject: message.subject,
          replyText,
          adminName: 'Tinglum Gård',
          portalUrl: appUrl + '/min-side',
          portalLabel: 'Min side',
        });

        await sendEmail({
          to: message.customer_email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });
      } catch (emailError) {
        logError('mailgun-webhook-customer-notification', emailError);
      }
    } else if (!isFromAdmin && adminEmail) {
      try {
        const orderNumber = message.orders?.order_number || null;
        const adminNotificationHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C1810; color: white; padding: 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px; }
    .reply-box { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Kundesvar (via e-post)</h1>
    </div>
    <div class="content">
      <p><strong>Fra:</strong> ${message.customer_name} (${message.customer_phone})</p>
      <p><strong>E-post:</strong> ${message.customer_email}</p>
      ${orderNumber ? `<p><strong>Ordre:</strong> ${orderNumber}</p>` : ''}
      <p><strong>Melding:</strong> ${message.subject}</p>
      
      <div class="reply-box">
        <p><strong>Kundens svar:</strong></p>
        <p style="white-space: pre-wrap;">${replyText}</p>
      </div>

      <p style="margin-top: 20px;">
        <strong>Svar på denne e-posten direkte for å svare kunden.</strong>
      </p>
    </div>
  </div>
</body>
</html>
        `;

        await sendEmail({
          to: adminEmail,
          subject: `[${threadId}] Svar fra ${message.customer_name}: ${message.subject}`,
          html: adminNotificationHtml,
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


