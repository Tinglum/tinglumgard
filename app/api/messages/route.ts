import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';
import { sendEmail } from '@/lib/email/client';
import { getCustomerMessageConfirmationTemplate } from '@/lib/email/templates';

// GET /api/messages - Fetch customer's messages
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.phoneNumber) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { data: messages, error } = await supabaseAdmin
      .from('customer_messages')
      .select(`
        *,
        message_replies (
          id,
          admin_name,
          reply_text,
          is_internal,
          created_at
        )
      `)
      .eq('customer_phone', session.phoneNumber)
      .order('created_at', { ascending: false });

    if (error) {
      logError('messages-get', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    logError('messages-get-main', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/messages - Create new message
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.phoneNumber) {
      logError('messages-post-no-session', { session });
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const {
      subject,
      message,
      message_type,
      order_id,
    } = await request.json();

    if (!subject || !message || !message_type) {
      logError('messages-post-missing-fields', { subject: !!subject, message: !!message, message_type: !!message_type });
      return NextResponse.json(
        { error: 'Subject, message, and message_type are required' },
        { status: 400 }
      );
    }

    console.log('Creating message with phone:', session.phoneNumber);
    
    const { data: newMessage, error } = await supabaseAdmin
      .from('customer_messages')
      .insert({
        customer_phone: session.phoneNumber,
        customer_name: session.name || null,
        customer_email: session.email || null,
        subject,
        message,
        message_type,
        order_id: order_id || null,
        status: 'open',
        priority: 'normal',
      })
      .select()
      .single();

    if (error) {
      console.error('Database error details:', {
        error: error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        phone: session.phoneNumber
      });
      logError('messages-post-db-error', { 
        error: error?.message, 
        details: error?.details,
        hint: error?.hint,
        phone: session.phoneNumber 
      });
      return NextResponse.json({ error: 'Failed to create message', details: error?.message }, { status: 500 });
    }

    // Send confirmation email to customer
    if (session.email) {
      try {
        // Get order number if order_id provided
        let orderNumber = null;
        if (order_id) {
          const { data: orderData } = await supabaseAdmin
            .from('orders')
            .select('order_number')
            .eq('id', order_id)
            .single();
          orderNumber = orderData?.order_number || null;
        }

        const emailTemplate = getCustomerMessageConfirmationTemplate({
          customerName: session.name || 'Kunde',
          messageId: newMessage.id,
          subject,
          message,
          orderNumber,
        });

        const emailResult = await sendEmail({
          to: session.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });

        if (emailResult.success) {
          console.log('Customer message confirmation email sent to:', session.email, 'ID:', emailResult.id);
        } else {
          console.error('Failed to send customer confirmation email:', emailResult.error);
        }
      } catch (emailError) {
        logError('messages-customer-confirmation-email', emailError);
        // Don't fail the message creation if email fails
      }
    }

    // Send notification email to admin
    const adminEmail = process.env.EMAIL_FROM || 'post@tinglum.com';
    if (adminEmail) {
      try {
        let orderNumber = null;
        if (order_id) {
          const { data: orderData } = await supabaseAdmin
            .from('orders')
            .select('order_number')
            .eq('id', order_id)
            .single();
          orderNumber = orderData?.order_number || null;
        }

        const adminNotificationHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .header { background: #2C1810; color: white; padding: 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px; margin: 20px 0; border-radius: 8px; }
    .message-box { background: #fff9e6; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Ny kundemelding</h1>
    </div>
    <div class="content">
      <p><strong>Fra:</strong> ${session.name || 'Ukjent'} (${session.phoneNumber})</p>
      <p><strong>E-post:</strong> ${session.email || 'Ikke oppgitt'}</p>
      ${orderNumber ? `<p><strong>Ordre:</strong> ${orderNumber}</p>` : ''}
      <p><strong>Type:</strong> ${message_type}</p>
      <p><strong>Emne:</strong> ${subject}</p>
      
      <div class="message-box">
        <p style="white-space: pre-wrap;">${message}</p>
      </div>

      <p style="margin-top: 20px;">
        <strong>Svar på denne e-posten direkte for å svare kunden.</strong>
      </p>
    </div>
  </div>
</body>
</html>
        `;

        const adminEmailResult = await sendEmail({
          to: adminEmail,
          subject: `Ny melding fra ${session.name || session.phoneNumber}: ${subject}`,
          html: adminNotificationHtml,
        });

        if (adminEmailResult.success) {
          console.log('Admin notification email sent to:', adminEmail, 'ID:', adminEmailResult.id);
        } else {
          console.error('Failed to send admin notification email:', adminEmailResult.error);
        }
      } catch (emailError) {
        logError('messages-admin-notification-email', emailError);
        // Don't fail the message creation if email fails
      }
    }

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    logError('messages-post-catch', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
