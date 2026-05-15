import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

function toInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function hasCompletedDeposit(payments: any[] = []): boolean {
  return payments.some((p) => p?.payment_type === 'deposit' && p?.status === 'completed');
}

function getCompletedRemainderPaidNok(payments: any[] = []): number {
  return payments.reduce((sum, p) => {
    if (p?.payment_type !== 'remainder' || p?.status !== 'completed') return sum;
    return sum + toInt(p?.amount_nok);
  }, 0);
}

function getNextStatus(order: any, remainderAmountNok: number, remainderPaidNok: number): string {
  const currentStatus = String(order?.status || '');
  if (currentStatus === 'cancelled' || currentStatus === 'picked_up') return currentStatus;

  const outstandingRemainder = Math.max(0, remainderAmountNok - remainderPaidNok);
  const preserveReadyForPickup = currentStatus === 'ready_for_pickup';

  if (outstandingRemainder > 0) {
    if (preserveReadyForPickup) return 'ready_for_pickup';
    return hasCompletedDeposit(order?.chicken_payments || []) ? 'deposit_paid' : currentStatus || 'pending';
  }

  if (preserveReadyForPickup) return 'ready_for_pickup';
  return hasCompletedDeposit(order?.chicken_payments || []) ? 'fully_paid' : currentStatus || 'pending';
}

async function loadOrder(orderId: string) {
  return supabaseAdmin
    .from('chicken_orders')
    .select(
      '*, chicken_breeds(*), chicken_hatches(*), chicken_payments(*), chicken_order_additions(*, chicken_breeds(*), chicken_hatches(*))'
    )
    .eq('id', orderId)
    .maybeSingle();
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
    const { data: order, error: orderError } = await loadOrder(params.id);

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Compute base subtotal from quantities x prices
    const baseSubtotal =
      Math.max(0, toInt(order.quantity_hens)) * Math.max(0, Number(order.price_per_hen_nok || 0)) +
      Math.max(0, toInt(order.quantity_roosters)) * Math.max(0, Number(order.price_per_rooster_nok || 0));

    const additionsSubtotal = ((order.chicken_order_additions as Array<any> | null) || []).reduce(
      (sum: number, row: any) => sum + Math.max(0, Number(row?.subtotal_nok || 0)),
      0
    );

    const deliveryFee = Math.max(0, Number(order.delivery_fee_nok || 0));
    const totalAmountNok = Math.max(0, baseSubtotal + additionsSubtotal + deliveryFee);
    const depositAmountNok = Math.max(
      0,
      Math.min(Math.round(Number(order.deposit_amount_nok || 0)), Math.round(totalAmountNok))
    );
    const remainderAmountNok = Math.max(0, Math.round(totalAmountNok - depositAmountNok));
    const remainderPaidNok = getCompletedRemainderPaidNok(order.chicken_payments || []);
    const nextStatus = getNextStatus(order, remainderAmountNok, remainderPaidNok);

    const remainderNowZero = remainderAmountNok <= 0;
    const preservedRemainderEnabled = remainderNowZero
      ? false
      : Boolean(order.remainder_payment_enabled);

    const { error: updateError } = await supabaseAdmin
      .from('chicken_orders')
      .update({
        subtotal_nok: Math.max(0, baseSubtotal),
        total_amount_nok: Math.max(0, totalAmountNok),
        deposit_amount_nok: depositAmountNok,
        remainder_amount_nok: remainderAmountNok,
        remainder_payment_enabled: preservedRemainderEnabled,
        status: nextStatus,
      })
      .eq('id', params.id);

    if (updateError) {
      throw updateError;
    }

    const { data: updatedOrder, error: refetchError } = await loadOrder(params.id);
    if (refetchError || !updatedOrder) {
      return NextResponse.json({ error: 'Order updated but could not be reloaded' }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    logError('admin-chickens-orders-sync-amounts', error);
    return NextResponse.json({ error: 'Failed to sync amounts' }, { status: 500 });
  }
}
