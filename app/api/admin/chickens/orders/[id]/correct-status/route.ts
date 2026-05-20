import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * POST /api/admin/chickens/orders/[id]/correct-status
 *
 * Corrects a "Dataavvik" — where status is fully_paid but remainder is still
 * outstanding. Reverts to deposit_paid and voids phantom remainder payments.
 *
 * Only applies when:
 *   - status is 'fully_paid' or 'completed'
 *   - sum of completed remainder payments < remainder_amount_nok
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('chicken_orders')
    .select('id, order_number, status, remainder_amount_nok, chicken_payments(id, payment_type, status, amount_nok)')
    .eq('id', params.id)
    .maybeSingle()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const payments: Array<{ id: string; payment_type: string; status: string; amount_nok: number }> =
    Array.isArray(order.chicken_payments) ? order.chicken_payments : []

  const remainderDue = Math.max(0, Math.round(Number(order.remainder_amount_nok || 0)))
  const completedRemainder = payments
    .filter((p) => p.payment_type === 'remainder' && p.status === 'completed')
    .reduce((sum, p) => sum + Math.round(Number(p.amount_nok || 0)), 0)

  const hasDataDiscrepancy =
    ['fully_paid', 'completed'].includes(order.status) && completedRemainder < remainderDue

  if (!hasDataDiscrepancy) {
    return NextResponse.json(
      { error: 'No data discrepancy detected — correction not applicable' },
      { status: 400 }
    )
  }

  // Void phantom remainder payment records
  const phantomIds = payments
    .filter((p) => p.payment_type === 'remainder' && p.status === 'completed')
    .map((p) => p.id)

  if (phantomIds.length > 0) {
    const { error: voidError } = await supabaseAdmin
      .from('chicken_payments')
      .update({ status: 'voided' })
      .in('id', phantomIds)

    if (voidError) {
      return NextResponse.json({ error: 'Failed to void phantom payments' }, { status: 500 })
    }
  }

  // Revert status and keep remainder enabled so the customer can still pay
  const { error: updateError } = await supabaseAdmin
    .from('chicken_orders')
    .update({ status: 'deposit_paid', remainder_payment_enabled: true })
    .eq('id', order.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    orderId: order.id,
    orderNumber: order.order_number,
    previousStatus: order.status,
    newStatus: 'deposit_paid',
    voidedPayments: phantomIds.length,
  })
}
