import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vippsClient } from '@/lib/vipps/api-client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('egg_orders')
      .select('*, egg_payments(*)')
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const depositPayment = order.egg_payments?.find(
      (p: any) => p.payment_type === 'deposit' && p.status === 'completed'
    )

    if (!depositPayment) {
      return NextResponse.json({ error: 'Deposit must be paid first' }, { status: 400 })
    }

    const remainderAmount = order.remainder_amount
    const remainderPayment = order.egg_payments?.find((p: any) => p.payment_type === 'remainder')

    if (remainderPayment?.status === 'completed') {
      return NextResponse.json({ error: 'Remainder already paid' }, { status: 400 })
    }

    const shortReference = `EGG-REM-${order.order_number}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no'

    const { randomBytes } = await import('crypto')
    const callbackToken = randomBytes(16).toString('hex')

    const sessionData: any = {
      merchantInfo: {
        callbackUrl: `${appUrl}/api/webhooks/vipps`,
        returnUrl: `${appUrl}/rugeegg/mine-bestillinger`,
        termsAndConditionsUrl: `${appUrl}/vilkar`,
        callbackAuthorizationToken: callbackToken,
      },
      transaction: {
        amount: {
          currency: 'NOK',
          value: remainderAmount, // egg amounts are in øre
        },
        reference: shortReference,
        paymentDescription: `Restbetaling rugeegg ${order.order_number}`,
      },
      configuration: {
        userFlow: 'WEB_REDIRECT',
        elements: 'PaymentOnly',
      },
    }

    const vippsResult = await vippsClient.createCheckoutSession(sessionData)

    let payment
    const { data: insertedPayment, error: paymentError } = await supabaseAdmin
      .from('egg_payments')
      .insert({
        egg_order_id: order.id,
        payment_type: 'remainder',
        amount_nok: Math.round(remainderAmount / 100),
        vipps_order_id: vippsResult.sessionId,
        status: 'pending',
        idempotency_key: shortReference,
      })
      .select()
      .single()

    if (paymentError) {
      if (paymentError.code === '23505') {
        const { data: updatedPayment, error: updateError } = await supabaseAdmin
          .from('egg_payments')
          .update({
            vipps_order_id: vippsResult.sessionId,
            amount_nok: Math.round(remainderAmount / 100),
            status: 'pending',
          })
          .eq('idempotency_key', shortReference)
          .select()
          .single()

        if (updateError) {
          return NextResponse.json({ error: 'Failed to update payment record' }, { status: 500 })
        }
        payment = updatedPayment
      } else {
        return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
      }
    } else {
      payment = insertedPayment
    }

    await supabaseAdmin
      .from('egg_orders')
      .update({ vipps_remainder_order_id: vippsResult.sessionId })
      .eq('id', order.id)

    return NextResponse.json({
      success: true,
      redirectUrl: vippsResult.checkoutFrontendUrl,
      paymentId: payment.id,
      amount: remainderAmount,
    })
  } catch (error) {
    console.error('Error creating remainder payment:', error)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}
