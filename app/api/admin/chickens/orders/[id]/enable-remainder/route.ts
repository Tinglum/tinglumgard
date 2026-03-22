import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'

function isUuid(value?: string | null): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function getCompletedRemainderPaidNok(payments: any[] = []): number {
  return payments.reduce((sum, payment) => {
    if (payment?.payment_type !== 'remainder' || payment?.status !== 'completed') return sum
    return sum + Math.round(Number(payment?.amount_nok || 0))
  }, 0)
}

function hasCompletedDeposit(payments: any[] = []): boolean {
  return payments.some((payment) => payment?.payment_type === 'deposit' && payment?.status === 'completed')
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const lookupColumn = isUuid(params.id) ? 'id' : 'order_number'
  const { data: order, error } = await supabaseAdmin
    .from('chicken_orders')
    .select('id, status, remainder_amount_nok, remainder_collected_at, remainder_payment_enabled, chicken_payments(*)')
    .eq(lookupColumn, params.id)
    .maybeSingle()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status === 'cancelled' || order.status === 'picked_up') {
    return NextResponse.json({ error: 'Remainder payment cannot be enabled for this order state' }, { status: 400 })
  }

  if (order.remainder_collected_at) {
    return NextResponse.json({ error: 'Remainder has already been collected' }, { status: 400 })
  }

  if (!hasCompletedDeposit(order.chicken_payments || [])) {
    return NextResponse.json({ error: 'Deposit must be paid before enabling remainder payment' }, { status: 400 })
  }

  const remainderPaidNok = getCompletedRemainderPaidNok(order.chicken_payments || [])
  const remainderDueNok = Math.max(0, Math.round(Number(order.remainder_amount_nok || 0)) - remainderPaidNok)

  if (remainderDueNok <= 0) {
    return NextResponse.json({ error: 'Remainder is already paid' }, { status: 400 })
  }

  if (order.remainder_payment_enabled === true) {
    return NextResponse.json({
      success: true,
      alreadyEnabled: true,
      remainderDueNok,
    })
  }

  const { error: updateError } = await supabaseAdmin
    .from('chicken_orders')
    .update({ remainder_payment_enabled: true })
    .eq('id', order.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to enable remainder payment' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    remainderPaymentEnabled: true,
    remainderDueNok,
  })
}
