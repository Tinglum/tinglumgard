import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

const MANUAL_STATUS_LOCK = new Set(['preparing', 'shipped', 'delivered', 'cancelled', 'forfeited']);

function deriveStatusFromPayments(
  currentStatus: string,
  payments: Array<{ payment_type: string; status: string; amount_nok: number }>,
  remainderTargetOre: number
): string {
  if (MANUAL_STATUS_LOCK.has(currentStatus)) {
    return currentStatus;
  }

  const hasDepositCompleted = payments.some(
    (p) => p.payment_type === 'deposit' && p.status === 'completed'
  );

  if (!hasDepositCompleted) {
    return 'pending';
  }

  const remainderPaidOre = payments.reduce((sum, p) => {
    if (p.payment_type !== 'remainder' || p.status !== 'completed') return sum;
    return sum + (p.amount_nok || 0) * 100;
  }, 0);

  if (remainderTargetOre <= 0 || remainderPaidOre >= remainderTargetOre) {
    return 'fully_paid';
  }

  return 'deposit_paid';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Load egg order with additions and payments
    const { data: order, error: orderError } = await supabaseAdmin
      .from('egg_orders')
      .select(
        'id, order_number, status, quantity, price_per_egg, delivery_fee, deposit_amount, total_amount, remainder_amount, egg_payments(payment_type, status, amount_nok), egg_order_additions(subtotal)'
      )
      .eq('id', params.id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Recalculate
    const subtotal = Math.round(Number(order.quantity || 0) * Number(order.price_per_egg || 0));
    const additionsSubtotal = ((order.egg_order_additions as Array<{ subtotal: number }> | null) || [])
      .reduce((sum, row) => sum + Math.max(0, Number(row.subtotal || 0)), 0);
    const deliveryFee = Math.max(0, Math.round(Number(order.delivery_fee || 0)));
    const totalAmount = subtotal + additionsSubtotal + deliveryFee;
    const depositAmount = Math.max(
      0,
      Math.min(Math.round(Number(order.deposit_amount || 0)), totalAmount)
    );
    const remainderAmount = Math.max(0, totalAmount - depositAmount);

    const payments: Array<{ payment_type: string; status: string; amount_nok: number }> =
      Array.isArray(order.egg_payments) ? (order.egg_payments as any[]) : [];

    const nextStatus = deriveStatusFromPayments(
      String(order.status || ''),
      payments,
      remainderAmount
    );

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('egg_orders')
      .update({
        subtotal,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        remainder_amount: remainderAmount,
        status: nextStatus,
      })
      .eq('id', params.id)
      .select(
        '*, egg_breeds(*), egg_inventory(*), egg_payments(*), egg_order_additions(*, egg_breeds(*), egg_inventory(*))'
      )
      .maybeSingle();

    if (updateError || !updatedOrder) {
      return NextResponse.json({ error: 'Failed to sync amounts' }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    logError('admin-eggs-orders-sync-amounts', error);
    return NextResponse.json({ error: 'Failed to sync amounts' }, { status: 500 });
  }
}
