import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendViaMailgun } from '@/lib/email/provider-mailgun';
import { buildCustomerOrderLink } from '@/lib/email/links';

/**
 * POST /api/admin/orders/[id]/send-pickup-email
 * Manually sends a "choose your pickup day" reminder to a pig order customer.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_name, customer_email, delivery_type, box_size')
    .eq('id', params.id)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (!order.customer_email) {
    return NextResponse.json({ error: 'Order has no customer email' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const orderUrl = buildCustomerOrderLink(appUrl, 'pig', String(order.id));
  const firstName = String(order.customer_name || 'Kunde').split(/\s+/)[0];

  const subject = `Velg hentedag – ${order.order_number}`;
  const html = `<!DOCTYPE html>
<html lang="no">
  <head><meta charset="utf-8"><title>Tinglum Gård</title></head>
  <body style="margin:0;padding:0;background:#f4f4f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 0;"><tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:20px 24px;background:#0f172a;color:#ffffff;font-family:Arial,sans-serif;font-size:18px;font-weight:700;">Tinglum Gård</td></tr>
        <tr><td style="padding:24px;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#111827;">
          <p>Hei ${firstName},</p>
          <p>Grisbestilling <strong>${order.order_number}</strong> er klar til henting.</p>
          <p>Ta kontakt eller logg inn på Min side for å velge hentedag og tidspunkt.</p>
          <p><a href="${orderUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;">Velg hentedag</a></p>
          <p style="margin:20px 0 0;">Vennlig hilsen<br><strong>Tinglum Gård</strong></p>
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #e4e4e7;background:#fafafa;font-family:Arial,sans-serif;">
          <p style="margin:0;font-size:13px;color:#52525b;">Svar på denne e-posten, så hjelper vi deg.</p>
        </td></tr>
      </table>
    </td></tr></table>
  </body>
</html>`;

  const result = await sendViaMailgun({ to: order.customer_email, subject, html });

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
  }

  await supabaseAdmin.from('email_dispatch_queue').insert({
    idempotency_key: `email:admin-manual:pig_order:${order.id}:pig.pickup.choose_day:${Date.now()}`,
    classification: 'transactional',
    priority: 70,
    status: 'sent',
    to_email: order.customer_email.trim().toLowerCase(),
    locale: 'no',
    subject,
    html,
    metadata: { flow_key: 'pig.pickup.choose_day', manual_send: true, product_scope: 'pigs' },
    source_path: '/api/admin/orders/[id]/send-pickup-email',
    order_id: order.id,
    attempts: 1,
    max_attempts: 1,
    sent_at: new Date().toISOString(),
    provider_message_id: result.id || null,
  });

  return NextResponse.json({ success: true, to: order.customer_email, orderNumber: order.order_number });
}
