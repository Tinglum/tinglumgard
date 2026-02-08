import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vippsClient } from '@/lib/vipps/api-client'

const allowedPaymentStates = new Set(['AUTHORIZED', 'CAPTURED'])

async function reconcileEggOrder(order: any) {
  const depositPayment = (order.egg_payments || []).find(
    (payment: any) => payment.payment_type === 'deposit'
  )

  if (!depositPayment || depositPayment.status !== 'pending') {
    return order
  }

  const vippsId = depositPayment.vipps_order_id
  if (!vippsId) {
    return order
  }

  try {
    const session = await vippsClient.getCheckoutSession(vippsId)
    const sessionState = session?.sessionState as string | undefined
    const paymentState = session?.paymentDetails?.state as string | undefined

    if (sessionState !== 'PaymentSuccessful' || !allowedPaymentStates.has(paymentState || '')) {
      return order
    }

    const paidAt = new Date().toISOString()

    await supabaseAdmin
      .from('egg_payments')
      .update({ status: 'completed', paid_at: paidAt, webhook_processed_at: paidAt })
      .eq('id', depositPayment.id)

    await supabaseAdmin
      .from('egg_orders')
      .update({ status: 'deposit_paid' })
      .eq('id', order.id)

    return {
      ...order,
      status: 'deposit_paid',
      egg_payments: (order.egg_payments || []).map((payment: any) =>
        payment.id === depositPayment.id
          ? { ...payment, status: 'completed', paid_at: paidAt }
          : payment
      ),
    }
  } catch (error) {
    console.error('Failed to reconcile egg order payment:', error)
    return order
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select('*, egg_breeds(*), egg_payments(*), egg_order_additions(*)')
    .eq('id', params.id)
    .maybeSingle()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const reconciledOrder = await reconcileEggOrder(order)

  if (session.isAdmin) {
    return NextResponse.json(reconciledOrder)
  }

  const matchesUserId = session.userId && order.user_id === session.userId
  const matchesEmail = session.email && order.customer_email === session.email
  const matchesPhone = session.phoneNumber && order.customer_phone === session.phoneNumber

  if (!matchesUserId && !matchesEmail && !matchesPhone) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json(reconciledOrder)
}
