import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { sendViaMailgun } from '@/lib/email/provider-mailgun';

/** POST: Send payment request email to customer for a deferred order */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { orderId, productType, customerName, customerEmail, orderNumber } = body;

  if (!orderId || !productType || !customerEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no';

  // Build the payment link based on product type
  let paymentLink: string;
  if (productType === 'eggs') {
    paymentLink = `${appUrl}/rugeegg/mine-bestillinger/${orderId}/betaling`;
  } else if (productType === 'chickens') {
    paymentLink = `${appUrl}/min-side/kylling/${orderId}/betaling`;
  } else {
    paymentLink = `${appUrl}/min-side/ordre/${orderId}/betaling`;
  }

  const result = await sendViaMailgun({
    to: customerEmail,
    subject: `Betal depositum for din bestilling ${orderNumber} – Tinglum Gård`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #171717;">Hei ${customerName || ''}!</h2>
        <p>Da du la inn bestilling <strong>${orderNumber}</strong> hos Tinglum Gård, var betalingstjenesten midlertidig nede. Bestillingen din er registrert og reservert.</p>
        <p>Nå er betalingen oppe igjen, og du kan betale depositum ved å klikke knappen under:</p>
        <p style="margin: 24px 0;">
          <a href="${paymentLink}" style="display: inline-block; background: #171717; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500;">Betal depositum nå</a>
        </p>
        <p style="color: #666; font-size: 14px;">Hvis du har spørsmål, svar på denne e-posten.</p>
        <p style="color: #999; font-size: 12px;">Tinglum Gård</p>
      </div>
    `,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ success: true, emailId: result.id });
}
