import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vippsClient } from '@/lib/vipps/api-client'
import { logError } from '@/lib/logger'
import { sendChickenDepositConfirmationEmails } from '@/lib/chickens/notifications'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function hasChickenConfirmationEmail(orderId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('email_dispatch_queue')
    .select('id')
    .eq('chicken_order_id', orderId)
    .eq('template_key', 'chicken.order.deposit.confirmed.customer')
    .limit(1)
    .maybeSingle()

  if (error) {
    logError('chicken-order-status-confirmation-check', error)
    return false
  }

  return Boolean(data?.id)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = String(params.id || '').trim()
    if (!orderId || !isUuid(orderId)) {
      return NextResponse.json({ error: 'Invalid order id' }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('chicken_orders')
      .select('id, order_number, status, payment_attempts, manual_confirmation, quantity_hens, quantity_roosters, pickup_week, pickup_year, total_amount_nok, deposit_amount_nok, remainder_amount_nok, chicken_breeds(name)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    let reconciledDeposit = false

    // If still pending, try to reconcile from Vipps session to avoid waiting for webhook only.
    if (order.status === 'pending') {
      const { data: depositPayment } = await supabaseAdmin
        .from('chicken_payments')
        .select('id, status, vipps_order_id, payment_type')
        .eq('chicken_order_id', orderId)
        .eq('payment_type', 'deposit')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (depositPayment && depositPayment.status !== 'completed' && depositPayment.vipps_order_id) {
        try {
          const checkoutSession = await vippsClient.getCheckoutSession(depositPayment.vipps_order_id)
          const sessionState = checkoutSession?.sessionState
          const paymentState = checkoutSession?.paymentDetails?.state

          if (sessionState === 'PaymentSuccessful' && paymentState === 'AUTHORIZED') {
            await supabaseAdmin
              .from('chicken_payments')
              .update({
                status: 'completed',
                paid_at: new Date().toISOString(),
              })
              .eq('id', depositPayment.id)

            await supabaseAdmin
              .from('chicken_orders')
              .update({ status: 'deposit_paid' })
              .eq('id', orderId)

            reconciledDeposit = true
          }
        } catch (vippsError) {
          // Keep endpoint resilient even if Vipps lookup fails.
          logError('chicken-order-status-vipps-reconcile', vippsError)
        }
      }
    }

    const { data: refreshedOrder, error: refreshedError } = await supabaseAdmin
      .from('chicken_orders')
      .select('id, order_number, status, payment_attempts, manual_confirmation, quantity_hens, quantity_roosters, pickup_week, pickup_year, total_amount_nok, deposit_amount_nok, remainder_amount_nok, chicken_breeds(name)')
      .eq('id', orderId)
      .single()

    if (refreshedError || !refreshedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const shouldHaveConfirmation = refreshedOrder.status === 'deposit_paid'
    const alreadyHasConfirmation = shouldHaveConfirmation
      ? await hasChickenConfirmationEmail(orderId)
      : false

    // If this endpoint reconciled the deposit before the webhook, or if the order is
    // already deposit-paid but still missing its confirmation email, queue the shared
    // detailed confirmation mail from the chicken notification helper.
    if (shouldHaveConfirmation && (!alreadyHasConfirmation || reconciledDeposit)) {
      try {
        await sendChickenDepositConfirmationEmails({
          orderId,
          sourcePath: '/api/chickens/orders/[id]/status',
          includeAdmin: reconciledDeposit,
        })
      } catch (notifyError) {
        logError('chicken-order-status-reconcile-notification', notifyError)
      }
    }

    return NextResponse.json(refreshedOrder)
  } catch (error: any) {
    logError('chicken-order-status-main', error)
    return NextResponse.json({ error: 'Internal server error', details: error?.message || null }, { status: 500 })
  }
}
