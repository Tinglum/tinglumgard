import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vippsClient } from '@/lib/vipps/api-client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('chicken_orders')
      .select('*, chicken_payments(*)')
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Must have deposit paid first
    const completedDeposit = order.chicken_payments?.find(
      (p: any) => p.payment_type === 'deposit' && p.status === 'completed'
    )
    if (!completedDeposit) {
      return NextResponse.json({ error: 'Deposit not yet paid' }, { status: 400 })
    }

    // Check for already completed remainder
    const existingRemainder = order.chicken_payments?.find((p: any) => p.payment_type === 'remainder')
    if (existingRemainder && existingRemainder.status === 'completed') {
      return NextResponse.json({ error: 'Remainder already paid' }, { status: 400 })
    }

    // Check for existing pending remainder — reuse if still active
    if (existingRemainder && existingRemainder.status === 'pending') {
      try {
        const sessionId = existingRemainder.vipps_order_id
        if (sessionId) {
          const checkoutSession = await vippsClient.getCheckoutSession(sessionId)
          if (
            checkoutSession.sessionState === 'SessionCreated' ||
            checkoutSession.sessionState === 'PaymentInitiated'
          ) {
            return NextResponse.json({
              success: true,
              redirectUrl:
                checkoutSession.checkoutFrontendUrl ||
                `https://checkout${process.env.VIPPS_ENV === 'test' ? '.test' : ''}.vipps.no/${sessionId}`,
              paymentId: existingRemainder.id,
              amount: existingRemainder.amount_nok,
            })
          }
        }
      } catch (error) {
        await supabaseAdmin.from('chicken_payments').delete().eq('id', existingRemainder.id)
      }
    }

    const remainderAmountNok = Number(order.remainder_amount_nok)
    const remainderAmountOre = Math.round(remainderAmountNok * 100)
    const shortReference = `CHICK-REM-${order.order_number}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no'

    const { randomBytes } = await import('crypto')
    const callbackToken = randomBytes(16).toString('hex')

    const sessionData: any = {
      merchantInfo: {
        callbackUrl: `${appUrl}/api/webhooks/vipps`,
        returnUrl: `${appUrl}/kyllinger/bekreftelse?orderId=${order.id}`,
        termsAndConditionsUrl: `${appUrl}/vilkar`,
        callbackAuthorizationToken: callbackToken,
      },
      transaction: {
        amount: {
          currency: 'NOK',
          value: remainderAmountOre,
        },
        reference: shortReference,
        paymentDescription: `Restbetaling kyllinger ${order.order_number}`,
      },
      configuration: {
        userFlow: 'WEB_REDIRECT',
        elements: 'PaymentOnly',
        customerInteraction: 'CUSTOMER_PRESENT',
      },
    }

    const vippsResult = await vippsClient.createCheckoutSession(sessionData)

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('chicken_payments')
      .insert({
        chicken_order_id: order.id,
        payment_type: 'remainder',
        amount_nok: remainderAmountNok,
        vipps_order_id: vippsResult.sessionId,
        vipps_callback_token: callbackToken,
        status: 'pending',
        idempotency_key: shortReference,
      })
      .select()
      .single()

    if (paymentError) {
      return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      redirectUrl: vippsResult.checkoutFrontendUrl,
      paymentId: payment.id,
      amount: remainderAmountNok,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to create payment', details: errorMessage }, { status: 500 })
  }
}
