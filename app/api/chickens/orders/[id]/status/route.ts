import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vippsClient } from '@/lib/vipps/api-client'
import { logError } from '@/lib/logger'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
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
      .select('id, order_number, status, quantity_hens, quantity_roosters, pickup_week, pickup_year, total_amount_nok, deposit_amount_nok, remainder_amount_nok, chicken_breeds(name)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

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
          }
        } catch (vippsError) {
          // Keep endpoint resilient even if Vipps lookup fails.
          logError('chicken-order-status-vipps-reconcile', vippsError)
        }
      }
    }

    const { data: refreshedOrder, error: refreshedError } = await supabaseAdmin
      .from('chicken_orders')
      .select('id, order_number, status, quantity_hens, quantity_roosters, pickup_week, pickup_year, total_amount_nok, deposit_amount_nok, remainder_amount_nok, chicken_breeds(name)')
      .eq('id', orderId)
      .single()

    if (refreshedError || !refreshedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(refreshedOrder)
  } catch (error: any) {
    logError('chicken-order-status-main', error)
    return NextResponse.json({ error: 'Internal server error', details: error?.message || null }, { status: 500 })
  }
}
