import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/client';
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
    return NextResponse.json(
      { error: 'Refund operation failed' },
      { status: 500 }
    );
  }
}

async function cancelOrder(orderId: string, reason: string, restoreInventory: boolean) {
  // Fetch order details
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError) throw orderError;

  if (order.status === 'cancelled') {
    return NextResponse.json({ error: 'Order already cancelled' }, { status: 400 });
  }

  // Update order status
  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) throw updateError;

  // Restore inventory if requested
  if (restoreInventory) {
    const { data: config } = await supabaseAdmin
      .from('config')
      .select('value')
      .eq('key', 'max_kg_available')
      .single();

    if (config) {
      const currentMaxKg = parseInt(config.value);
      const newMaxKg = currentMaxKg + order.box_size;

      await supabaseAdmin
        .from('config')
        .update({ value: newMaxKg.toString() })
        .eq('key', 'max_kg_available');
    }
  }

  // Log cancellation
  await supabaseAdmin.from('order_history').insert({
    order_id: orderId,
    action: 'cancelled',
    details: { reason, inventory_restored: restoreInventory },
    created_at: new Date().toISOString(),
  });

  // Send cancellation email
  if (order.customer_email && order.customer_email !== 'pending@vipps.no') {
    try {
      await sendEmail({
        to: order.customer_email,
        subject: `Ordre ${order.order_number} kansellert`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C1810; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Tinglum Gård</h1></div>
    <div class="content">
      <h2>Ordre kansellert</h2>
      <p>Hei ${order.customer_name},</p>
      <p>Din ordre <strong>${order.order_number}</strong> har blitt kansellert.</p>
      ${reason ? `<p><strong>Årsak:</strong> ${reason}</p>` : ''}
      <p>Dersom du har betalt forskudd eller restbeløp, vil refundering bli behandlet innen 5-7 virkedager.</p>
      <p>Ta kontakt med oss hvis du har spørsmål.</p>
      <p>Vennlig hilsen,<br>Tinglum Gård</p>
    </div>
  </div>
</body>
</html>
        `,
      });
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
  // Fetch order with payments
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      payments (*)
    `)
    .eq('id', orderId)
    .single();

  if (orderError) throw orderError;

  // Process Vipps refund if requested and there are completed payments
  const completedPayments = order.payments?.filter((p: any) => p.status === 'completed') || [];
  const totalPaid = completedPayments.reduce((sum: number, p: any) => sum + p.amount_nok, 0);

  if (processVippsRefund && totalPaid > 0) {
    // Attempt Vipps refund for each completed payment
    for (const payment of completedPayments) {
      if (payment.vipps_order_id) {
        const refundResult = await initiateVippsRefund(
          payment.vipps_order_id,
          payment.amount_nok,
          `Refund for deleted order ${order.order_number}`
        );

        if (!refundResult.success) {
          // Log but don't fail - admin can process manually
          logError('admin-refunds-vipps-refund', new Error(`Vipps refund failed for payment ${payment.id}: ${refundResult.error}`));
        }
      }
    }
  }

  // Restore inventory
  const { data: config } = await supabaseAdmin
    .from('config')
    .select('value')
    .eq('key', 'max_kg_available')
    .single();

  if (config) {
    const currentMaxKg = parseInt(config.value);
    const newMaxKg = currentMaxKg + order.box_size;

    await supabaseAdmin
      .from('config')
      .update({ value: newMaxKg.toString() })
      .eq('key', 'max_kg_available');
  }

  // Delete related records (cascade delete should handle most, but be explicit)
  await supabaseAdmin.from('payments').delete().eq('order_id', orderId);
  await supabaseAdmin.from('order_extras').delete().eq('order_id', orderId);
  await supabaseAdmin.from('order_history').delete().eq('order_id', orderId);

  // Delete the order
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

async function issueRefund(orderId: string, amount: number, type: 'full' | 'partial' | 'deposit' | 'remainder', reason: string) {
  // Fetch order and payment details
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      payments (*)
    `)
    .eq('id', orderId)
    .single();

  if (orderError) throw orderError;

  // Calculate refund amount
  let refundAmount = amount;
  if (type === 'full') {
    const completedPayments = order.payments?.filter((p: any) => p.status === 'completed') || [];
    refundAmount = completedPayments.reduce((sum: number, p: any) => sum + p.amount_nok, 0);
  } else if (type === 'deposit') {
    const depositPayment = order.payments?.find((p: any) => p.payment_type === 'deposit' && p.status === 'completed');
    refundAmount = depositPayment?.amount_nok || 0;
  } else if (type === 'remainder') {
    const remainderPayment = order.payments?.find((p: any) => p.payment_type === 'remainder' && p.status === 'completed');
    refundAmount = remainderPayment?.amount_nok || 0;
  }

  // Record refund
  const { error: refundError } = await supabaseAdmin.from('refunds').insert({
    order_id: orderId,
    amount: refundAmount,
    type,
    reason,
    status: 'pending',
    requested_at: new Date().toISOString(),
  });

  if (refundError) throw refundError;

  // Log refund request
  await supabaseAdmin.from('order_history').insert({
    order_id: orderId,
    action: 'refund_requested',
    details: { amount: refundAmount, type, reason },
    created_at: new Date().toISOString(),
  });

  // Send refund notification email
  if (order.customer_email && order.customer_email !== 'pending@vipps.no') {
    try {
      await sendEmail({
        to: order.customer_email,
        subject: `Refundering for ordre ${order.order_number}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C1810; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Tinglum Gård</h1></div>
    <div class="content">
      <h2>Refundering behandles</h2>
      <p>Hei ${order.customer_name},</p>
      <p>Vi har mottatt din refunderingsforespørsel for ordre <strong>${order.order_number}</strong>.</p>
      <p><strong>Beløp:</strong> kr ${refundAmount.toLocaleString('nb-NO')}</p>
      <p><strong>Type:</strong> ${type === 'full' ? 'Full refundering' : type === 'deposit' ? 'Forskudd' : type === 'remainder' ? 'Restbeløp' : 'Delvis refundering'}</p>
      <p>Refunderingen vil bli behandlet innen 5-7 virkedager og vil bli kreditert til samme betalingsmetode som ble brukt ved kjøp.</p>
      <p>Vennlig hilsen,<br>Tinglum Gård</p>
    </div>
  </div>
</body>
</html>
        `,
      });
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
