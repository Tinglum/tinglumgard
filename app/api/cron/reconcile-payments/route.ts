import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vippsClient } from '@/lib/vipps/api-client'
import { finalizeConfirmedEggOrder } from '@/lib/eggs/order-confirmation'
import { logError } from '@/lib/logger'

function getCronAuth(request: NextRequest): {
  ok: boolean
  status: number
  error?: string
} {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return { ok: false, status: 500, error: 'CRON_SECRET is not configured' }
  }

  const token =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('token')
  if (!token || token !== secret) {
    return { ok: false, status: 401, error: 'Invalid cron token' }
  }

  return { ok: true, status: 200 }
}

async function getCheckoutSessionSafe(sessionIdOrReference: string) {
  try {
    return await vippsClient.getCheckoutSession(sessionIdOrReference)
  } catch {
    return null
  }
}

async function resolveVippsSession(payment: {
  vipps_order_id?: string | null
  vipps_session_id?: string | null
  idempotency_key?: string | null
}) {
  const candidates = [
    payment.vipps_order_id,
    payment.vipps_session_id,
    payment.idempotency_key,
  ]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)

  const seen = new Set<string>()
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue
    seen.add(candidate)
    const session = await getCheckoutSessionSafe(candidate)
    if (session) return session
  }

  return null
}

type ReconcileResult = {
  paymentId: string
  type: string
  scope: string
  action: 'reconciled' | 'skipped' | 'error'
  detail?: string
}

export async function POST(request: NextRequest) {
  const auth = getCronAuth(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const results: ReconcileResult[] = []
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  // --- Pig payments ---
  try {
    const { data: pigPayments } = await supabaseAdmin
      .from('payments')
      .select('id, order_id, payment_type, vipps_session_id, idempotency_key, created_at')
      .eq('status', 'pending')
      .lt('created_at', fiveMinutesAgo)
      .limit(50)

    for (const payment of pigPayments || []) {
      try {
        const session = await resolveVippsSession(payment)
        if (!session || session.sessionState !== 'PaymentSuccessful') {
          results.push({ paymentId: payment.id, type: payment.payment_type, scope: 'pig', action: 'skipped', detail: session?.sessionState || 'no session' })
          continue
        }

        const paidAt = new Date().toISOString()
        await supabaseAdmin
          .from('payments')
          .update({ status: 'completed', paid_at: paidAt, webhook_processed_at: paidAt })
          .eq('id', payment.id)
          .eq('status', 'pending')

        if (payment.payment_type === 'deposit') {
          const { data: order } = await supabaseAdmin
            .from('orders')
            .select('deposit_amount_nok, total_amount_nok, remainder_amount_nok')
            .eq('id', payment.order_id)
            .maybeSingle()

          const remainder = Number(order?.remainder_amount_nok || 0)
          const newStatus = remainder <= 0 ? 'fully_paid' : 'deposit_paid'
          await supabaseAdmin.from('orders').update({ status: newStatus }).eq('id', payment.order_id)
        }

        results.push({ paymentId: payment.id, type: payment.payment_type, scope: 'pig', action: 'reconciled' })
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'unknown'
        logError('cron-reconcile-pig-payment', error, { paymentId: payment.id })
        results.push({ paymentId: payment.id, type: payment.payment_type, scope: 'pig', action: 'error', detail: msg })
      }
    }
  } catch (error) {
    logError('cron-reconcile-pig-query', error)
  }

  // --- Egg payments ---
  try {
    const { data: eggPayments } = await supabaseAdmin
      .from('egg_payments')
      .select('id, egg_order_id, payment_type, vipps_order_id, idempotency_key, created_at')
      .eq('status', 'pending')
      .lt('created_at', fiveMinutesAgo)
      .limit(50)

    for (const payment of eggPayments || []) {
      try {
        const session = await resolveVippsSession(payment)
        if (!session || session.sessionState !== 'PaymentSuccessful') {
          results.push({ paymentId: payment.id, type: payment.payment_type, scope: 'egg', action: 'skipped', detail: session?.sessionState || 'no session' })
          continue
        }

        const paidAt = new Date().toISOString()
        await supabaseAdmin
          .from('egg_payments')
          .update({ status: 'completed', paid_at: paidAt, webhook_processed_at: paidAt })
          .eq('id', payment.id)
          .eq('status', 'pending')

        if (payment.payment_type === 'deposit') {
          try {
            await finalizeConfirmedEggOrder(payment.egg_order_id)
          } catch (finErr) {
            // Inventory reservation may fail for deferred orders — continue with status update
            logError('cron-reconcile-egg-finalize', finErr, { paymentId: payment.id, orderId: payment.egg_order_id })
          }

          const { data: order } = await supabaseAdmin
            .from('egg_orders')
            .select('deposit_amount, total_amount, remainder_amount')
            .eq('id', payment.egg_order_id)
            .maybeSingle()

          const remainder = Number(order?.remainder_amount || 0)
          const deposit = Number(order?.deposit_amount || 0)
          const total = Number(order?.total_amount || 0)
          const newStatus = (remainder <= 0 || (deposit > 0 && total > 0 && deposit >= total)) ? 'fully_paid' : 'deposit_paid'
          await supabaseAdmin.from('egg_orders').update({ status: newStatus }).eq('id', payment.egg_order_id)
        }

        if (payment.payment_type === 'remainder') {
          const { data: allPayments } = await supabaseAdmin
            .from('egg_payments')
            .select('amount_nok, status')
            .eq('egg_order_id', payment.egg_order_id)
            .eq('payment_type', 'remainder')
            .eq('status', 'completed')

          const { data: order } = await supabaseAdmin
            .from('egg_orders')
            .select('remainder_amount')
            .eq('id', payment.egg_order_id)
            .maybeSingle()

          const remainderPaidOre = (allPayments || []).reduce((sum, p: any) => sum + (p.amount_nok || 0) * 100, 0)
          const remainderDue = Number(order?.remainder_amount || 0)
          if (remainderPaidOre >= remainderDue) {
            await supabaseAdmin.from('egg_orders').update({ status: 'fully_paid' }).eq('id', payment.egg_order_id)
          }
        }

        results.push({ paymentId: payment.id, type: payment.payment_type, scope: 'egg', action: 'reconciled' })
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'unknown'
        logError('cron-reconcile-egg-payment', error, { paymentId: payment.id })
        results.push({ paymentId: payment.id, type: payment.payment_type, scope: 'egg', action: 'error', detail: msg })
      }
    }
  } catch (error) {
    logError('cron-reconcile-egg-query', error)
  }

  // --- Chicken payments ---
  try {
    const { data: chickenPayments } = await supabaseAdmin
      .from('chicken_payments')
      .select('id, chicken_order_id, payment_type, vipps_order_id, idempotency_key, created_at')
      .eq('status', 'pending')
      .lt('created_at', fiveMinutesAgo)
      .limit(50)

    for (const payment of chickenPayments || []) {
      try {
        const session = await resolveVippsSession(payment)
        if (!session || session.sessionState !== 'PaymentSuccessful') {
          results.push({ paymentId: payment.id, type: payment.payment_type, scope: 'chicken', action: 'skipped', detail: session?.sessionState || 'no session' })
          continue
        }

        const paidAt = new Date().toISOString()
        await supabaseAdmin
          .from('chicken_payments')
          .update({ status: 'completed', paid_at: paidAt, webhook_processed_at: paidAt })
          .eq('id', payment.id)
          .eq('status', 'pending')

        if (payment.payment_type === 'deposit') {
          const { data: order } = await supabaseAdmin
            .from('chicken_orders')
            .select('deposit_amount_nok, total_amount_nok, remainder_amount_nok')
            .eq('id', payment.chicken_order_id)
            .maybeSingle()

          const remainder = Number(order?.remainder_amount_nok || 0)
          const newStatus = remainder <= 0 ? 'fully_paid' : 'deposit_paid'
          await supabaseAdmin.from('chicken_orders').update({ status: newStatus }).eq('id', payment.chicken_order_id)
        }

        results.push({ paymentId: payment.id, type: payment.payment_type, scope: 'chicken', action: 'reconciled' })
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'unknown'
        logError('cron-reconcile-chicken-payment', error, { paymentId: payment.id })
        results.push({ paymentId: payment.id, type: payment.payment_type, scope: 'chicken', action: 'error', detail: msg })
      }
    }
  } catch (error) {
    logError('cron-reconcile-chicken-query', error)
  }

  const reconciled = results.filter((r) => r.action === 'reconciled').length
  const errors = results.filter((r) => r.action === 'error').length

  if (reconciled > 0) {
    console.log(`Payment reconciliation: ${reconciled} reconciled, ${errors} errors`, results)
  }

  return NextResponse.json({
    ok: true,
    reconciled,
    errors,
    results,
  })
}
