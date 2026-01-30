import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { sendEmail } from '@/lib/email/client';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { orderNumber, orderDetails, message } = await request.json();

    if (!message || !orderNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Send email to admin
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
                <p style="white-space: pre-wrap;">${message}</p>
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
      to: 'post@tinglum.no', // Admin email
      subject: `Kundehenvendelse - Ordre ${orderNumber}`,
      html: emailHtml,
    });

    // Also send confirmation to customer
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
                <p style="white-space: pre-wrap;">${message}</p>
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending contact message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
