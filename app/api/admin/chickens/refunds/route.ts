import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { initiateVippsRefund } from '@/lib/vipps/refund';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, orderId, data } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    switch (action) {
      case 'cancel_order':
        return await cancelChickenOrder(orderId, data?.reason);
      case 'issue_refund':
        return await issueChickenRefund(orderId, data?.reason);
      case 'get_refund_history':
        return await getChickenRefundHistory(orderId);
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    logError('admin-chicken-refunds-main', error);
    return NextResponse.json({ error: 'Refund operation failed' }, { status: 500 });
  }
}

async function cancelChickenOrder(orderId: string, reason: string | undefined) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('chicken_orders')
    .select('id, order_number, status, customer_name, customer_email, hatch_id, quantity_hens, quantity_roosters, chicken_order_additions(hatch_id, quantity_hens, quantity_roosters)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status === 'cancelled') {
    return NextResponse.json({ error: 'Order already cancelled' }, { status: 400 });
  }

  // Release main hatch inventory — fetch current available_hens then increment
  if (order.hatch_id && (order.quantity_hens || 0) > 0) {
    const { data: hatch, error: hatchError } = await supabaseAdmin
      .from('chicken_hatches')
      .select('available_hens')
      .eq('id', order.hatch_id)
      .single();

    if (!hatchError && hatch) {
      await supabaseAdmin
        .from('chicken_hatches')
        .update({ available_hens: (hatch.available_hens || 0) + (order.quantity_hens || 0) })
        .eq('id', order.hatch_id);
    }
  }

  // Release addition inventory
  for (const addition of (order.chicken_order_additions as any[]) || []) {
    if (!addition.hatch_id || !(addition.quantity_hens > 0)) continue;
    const { data: addHatch } = await supabaseAdmin
      .from('chicken_hatches')
      .select('available_hens')
      .eq('id', addition.hatch_id)
      .single();

    if (addHatch) {
      await supabaseAdmin
        .from('chicken_hatches')
        .update({ available_hens: (addHatch.available_hens || 0) + (addition.quantity_hens || 0) })
        .eq('id', addition.hatch_id);
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('chicken_orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId);

  if (updateError) {
    logError('admin-chicken-refunds-cancel', updateError);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Chicken order cancelled and hatch inventory released',
  });
}

async function issueChickenRefund(orderId: string, reason: string | undefined) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('chicken_orders')
    .select('id, order_number, customer_name, customer_email, chicken_payments(*)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const completedPayments = (order.chicken_payments as any[])?.filter(
    (p: any) => p.status === 'completed' && p.vipps_order_id
  ) || [];

  if (completedPayments.length === 0) {
    return NextResponse.json({ error: 'No completed Vipps payment found for this order' }, { status: 400 });
  }

  const refundedPaymentIds: string[] = [];
  let totalRefundedNok = 0;

  for (const payment of completedPayments) {
    const refundResult = await initiateVippsRefund(
      payment.vipps_order_id,
      payment.amount_nok,
      reason || `Refund for chicken order ${order.order_number}`
    );

    if (!refundResult.success) {
      logError(
        'admin-chicken-refunds-vipps',
        new Error(`Vipps refund failed for payment ${payment.id}: ${refundResult.error}`)
      );
      return NextResponse.json({ error: refundResult.error || 'Vipps refund failed' }, { status: 500 });
    }

    const { error: markError } = await supabaseAdmin
      .from('chicken_payments')
      .update({ status: 'refunded' })
      .eq('id', payment.id);

    if (markError) {
      logError('admin-chicken-refunds-mark-payment', markError);
    }

    refundedPaymentIds.push(payment.id);
    totalRefundedNok += payment.amount_nok || 0;
  }

  if (order.customer_email) {
    try {
      const rendered = await renderManagedTemplate({
        templateKey: 'chicken.order.refunded.customer',
        locale: 'no',
        variables: {
          customer_name: order.customer_name || 'Kunde',
          order_number: order.order_number,
          refund_amount_nok: `kr ${totalRefundedNok.toLocaleString('nb-NO')}`,
          refund_reason: reason || '',
        },
      });

      if (rendered) {
        await dispatchEmail({
          to: order.customer_email,
          subject: rendered.subject,
          html: rendered.html,
          classification: 'transactional',
          templateKey: rendered.templateKey,
          sourcePath: '/api/admin/chickens/refunds',
          chickenOrderId: orderId,
        });
      }
    } catch (emailError) {
      logError('admin-chicken-refunds-email', emailError);
    }
  }

  return NextResponse.json({
    success: true,
    refunded_payments: refundedPaymentIds.length,
    total_refunded_nok: totalRefundedNok,
    message: 'Refund issued successfully',
  });
}

async function getChickenRefundHistory(orderId: string) {
  const { data: payments, error } = await supabaseAdmin
    .from('chicken_payments')
    .select('*')
    .eq('chicken_order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) {
    logError('admin-chicken-refunds-history', error);
    return NextResponse.json({ payments: [] });
  }

  return NextResponse.json({ payments: payments || [] });
}
