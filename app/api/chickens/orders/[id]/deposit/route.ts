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

    // Check for existing completed deposit
    const existingDeposit = order.chicken_payments?.find((p: any) => p.payment_type === 'deposit')
    if (existingDeposit && existingDeposit.status === 'completed') {
      return NextResponse.json({ error: 'Deposit already paid' }, { status: 400 })
    }

    // Check for existing pending deposit — reuse if still active
    if (existingDeposit && existingDeposit.status === 'pending') {
      try {
        const sessionId = existingDeposit.vipps_order_id
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
              paymentId: existingDeposit.id,
              amount: existingDeposit.amount_nok,
            })
          }
        }
      } catch (error) {
        // Session expired or invalid, delete old payment and create new one
        await supabaseAdmin.from('chicken_payments').delete().eq('id', existingDeposit.id)
      }
    }

    const depositAmountNok = Number(order.deposit_amount_nok)
    const depositAmountOre = Math.round(depositAmountNok * 100)
    const shortReference = `CHICK-DEP-${order.order_number}`
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
          value: depositAmountOre,
        },
        reference: shortReference,
        paymentDescription: `Forskudd kyllinger ${order.order_number}`,
      },
      configuration: {
        userFlow: 'WEB_REDIRECT',
        elements: 'PaymentAndContactInfo',
        customerInteraction: 'CUSTOMER_PRESENT',
      },
    }

    const vippsResult = await vippsClient.createCheckoutSession(sessionData)

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('chicken_payments')
      .insert({
        chicken_order_id: order.id,
        payment_type: 'deposit',
        amount_nok: depositAmountNok,
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
      amount: depositAmountNok,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to create payment', details: errorMessage }, { status: 500 })
  }
}
