import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { dispatchEmail } from '@/lib/email/dispatch'
import { renderManagedTemplate } from '@/lib/email/render'
import { VIPPS_PENDING_EMAIL } from '@/lib/constants/app'

function isUuid(value?: string | null): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
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

async function loadPorkOrder(identifier: string) {
  const selectClause = 'id, order_number, customer_name, customer_email, status, remainder_amount, remainder_payment_enabled, payments(*)'
  const attempts: Array<'id' | 'order_number'> = isUuid(identifier)
    ? ['id', 'order_number']
    : ['order_number', 'id']

  for (const column of attempts) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(selectClause)
      .eq(column, identifier)
      .maybeSingle()

    if (error) return { data: null, error }
    if (data) return { data, error: null }
  }

  return { data: null, error: null }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: order, error } = await loadPorkOrder(params.id)

  if (error) {
    return NextResponse.json({ error: String(error.message || 'Failed to load order') }, { status: 500 })
  }

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status === 'cancelled' || order.status === 'completed' || order.status === 'refunded') {
    return NextResponse.json({ error: 'Remainder payment cannot be enabled for this order state' }, { status: 400 })
  }

  if (!hasCompletedDeposit(order.payments || [])) {
    return NextResponse.json({ error: 'Deposit must be paid before enabling remainder payment' }, { status: 400 })
  }

  const remainderPaidNok = getCompletedRemainderPaidNok(order.payments || [])
  const remainderDueNok = Math.max(0, Math.round(Number(order.remainder_amount || 0)) - remainderPaidNok)

  if (remainderDueNok <= 0) {
    return NextResponse.json({ error: 'Remainder is already paid' }, { status: 400 })
  }

  if (order.remainder_payment_enabled === true) {
    return NextResponse.json({
      success: true,
      remainderPaymentEnabled: true,
      remainderDueNok,
      alreadyEnabled: true,
      emailSent: false,
      emailWarning: null,
    })
  }

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ remainder_payment_enabled: true })
    .eq('id', order.id)

  if (updateError) {
    return NextResponse.json({ error: String(updateError.message || 'Failed to enable remainder payment') }, { status: 500 })
  }

  let emailSent = false
  let emailWarning: string | null = null

  if (order.customer_email && order.customer_email !== VIPPS_PENDING_EMAIL) {
    try {
      const rendered = await renderManagedTemplate({
        templateKey: 'pig.order.remainder.enabled.customer',
        locale: 'no',
        variables: {
          customer_name: order.customer_name,
          order_number: order.order_number,
          remainder_amount_nok: `kr ${remainderDueNok.toLocaleString('nb-NO')}`,
        },
      })

      if (rendered?.html) {
        const result = await dispatchEmail({
          to: order.customer_email,
          subject: rendered.subject ?? `Restbetaling tilgjengelig - ${order.order_number}`,
          html: rendered.html,
          orderId: order.id,
          classification: 'transactional',
          sourcePath: '/api/admin/orders/[id]/enable-remainder',
          templateKey: 'pig.order.remainder.enabled.customer',
          sendImmediately: true,
        })
        emailSent = result?.success === true && !result?.skipped
        if (!emailSent) {
          emailWarning = 'Remainder payment enabled but customer notification failed — resend manually'
        }
      } else {
        // Template not configured — skip gracefully
        emailWarning = 'Template pig.order.remainder.enabled.customer not found — no email sent'
      }
    } catch (err) {
      emailWarning = 'Remainder payment enabled but customer notification failed — resend manually'
    }
  }

  return NextResponse.json({
    success: true,
    remainderPaymentEnabled: true,
    remainderDueNok,
    emailSent,
    emailWarning,
  })
}
