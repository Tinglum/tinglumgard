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
        return await cancelEggOrder(orderId, data?.reason);
      case 'issue_refund':
        return await issueEggRefund(orderId, data?.reason);
      case 'get_refund_history':
        return await getEggRefundHistory(orderId);
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    logError('admin-egg-refunds-main', error);
    return NextResponse.json({ error: 'Refund operation failed' }, { status: 500 });
  }
}

async function releaseInventory(inventoryId: string, quantity: number) {
  const { data: inventory, error: inventoryError } = await supabaseAdmin
    .from('egg_inventory')
    .select('eggs_allocated, eggs_available, status')
    .eq('id', inventoryId)
    .single();

  if (inventoryError || !inventory) {
    logError('admin-egg-refunds-inventory-fetch', inventoryError);
    return;
  }

  const nextAllocated = Math.max(0, (inventory.eggs_allocated || 0) - quantity);
  const remainingAfter = inventory.eggs_available - nextAllocated;
  let nextStatus = inventory.status;

  if (remainingAfter <= 0) {
    nextStatus = 'sold_out';
  } else if (inventory.status === 'sold_out') {
    nextStatus = 'open';
  }

  const { error: updateError } = await supabaseAdmin
    .from('egg_inventory')
    .update({ eggs_allocated: nextAllocated, status: nextStatus })
    .eq('id', inventoryId);

  if (updateError) {
    logError('admin-egg-refunds-inventory-update', updateError);
  }
}

async function cancelEggOrder(orderId: string, reason: string | undefined) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, status, customer_name, customer_email, inventory_id, quantity, egg_order_additions(inventory_id, quantity)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status === 'cancelled') {
    return NextResponse.json({ error: 'Order already cancelled' }, { status: 400 });
  }

  // Release base inventory
  await releaseInventory(order.inventory_id, order.quantity);

  // Release addition inventory
  for (const addition of (order.egg_order_additions as any[]) || []) {
    await releaseInventory(addition.inventory_id, addition.quantity);
  }

  const { error: updateError } = await supabaseAdmin
    .from('egg_orders')
    .update({
      status: 'cancelled',
      forfeit_reason: reason || 'Cancelled by admin',
      forfeited_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) {
    logError('admin-egg-refunds-cancel', updateError);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Egg order cancelled and inventory released',
  });
}

async function issueEggRefund(orderId: string, reason: string | undefined) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, customer_name, customer_email, egg_payments(*)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const completedPayments = (order.egg_payments as any[])?.filter(
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
      reason || `Refund for egg order ${order.order_number}`
    );

    if (!refundResult.success) {
      logError(
        'admin-egg-refunds-vipps',
        new Error(`Vipps refund failed for payment ${payment.id}: ${refundResult.error}`)
      );
      return NextResponse.json({ error: refundResult.error || 'Vipps refund failed' }, { status: 500 });
    }

    const { error: markError } = await supabaseAdmin
      .from('egg_payments')
      .update({ status: 'refunded' })
      .eq('id', payment.id);

    if (markError) {
      logError('admin-egg-refunds-mark-payment', markError);
    }

    refundedPaymentIds.push(payment.id);
    totalRefundedNok += payment.amount_nok || 0;
  }

  if (order.customer_email) {
    try {
      const rendered = await renderManagedTemplate({
        templateKey: 'egg.order.refunded.customer',
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
          sourcePath: '/api/admin/eggs/refunds',
          eggOrderId: orderId,
        });
      }
    } catch (emailError) {
      logError('admin-egg-refunds-email', emailError);
    }
  }

  return NextResponse.json({
    success: true,
    refunded_payments: refundedPaymentIds.length,
    total_refunded_nok: totalRefundedNok,
    message: 'Refund issued successfully',
  });
}

async function getEggRefundHistory(orderId: string) {
  const { data: payments, error } = await supabaseAdmin
    .from('egg_payments')
    .select('*')
    .eq('egg_order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) {
    logError('admin-egg-refunds-history', error);
    return NextResponse.json({ payments: [] });
  }

  return NextResponse.json({ payments: payments || [] });
}
