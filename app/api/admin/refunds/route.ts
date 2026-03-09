import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { initiateVippsRefund } from '@/lib/vipps/refund';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, orderId, data } = body;

    switch (action) {
      case 'cancel_order':
        return await cancelOrder(orderId, data.reason, data.restoreInventory);
      case 'delete_order':
        return await deleteOrder(orderId, data.processVippsRefund);
      case 'issue_refund':
        return await issueRefund(orderId, data.amount, data.type, data.reason);
      case 'get_refund_history':
        return await getRefundHistory(orderId);
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    logError('admin-refunds-main', error);
    return NextResponse.json({ error: 'Refund operation failed' }, { status: 500 });
  }
}

async function cancelOrder(orderId: string, reason: string, restoreInventory: boolean) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError) throw orderError;

  if (order.status === 'cancelled') {
    return NextResponse.json({ error: 'Order already cancelled' }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) throw updateError;

  if (restoreInventory) {
    const { data: config } = await supabaseAdmin
      .from('config')
      .select('value')
      .eq('key', 'max_kg_available')
      .single();

    if (config) {
      const currentMaxKg = parseInt(config.value, 10);
      const newMaxKg = currentMaxKg + order.box_size;
      await supabaseAdmin
        .from('config')
        .update({ value: newMaxKg.toString() })
        .eq('key', 'max_kg_available');
    }
  }

  await supabaseAdmin.from('order_history').insert({
    order_id: orderId,
    action: 'cancelled',
    details: { reason, inventory_restored: restoreInventory },
    created_at: new Date().toISOString(),
  });

  if (order.customer_email && order.customer_email !== 'pending@vipps.no') {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no';
      const rendered = await renderManagedTemplate({
        templateKey: 'pig.order.cancelled',
        locale: 'no',
        variables: {
          customer_name: order.customer_name || 'Kunde',
          order_number: order.order_number,
          cancel_reason: reason ? `Arsak: ${reason}` : '',
          refund_text:
            'Dersom du har betalt forskudd eller restbelop, vil refundering bli behandlet innen 5-7 virkedager.',
          order_url: `${appUrl}/min-side?orderId=${order.id}`,
        },
      });

      if (rendered) {
        await dispatchEmail({
          to: order.customer_email,
          subject: rendered.subject,
          html: rendered.html,
          classification: 'transactional',
          templateKey: rendered.templateKey,
          sourcePath: '/api/admin/refunds',
          orderId,
        });
      }
    } catch (emailError) {
      logError('admin-refunds-cancellation-email', emailError);
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Order cancelled successfully',
    inventory_restored: restoreInventory,
  });
}

async function deleteOrder(orderId: string, processVippsRefund: boolean) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      payments (*)
    `)
    .eq('id', orderId)
    .single();

  if (orderError) throw orderError;

  const completedPayments = order.payments?.filter((p: any) => p.status === 'completed') || [];
  const totalPaid = completedPayments.reduce((sum: number, p: any) => sum + p.amount_nok, 0);

  if (processVippsRefund && totalPaid > 0) {
    for (const payment of completedPayments) {
      if (payment.vipps_order_id) {
        const refundResult = await initiateVippsRefund(
          payment.vipps_order_id,
          payment.amount_nok,
          `Refund for deleted order ${order.order_number}`
        );

        if (!refundResult.success) {
          logError(
            'admin-refunds-vipps-refund',
            new Error(`Vipps refund failed for payment ${payment.id}: ${refundResult.error}`)
          );
        }
      }
    }
  }

  const { data: config } = await supabaseAdmin
    .from('config')
    .select('value')
    .eq('key', 'max_kg_available')
    .single();

  if (config) {
    const currentMaxKg = parseInt(config.value, 10);
    const newMaxKg = currentMaxKg + order.box_size;
    await supabaseAdmin
      .from('config')
      .update({ value: newMaxKg.toString() })
      .eq('key', 'max_kg_available');
  }

  await supabaseAdmin.from('payments').delete().eq('order_id', orderId);
  await supabaseAdmin.from('order_extras').delete().eq('order_id', orderId);
  await supabaseAdmin.from('order_history').delete().eq('order_id', orderId);

  const { error: deleteError } = await supabaseAdmin
    .from('orders')
    .delete()
    .eq('id', orderId);

  if (deleteError) throw deleteError;

  return NextResponse.json({
    success: true,
    message: 'Order deleted successfully',
    vipps_refund_attempted: processVippsRefund && totalPaid > 0,
    refund_amount: totalPaid,
  });
}

async function issueRefund(
  orderId: string,
  amount: number,
  type: 'full' | 'partial' | 'deposit' | 'remainder',
  reason: string
) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      payments (*)
    `)
    .eq('id', orderId)
    .single();

  if (orderError) throw orderError;

  let refundAmount = amount;
  if (type === 'full') {
    const completedPayments = order.payments?.filter((p: any) => p.status === 'completed') || [];
    refundAmount = completedPayments.reduce((sum: number, p: any) => sum + p.amount_nok, 0);
  } else if (type === 'deposit') {
    const depositPayment = order.payments?.find(
      (p: any) => p.payment_type === 'deposit' && p.status === 'completed'
    );
    refundAmount = depositPayment?.amount_nok || 0;
  } else if (type === 'remainder') {
    const remainderPayment = order.payments?.find(
      (p: any) => p.payment_type === 'remainder' && p.status === 'completed'
    );
    refundAmount = remainderPayment?.amount_nok || 0;
  }

  const { error: refundError } = await supabaseAdmin.from('refunds').insert({
    order_id: orderId,
    amount: refundAmount,
    type,
    reason,
    status: 'pending',
    requested_at: new Date().toISOString(),
  });

  if (refundError) throw refundError;

  await supabaseAdmin.from('order_history').insert({
    order_id: orderId,
    action: 'refund_requested',
    details: { amount: refundAmount, type, reason },
    created_at: new Date().toISOString(),
  });

  if (order.customer_email && order.customer_email !== 'pending@vipps.no') {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no';
      const refundTypeLabel =
        type === 'full'
          ? 'Full refundering'
          : type === 'deposit'
            ? 'Forskudd'
            : type === 'remainder'
              ? 'Restbelop'
              : 'Delvis refundering';

      const rendered = await renderManagedTemplate({
        templateKey: 'pig.order.refund.requested',
        locale: 'no',
        variables: {
          customer_name: order.customer_name || 'Kunde',
          order_number: order.order_number,
          refund_amount_nok: `kr ${refundAmount.toLocaleString('nb-NO')}`,
          refund_type_label: refundTypeLabel,
          order_url: `${appUrl}/min-side?orderId=${order.id}`,
        },
      });

      if (rendered) {
        await dispatchEmail({
          to: order.customer_email,
          subject: rendered.subject,
          html: rendered.html,
          classification: 'transactional',
          templateKey: rendered.templateKey,
          sourcePath: '/api/admin/refunds',
          orderId,
        });
      }
    } catch (emailError) {
      logError('admin-refunds-refund-email', emailError);
    }
  }

  return NextResponse.json({
    success: true,
    refund_amount: refundAmount,
    message: 'Refund request created successfully',
  });
}

async function getRefundHistory(orderId: string) {
  const { data: refunds, error } = await supabaseAdmin
    .from('refunds')
    .select('*')
    .eq('order_id', orderId)
    .order('requested_at', { ascending: false });

  if (error) {
    logError('admin-refunds-history', error);
    return NextResponse.json({ refunds: [] });
  }

  return NextResponse.json({ refunds: refunds || [] });
}
