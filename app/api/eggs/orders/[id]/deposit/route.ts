import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { verifyOrderAccessToken } from '@/lib/auth/order-access'
import { validateEggOrderInventoryAvailability } from '@/lib/eggs/order-confirmation'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vippsClient } from '@/lib/vipps/api-client'
import { APP_BASE_URL } from '@/lib/constants/app'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  const orderAccessToken = request.headers.get('x-order-access-token')

  if (!session && !orderAccessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('egg_orders')
      .select('*, egg_payments(*)')
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const hasTokenAccess = await verifyOrderAccessToken(orderAccessToken, {
      scope: 'eggs',
      orderId: order.id,
    })

    if (session) {
      const matchesPhone = Boolean(session.phoneNumber) && order.customer_phone === session.phoneNumber
      const matchesEmail = Boolean(session.email) && order.customer_email === session.email
      const isOwner = order.user_id === session.userId
      const isAuthorized = Boolean(session.isAdmin) || isOwner || matchesPhone || matchesEmail || hasTokenAccess

      if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    } else if (!hasTokenAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const existingDeposit = order.egg_payments?.find((p: any) => p.payment_type === 'deposit')
    if (existingDeposit && existingDeposit.status === 'completed') {
      return NextResponse.json({ error: 'Deposit already paid' }, { status: 400 })
    }

    // Skip inventory validation for orders retrying deposit (e.g. deferred during Vipps outage).
    // The order already exists and eggs are logically committed.
    if (!order.inventory_reserved_at && !existingDeposit && order.status !== 'pending') {
      try {
        await validateEggOrderInventoryAvailability(order.id)
      } catch (error: any) {
        return NextResponse.json(
          { error: error?.message || 'Selected eggs are no longer available' },
          { status: 409 }
        )
      }
    }

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
        await supabaseAdmin.from('egg_payments').delete().eq('id', existingDeposit.id)
      }
    }

    const depositAmount = order.deposit_amount
    const shortReference = `EGG-DEP-${order.order_number}`
    const appUrl = APP_BASE_URL
    const needsShippingAddress = order.delivery_method === 'posten'

    const { randomBytes } = await import('crypto')
    const callbackToken = randomBytes(16).toString('hex')


    const sessionData: any = {
      merchantInfo: {
        callbackUrl: `${appUrl}/api/webhooks/vipps`,
        returnUrl: `${appUrl}/rugeegg/bestill/bekreftelse?orderId=${order.id}`,
        termsAndConditionsUrl: `${appUrl}/vilkar`,
        callbackAuthorizationToken: callbackToken,
      },
      transaction: {
        amount: {
          currency: 'NOK',
          value: depositAmount, // egg amounts are in øre already
        },
        reference: shortReference,
        paymentDescription: `Forskudd rugeegg ${order.order_number}`,
      },
      configuration: {
        userFlow: 'WEB_REDIRECT',
        elements: needsShippingAddress ? 'PaymentAndContactInfo' : 'PaymentOnly',
        customerInteraction: 'CUSTOMER_PRESENT',
      },
    }


    const vippsResult = await vippsClient.createCheckoutSession(sessionData)

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('egg_payments')
      .insert({
        egg_order_id: order.id,
        payment_type: 'deposit',
        amount_nok: Math.round(depositAmount / 100),
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

    await supabaseAdmin
      .from('egg_orders')
      .update({
        vipps_deposit_order_id: vippsResult.sessionId,
        payment_attempts: (Number(order.payment_attempts) || 0) + 1,
      })
      .eq('id', order.id)

    return NextResponse.json({
      success: true,
      redirectUrl: vippsResult.checkoutFrontendUrl,
      paymentId: payment.id,
      amount: depositAmount,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to create payment', details: errorMessage }, { status: 500 })
  }
}

