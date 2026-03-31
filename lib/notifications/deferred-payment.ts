import { supabaseAdmin } from '@/lib/supabase/server';
import { sendViaMailgun } from '@/lib/email/provider-mailgun';

interface DeferredPaymentParams {
  orderId: string;
  orderNumber: string;
  productType: 'pork' | 'eggs' | 'chickens';
  customerName: string;
  customerEmail: string;
  depositStatus: number;
}

const productLabels: Record<string, string> = {
  pork: 'Gris',
  eggs: 'Rugeegg',
  chickens: 'Kylling',
};

export async function notifyDeferredPayment(params: DeferredPaymentParams): Promise<void> {
  const { orderId, orderNumber, productType, customerName, customerEmail, depositStatus } = params;

  console.log('Deferred payment notification:', { orderId, orderNumber, productType, customerName });

  // Store in app_notifications table for admin dashboard
  await supabaseAdmin.from('app_notifications').insert({
    type: 'deferred_payment',
    title: `Utsatt betaling: ${orderNumber}`,
    body: `${customerName} (${customerEmail}) bestilte ${productLabels[productType] || productType}, men Vipps-betaling feilet (status ${depositStatus}). Depositum er ikke betalt.`,
    metadata: {
      order_id: orderId,
      order_number: orderNumber,
      product_type: productType,
      customer_name: customerName,
      customer_email: customerEmail,
      deposit_status: depositStatus,
    },
    read: false,
  });

  // Send email to admin
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.EMAIL_FROM || '';
  if (!adminEmail || adminEmail === 'noreply@yourdomain.com') return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no';

  await sendViaMailgun({
    to: adminEmail,
    subject: `⚠️ Utsatt betaling – ${orderNumber} (${productLabels[productType] || productType})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #b45309;">Vipps-betaling feilet — ordre akseptert uten depositum</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #666;">Ordrenummer</td><td style="padding: 8px 0; font-weight: bold;">${orderNumber}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Produkt</td><td style="padding: 8px 0;">${productLabels[productType] || productType}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Kunde</td><td style="padding: 8px 0;">${customerName}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">E-post</td><td style="padding: 8px 0;">${customerEmail}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Feilkode</td><td style="padding: 8px 0;">${depositStatus}</td></tr>
        </table>
        <p>Kunden har fått beskjed om at Vipps er midlertidig utilgjengelig og at dere tar kontakt.</p>
        <p><a href="${appUrl}/admin" style="display: inline-block; background: #171717; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Gå til admin</a></p>
      </div>
    `,
  });
}
