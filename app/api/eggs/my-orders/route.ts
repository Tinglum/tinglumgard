import { NextResponse } from 'next/server'
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

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const queries = []
    if (session.userId) {
      queries.push(
        supabaseAdmin
          .from('egg_orders')
          .select('*, egg_breeds(*), egg_payments(*), egg_order_additions(*)')
          .eq('user_id', session.userId)
      )
    }
    if (session.email) {
      queries.push(
        supabaseAdmin
          .from('egg_orders')
          .select('*, egg_breeds(*), egg_payments(*), egg_order_additions(*)')
          .eq('customer_email', session.email)
      )
    }
    if (session.phoneNumber) {
      queries.push(
        supabaseAdmin
          .from('egg_orders')
          .select('*, egg_breeds(*), egg_payments(*), egg_order_additions(*)')
          .eq('customer_phone', session.phoneNumber)
      )
    }

    if (queries.length === 0) {
      return NextResponse.json([])
    }

    const results = await Promise.all(queries)
    for (const result of results) {
      if (result.error) {
        console.error('Error fetching egg orders:', result.error)
        return NextResponse.json({ error: result.error.message }, { status: 500 })
      }
    }

    const combined = new Map<string, any>()
    for (const result of results) {
      for (const order of result.data || []) {
        combined.set(order.id, order)
      }
    }

    const data = Array.from(combined.values()).sort((a, b) => {
      if (!a.created_at || !b.created_at) return 0
      return b.created_at.localeCompare(a.created_at)
    })

    const reconciled = []
    for (const order of data) {
      // Keep API responsive even if Vipps check fails for one order.
      reconciled.push(await reconcileEggOrder(order))
    }

    return NextResponse.json(reconciled)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
