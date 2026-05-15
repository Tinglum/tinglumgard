import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
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

  const rendered = await renderManagedTemplate({
    templateKey: 'pig.pickup.choose_day',
    locale: 'no',
    variables: {
      customer_name: order.customer_name || 'Kunde',
      order_number: order.order_number,
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
    orderId: order.id,
    classification: 'transactional',
    templateKey: 'pig.pickup.choose_day',
    sourcePath: '/api/admin/orders/[id]/send-pickup-email',
    flowKey: 'pig.pickup.choose_day',
    metadata: { manual_send: true },
    sendImmediately: true,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ success: true, to: order.customer_email, orderNumber: order.order_number });
}
