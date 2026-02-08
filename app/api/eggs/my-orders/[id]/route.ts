import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vippsClient } from '@/lib/vipps/api-client'

function buildShippingUpdate(details: any) {
  if (!details || typeof details !== 'object') return null

  const firstName = details.firstName || details.first_name || ''
  const lastName = details.lastName || details.last_name || ''
  const name = [firstName, lastName].filter(Boolean).join(' ').trim()
  const email = details.email || details.emailAddress || ''
  const phone = details.phoneNumber || details.phone_number || ''
  const street = details.streetAddress || details.addressLine1 || details.address || ''
  const postal = details.postalCode || details.zipCode || ''
  const city = details.city || ''
  const country = details.country || ''

  const update: Record<string, string> = {}
  if (name) update.shipping_name = name
  if (email) update.shipping_email = email
  if (phone) update.shipping_phone = phone
  if (street) update.shipping_address = street
  if (postal) update.shipping_postal_code = postal
  if (city) update.shipping_city = city
  if (country) update.shipping_country = country

  if (name) update.customer_name = name
  if (email) update.customer_email = email
  if (phone) update.customer_phone = phone

  return Object.keys(update).length ? update : null
}

function pickLatestPendingDeposit(payments: any[] = []) {
  return payments
    .filter((payment) => payment.payment_type === 'deposit' && payment.status === 'pending')
    .sort((a, b) => {
      const aTs = new Date(a.created_at || 0).getTime()
      const bTs = new Date(b.created_at || 0).getTime()
      return bTs - aTs
    })[0]
}

async function reconcileEggOrder(order: any) {
  const completedDeposit = (order.egg_payments || []).find(
    (payment: any) => payment.payment_type === 'deposit' && payment.status === 'completed'
  )

  if (completedDeposit && order.status === 'pending') {
    const { error: statusErr } = await supabaseAdmin
      .from('egg_orders')
      .update({ status: 'deposit_paid' })
      .eq('id', order.id)

    if (statusErr) {
      console.error('Failed to self-heal egg order status:', statusErr)
      return order
    }

    return {
      ...order,
      status: 'deposit_paid',
    }
  }

  const depositPayment = pickLatestPendingDeposit(order.egg_payments || [])

  if (!depositPayment) {
    return order
  }

  const vippsId = depositPayment.vipps_order_id
  if (!vippsId) {
    return order
  }

  try {
    const session = await vippsClient.getCheckoutSession(vippsId)
    const sessionState = session?.sessionState as string | undefined

    if (sessionState !== 'PaymentSuccessful') {
      return order
    }

    const paidAt = new Date().toISOString()
    const shippingDetails = session?.shippingDetails || session?.billingDetails
    const shippingUpdate = buildShippingUpdate(shippingDetails)

    if (shippingUpdate) {
      await supabaseAdmin
        .from('egg_orders')
        .update(shippingUpdate)
        .eq('id', order.id)
    }

    await supabaseAdmin
      .from('egg_payments')
      .update({ status: 'completed', paid_at: paidAt, webhook_processed_at: paidAt })
      .eq('id', depositPayment.id)
      .throwOnError()

    await supabaseAdmin
      .from('egg_orders')
      .update({ status: 'deposit_paid' })
      .eq('id', order.id)
      .throwOnError()

    return {
      ...order,
      status: 'deposit_paid',
      ...(shippingUpdate ? shippingUpdate : {}),
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
