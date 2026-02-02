import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/client';
import { getAdminReplyNotificationTemplate } from '@/lib/email/templates';
import { logError } from '@/lib/logger';

/**
 * Webhook endpoint for handling inbound email replies from Resend
 * 
 * Resend webhook payload format:
 * {
 *   type: 'email.received',
 *   created_at: '2024-01-01T00:00:00.000Z',
 *   data: {
 *     from: 'customer@example.com',
 *     to: ['messages@tinglum.com'],
 *     subject: '[msg_12345] Re: Subject',
 *     html: '<p>Email body</p>',
 *     text: 'Email body',
 *     headers: { ... },
 *     message_id: 'resend-msg-id'
 *   }
 * }
 */

interface ResendEmailWebhookPayload {
  type: string;
  created_at: string;
  data: {
    from: string;
    to: string[];
    subject: string;
    html?: string;
    text?: string;
    headers?: Record<string, string>;
    message_id?: string;
  };
}

// Extract thread ID from email subject
// Expected format: "[msg_12345] Re: Original Subject" or "[msg_12345] Original Subject"
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

// Strip HTML and get plain text
function getPlainText(html: string | undefined, text: string | undefined): string {
  if (text) return text;
  if (html) {
    // Simple HTML stripping - for production, use a proper library
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
    const payload: ResendEmailWebhookPayload = await request.json();

    console.log('Email webhook received:', {
      type: payload.type,
      from: payload.data.from,
      subject: payload.data.subject,
    });

    // Only process email.received events
    if (payload.type !== 'email.received') {
      return NextResponse.json({ success: true, message: 'Event type ignored' });
    }

    const { from, subject, html, text, message_id } = payload.data;
    const threadId = extractThreadId(subject);

    if (!threadId) {
      console.log('No thread ID found in subject:', subject);
      return NextResponse.json({ success: true, message: 'No thread ID found' });
    }

    // Find the message by thread ID
    const { data: message, error: messageError } = await supabaseAdmin
      .from('customer_messages')
      .select('*, orders(order_number)')
      .eq('email_thread_id', threadId)
      .single();

    if (messageError || !message) {
      logError('email-webhook-message-not-found', { threadId, error: messageError });
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const senderEmail = extractEmail(from);
    const replyText = getPlainText(html, text);

    if (!replyText.trim()) {
      return NextResponse.json({ error: 'Empty reply' }, { status: 400 });
    }

    // Determine if this is from admin or customer
    const adminEmail = process.env.EMAIL_FROM || 'post@tinglum.com';
    const adminDomain = adminEmail.split('@')[1];
    const senderDomain = senderEmail.split('@')[1];
    const isFromAdmin = senderDomain === adminDomain;

    // Create the reply
    const { data: reply, error: replyError } = await supabaseAdmin
      .from('message_replies')
      .insert({
        message_id: message.id,
        admin_name: isFromAdmin ? 'Admin (via email)' : message.customer_name,
        reply_text: replyText,
        is_internal: false,
        source: 'email',
        email_message_id: message_id,
      })
      .select()
      .single();

    if (replyError) {
      logError('email-webhook-reply-create', replyError);
      return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }

    // Update message status
    const newStatus = isFromAdmin ? 'in_progress' : 'open';
    await supabaseAdmin
      .from('customer_messages')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', message.id);

    // Send notification to the other party
    if (isFromAdmin && message.customer_email) {
      // Admin replied via email - notify customer
      try {
        const emailTemplate = getAdminReplyNotificationTemplate({
          customerName: message.customer_name || 'Kunde',
          messageId: message.id,
          subject: message.subject,
          replyText,
          adminName: 'Tinglum Gård',
        });

        await sendEmail({
          to: message.customer_email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });

        console.log('Customer notification sent for admin email reply');
      } catch (emailError) {
        logError('email-webhook-customer-notification', emailError);
      }
    } else if (!isFromAdmin && adminEmail) {
      // Customer replied via email - notify admin
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

        console.log('Admin notification sent for customer email reply');
      } catch (emailError) {
        logError('email-webhook-admin-notification', emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      reply_id: reply.id,
      thread_id: threadId,
      source: 'email'
    });

  } catch (error) {
    logError('email-webhook-main', error);
    return NextResponse.json(
      { error: 'Server error processing email' }, 
      { status: 500 }
    );
  }
}

// GET endpoint for testing/verification
export async function GET() {
  return NextResponse.json({ 
    status: 'active',
    endpoint: 'email-reply-webhook',
    description: 'Handles inbound email replies from Resend'
  });
}
