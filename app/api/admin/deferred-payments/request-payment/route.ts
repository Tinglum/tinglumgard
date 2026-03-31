import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { sendViaMailgun } from '@/lib/email/provider-mailgun';
import { supabaseAdmin } from '@/lib/supabase/server';

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

  // Link to min-side with deep-link to the specific order card (where deposit button is)
  const orderParam = productType === 'eggs' ? 'eggOrderId' : productType === 'chickens' ? 'chickenOrderId' : 'orderId';
  const paymentLink = `${appUrl}/min-side?${orderParam}=${orderId}`;

  const subject = `Betal depositum for din bestilling ${orderNumber} – Tinglum Gård`;
  const html = `
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
  `;

  const result = await sendViaMailgun({ to: customerEmail, subject, html });

  if (!result.success) {
    console.error('Deferred payment email failed:', { error: result.error, to: customerEmail, orderId });
    return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
  }

  // Log in email_dispatch_queue so it shows in email history
  const nowIso = new Date().toISOString();
  const orderIdField = productType === 'eggs' ? 'egg_order_id' : productType === 'chickens' ? 'chicken_order_id' : 'order_id';
  await supabaseAdmin.from('email_dispatch_queue').insert({
    idempotency_key: `email:admin:deferred-deposit:${orderId}:${Date.now()}`,
    classification: 'transactional',
    priority: 80,
    status: 'sent',
    to_email: customerEmail.trim().toLowerCase(),
    locale: 'no',
    template_key: 'deferred_deposit_request',
    subject,
    html,
    metadata: { order_number: orderNumber, product_type: productType },
    source_path: '/api/admin/deferred-payments/request-payment',
    [orderIdField]: orderId,
    attempts: 1,
    max_attempts: 1,
    sent_at: nowIso,
    provider_message_id: result.id || null,
  }).then(({ error }) => {
    if (error) console.error('Failed to log deferred payment email:', error);
  });

  return NextResponse.json({ success: true, emailId: result.id });
}
