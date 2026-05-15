import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { buildCustomerOrderLink } from '@/lib/email/links';
import { APP_BASE_URL } from '@/lib/constants/app';

/**
 * POST /api/admin/chickens/orders/[id]/send-pickup-email
 * Manually sends a "choose your pickup day" reminder to the customer.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const locale: 'no' | 'en' = body?.locale === 'en' ? 'en' : 'no';

  const { data: order, error: orderError } = await supabaseAdmin
    .from('chicken_orders')
    .select('id, order_number, customer_name, customer_email, delivery_method, pickup_week, pickup_monday, status')
    .eq('id', params.id)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status === 'cancelled') {
    return NextResponse.json({ error: 'Cannot send pickup email for cancelled order' }, { status: 400 });
  }

  if (!order.customer_email) {
    return NextResponse.json({ error: 'Order has no customer email' }, { status: 400 });
  }

  const orderUrl = buildCustomerOrderLink(APP_BASE_URL, 'chicken', String(order.id));

  const rendered = await renderManagedTemplate({
    templateKey: 'chicken.choose_pickup_day',
    locale,
    variables: {
      customer_name: order.customer_name || 'Kunde',
      order_number: order.order_number,
      pickup_week: order.pickup_week ? String(order.pickup_week) : '',
      order_url: orderUrl,
    },
  });

  if (!rendered) {
    return NextResponse.json({ error: 'Email template not found' }, { status: 500 });
  }

  const result = await dispatchEmail({
    to: order.customer_email,
    subject: rendered.subject,
    html: rendered.html,
    chickenOrderId: order.id,
    classification: 'transactional',
    templateKey: 'chicken.choose_pickup_day',
    locale,
    sourcePath: '/api/admin/chickens/orders/[id]/send-pickup-email',
    flowKey: 'chicken.choose_pickup_day',
    metadata: { manual_send: true },
    sendImmediately: true,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ success: true, to: order.customer_email, orderNumber: order.order_number });
}
