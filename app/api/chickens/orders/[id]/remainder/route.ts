import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { getSession } from '@/lib/auth/session'
import { verifyOrderAccessToken } from '@/lib/auth/order-access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vippsClient } from '@/lib/vipps/api-client'

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

function normalizePhone(value: unknown): string {
  return String(value || '').trim()
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
      .from('chicken_orders')
      .select('*, chicken_payments(*)')
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const hasTokenAccess = await verifyOrderAccessToken(orderAccessToken, {
      scope: 'chickens',
      orderId: order.id,
    })

    if (session) {
      const sessionPhone = normalizePhone(session.phoneNumber)
      const sessionEmail = normalizeEmail(session.email)
      const matchesPhone = Boolean(sessionPhone) && normalizePhone(order.customer_phone) === sessionPhone
      const matchesEmail = Boolean(sessionEmail) && normalizeEmail(order.customer_email) === sessionEmail
      const isOwner = order.user_id === session.userId
      const isAuthorized = Boolean(session.isAdmin) || isOwner || matchesPhone || matchesEmail || hasTokenAccess

      if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    } else if (!hasTokenAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!hasCompletedDeposit(order.chicken_payments || [])) {
      return NextResponse.json({ error: 'Deposit must be paid first' }, { status: 400 })
    }

    if (order.remainder_payment_enabled !== true) {
      return NextResponse.json({ error: 'Remainder payment has not been enabled yet' }, { status: 403 })
    }

    if (!['deposit_paid', 'ready_for_pickup'].includes(String(order.status || ''))) {
      return NextResponse.json({ error: 'Remainder payment is not available for this order state' }, { status: 400 })
    }

    const remainderPaidNok = getCompletedRemainderPaidNok(order.chicken_payments || [])
    const remainderDueNok = Math.max(0, Math.round(Number(order.remainder_amount_nok || 0)) - remainderPaidNok)

    if (remainderDueNok <= 0) {
      return NextResponse.json({ error: 'Remainder already paid' }, { status: 400 })
    }

    const pendingRemainder = (order.chicken_payments || []).find(
      (payment: any) => payment?.payment_type === 'remainder' && payment?.status === 'pending'
    )

    if (pendingRemainder?.vipps_order_id) {
      const pendingAmountNok = Math.round(Number(pendingRemainder.amount_nok || 0))
      if (pendingAmountNok === remainderDueNok) {
        try {
          const checkoutSession = await vippsClient.getCheckoutSession(pendingRemainder.vipps_order_id)
          if (
            checkoutSession.sessionState === 'SessionCreated' ||
            checkoutSession.sessionState === 'PaymentInitiated'
          ) {
            return NextResponse.json({
              success: true,
              redirectUrl:
                checkoutSession.checkoutFrontendUrl ||
                `https://checkout${process.env.VIPPS_ENV === 'test' ? '.test' : ''}.vipps.no/${pendingRemainder.vipps_order_id}`,
              paymentId: pendingRemainder.id,
              amountNok: remainderDueNok,
            })
          }

          if (checkoutSession.sessionState === 'PaymentSuccessful') {
            return NextResponse.json({ error: 'Remainder already paid' }, { status: 400 })
          }
        } catch {
          await supabaseAdmin.from('chicken_payments').delete().eq('id', pendingRemainder.id)
        }
      } else {
        await supabaseAdmin.from('chicken_payments').delete().eq('id', pendingRemainder.id)
      }
    }

    const amountDueOre = remainderDueNok * 100
    const shortReference = `CHICK-REM-${order.order_number}-${Date.now()}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'https://tinglumgard.no'
    const callbackToken = randomBytes(16).toString('hex')

    const sessionData: any = {
      merchantInfo: {
        callbackUrl: `${appUrl}/api/webhooks/vipps`,
        returnUrl: `${appUrl}/min-side?chickenOrderId=${order.id}`,
        termsAndConditionsUrl: `${appUrl}/vilkar`,
        callbackAuthorizationToken: callbackToken,
      },
      transaction: {
        amount: {
          currency: 'NOK',
          value: amountDueOre,
        },
        reference: shortReference,
        paymentDescription: `Restbetaling kylling ${order.order_number}`,
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
        amount_nok: remainderDueNok,
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
      amountNok: remainderDueNok,
    })
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to create payment', details }, { status: 500 })
  }
}
