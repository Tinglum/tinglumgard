import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { sendEmail } from '@/lib/email/client';
import { supabaseAdmin } from '@/lib/supabase/server';

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function normalizePhone(value?: string | null) {
  return (value || '').replace(/\D/g, '');
}

function isPhoneMatch(sessionPhone: string, orderPhone: string) {
  if (!sessionPhone || !orderPhone) return false;
  if (sessionPhone === orderPhone) return true;

  const sessionSuffix8 = sessionPhone.slice(-8);
  const orderSuffix8 = orderPhone.slice(-8);
  if (sessionSuffix8.length === 8 && orderSuffix8.length === 8 && sessionSuffix8 === orderSuffix8) {
    return true;
  }

  const sessionSuffix4 = sessionPhone.slice(-4);
  const orderSuffix4 = orderPhone.slice(-4);
  return sessionSuffix4.length === 4 && orderSuffix4.length === 4 && sessionSuffix4 === orderSuffix4;
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { orderNumber, orderDetails, message } = await request.json();
    const trimmedMessage = (message || '').trim();

    if (!trimmedMessage || !orderNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!session.phoneNumber) {
      return NextResponse.json({ error: 'Missing phone number in session' }, { status: 400 });
    }

    let matchedOrder: { id: string } | null = null;
    const normalizedSessionPhone = normalizePhone(session.phoneNumber);
    const normalizedSessionEmail = normalizeEmail(session.email as string | undefined);

    const { data: orderCandidates } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, customer_phone, customer_email')
      .eq('order_number', orderNumber)
      .limit(5);

    if (orderCandidates?.length) {
      matchedOrder =
        orderCandidates.find((order: any) => {
          const ownsByUserId = Boolean(order.user_id) && order.user_id === session.userId;
          const ownsByPhone = isPhoneMatch(normalizedSessionPhone, normalizePhone(order.customer_phone));
          const ownsByEmail =
            Boolean(normalizedSessionEmail) &&
            Boolean(normalizeEmail(order.customer_email)) &&
            normalizeEmail(order.customer_email) === normalizedSessionEmail;

          return ownsByUserId || ownsByPhone || ownsByEmail;
        }) || null;
    }

    const { data: createdMessage, error: createMessageError } = await supabaseAdmin
      .from('customer_messages')
      .insert({
        order_id: matchedOrder?.id || null,
        customer_phone: session.phoneNumber,
        customer_name: session.name || null,
        customer_email: session.email || null,
        subject: `Henvendelse om ordre ${orderNumber}`,
        message: trimmedMessage,
        message_type: 'support',
        status: 'open',
        priority: 'normal',
      })
      .select('id')
      .single();

    if (createMessageError) {
      console.error('Failed to store customer message thread:', createMessageError);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2C1810; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
            .order-details { background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .message-box { background-color: white; padding: 15px; border-radius: 5px; border-left: 4px solid #2C1810; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Kundehenvendelse</h1>
              <p style="margin: 5px 0 0 0;">Ordre ${orderNumber}</p>
            </div>
            <div class="content">
              <h2>Kunde: ${session.name}</h2>
              <p>
                <strong>E-post:</strong> ${session.email}<br>
                <strong>Telefon:</strong> ${session.phoneNumber}
              </p>

              <div class="order-details">
                <h3>Ordredetaljer:</h3>
                <p style="white-space: pre-wrap;">${orderDetails}</p>
              </div>

              <div class="message-box">
                <h3>Melding fra kunde:</h3>
                <p style="white-space: pre-wrap;">${trimmedMessage}</p>
              </div>

              <p style="margin-top: 20px;">
                <strong>Svar kunden på:</strong> ${session.email}
              </p>
            </div>
            <div class="footer">
              <p>Tinglum Gård - Administrasjonspanel</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to: 'post@tinglum.no',
      subject: `Kundehenvendelse - Ordre ${orderNumber}`,
      html: emailHtml,
    });

    if (session.email) {
      const customerEmailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2C1810; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
              .message-box { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Melding mottatt</h1>
              </div>
              <div class="content">
                <p>Hei ${session.name},</p>
                <p>Vi har mottatt din henvendelse angående ordre <strong>${orderNumber}</strong>.</p>

                <div class="message-box">
                  <h3>Din melding:</h3>
                  <p style="white-space: pre-wrap;">${trimmedMessage}</p>
                </div>

                <p>Vi kontakter deg snart på ${session.email} eller ${session.phoneNumber}.</p>

                <p style="margin-top: 30px;">
                  Med vennlig hilsen,<br>
                  <strong>Tinglum Gård</strong>
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      await sendEmail({
        to: session.email,
        subject: `Bekreftelse: Din henvendelse om ordre ${orderNumber}`,
        html: customerEmailHtml,
      });
    }

    return NextResponse.json({
      success: true,
      messageId: createdMessage.id,
    });
  } catch (error) {
    console.error('Error sending contact message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
