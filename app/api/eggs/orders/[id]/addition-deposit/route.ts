import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vippsClient } from '@/lib/vipps/api-client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('egg_orders')
      .select('*, egg_payments(*), egg_order_additions(subtotal)')
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const matchesPhone = Boolean(session.phoneNumber) && order.customer_phone === session.phoneNumber
    const matchesEmail = Boolean(session.email) && order.customer_email === session.email
    const isOwner = order.user_id === session.userId
    const isAuthorized = Boolean(session.isAdmin) || isOwner || matchesPhone || matchesEmail

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const initialDepositPaid = (order.egg_payments || []).some(
      (payment: any) => payment.payment_type === 'deposit' && payment.status === 'completed'
    )

    if (!initialDepositPaid) {
      return NextResponse.json({ error: 'Deposit must be paid first' }, { status: 400 })
    }

    const additionsTotalOre = (order.egg_order_additions || []).reduce(
      (sum: number, addition: any) => sum + Number(addition?.subtotal || 0),
      0
    )
    const targetAdditionDepositOre = Math.round(additionsTotalOre / 2)
    const completedAdditionDepositOre = (order.egg_payments || []).reduce((sum: number, payment: any) => {
      if (payment.payment_type !== 'addition_deposit' || payment.status !== 'completed') return sum
      return sum + Number(payment.amount_nok || 0) * 100
    }, 0)
    const amountDue = Math.max(0, targetAdditionDepositOre - completedAdditionDepositOre)

    if (amountDue <= 0) {
      return NextResponse.json({ error: 'Addition deposit already covered' }, { status: 400 })
    }

    const pendingAdditionDeposit = (order.egg_payments || []).find(
      (payment: any) => payment.payment_type === 'addition_deposit' && payment.status === 'pending'
    )
    if (pendingAdditionDeposit?.vipps_order_id) {
      const pendingAmountOre = Number(pendingAdditionDeposit.amount_nok || 0) * 100
      if (pendingAmountOre === amountDue) {
        try {
          const checkoutSession = await vippsClient.getCheckoutSession(pendingAdditionDeposit.vipps_order_id)
          if (
            checkoutSession.sessionState === 'SessionCreated' ||
            checkoutSession.sessionState === 'PaymentInitiated'
          ) {
            return NextResponse.json({
              success: true,
              redirectUrl:
                checkoutSession.checkoutFrontendUrl ||
                `https://checkout${process.env.VIPPS_ENV === 'test' ? '.test' : ''}.vipps.no/${pendingAdditionDeposit.vipps_order_id}`,
              paymentId: pendingAdditionDeposit.id,
              amount: amountDue,
            })
          }
        } catch (error) {
          await supabaseAdmin.from('egg_payments').delete().eq('id', pendingAdditionDeposit.id)
        }
      } else {
        await supabaseAdmin.from('egg_payments').delete().eq('id', pendingAdditionDeposit.id)
      }
    }

    const shortReference = `EGG-ADD-${order.order_number}-${Date.now()}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'https://tinglumgard.no'
    const { randomBytes } = await import('crypto')
    const callbackToken = randomBytes(16).toString('hex')

    const sessionData: any = {
      merchantInfo: {
        callbackUrl: `${appUrl}/api/webhooks/vipps`,
        returnUrl: `${appUrl}/rugeegg/mine-bestillinger/betaling-bekreftet?orderId=${order.id}`,
        termsAndConditionsUrl: `${appUrl}/vilkar`,
        callbackAuthorizationToken: callbackToken,
      },
      transaction: {
        amount: {
          currency: 'NOK',
          value: amountDue,
        },
        reference: shortReference,
        paymentDescription: `Forskudd ekstra rugeegg ${order.order_number}`,
      },
      configuration: {
        userFlow: 'WEB_REDIRECT',
        elements: 'PaymentOnly',
      },
    }

    const vippsResult = await vippsClient.createCheckoutSession(sessionData)

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('egg_payments')
      .insert({
        egg_order_id: order.id,
        payment_type: 'addition_deposit',
        amount_nok: Math.round(amountDue / 100),
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
      amount: amountDue,
    })
  } catch (error) {
    console.error('Error creating addition deposit payment:', error)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}
