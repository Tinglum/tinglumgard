import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { vippsClient } from '@/lib/vipps/api-client'
import { finalizeConfirmedEggOrder } from '@/lib/eggs/order-confirmation'
import { logError } from '@/lib/logger'
import { notifyInventoryOverallocation } from '@/lib/notifications/inventory-overallocation'

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

type ResultEntry = {
  id: string
  scope: string
  action: string
  detail?: string
}

// ─── Reconcile pending payments ────────────────────────────────

async function reconcilePendingPayments(cutoff: string): Promise<ResultEntry[]> {
  const results: ResultEntry[] = []

  // --- Pig ---
  try {
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('id, order_id, payment_type, vipps_session_id, idempotency_key')
      .eq('status', 'pending')
      .lt('created_at', cutoff)
      .limit(50)

    for (const p of payments || []) {
      try {
        const session = await resolveVippsSession(p)
        if (!session || session.sessionState !== 'PaymentSuccessful') {
          results.push({ id: p.id, scope: 'pig', action: 'skipped', detail: session?.sessionState || 'no session' })
          continue
        }
        const paidAt = new Date().toISOString()
        await supabaseAdmin.from('payments').update({ status: 'completed', paid_at: paidAt, webhook_processed_at: paidAt }).eq('id', p.id).eq('status', 'pending')
        if (p.payment_type === 'deposit') {
          const { data: order } = await supabaseAdmin.from('orders').select('remainder_amount_nok').eq('id', p.order_id).maybeSingle()
          const status = Number(order?.remainder_amount_nok || 0) <= 0 ? 'fully_paid' : 'deposit_paid'
          await supabaseAdmin.from('orders').update({ status }).eq('id', p.order_id)
        }
        results.push({ id: p.id, scope: 'pig', action: 'reconciled' })
      } catch (err) {
        logError('cron-reconcile-pig', err, { paymentId: p.id })
        results.push({ id: p.id, scope: 'pig', action: 'error', detail: err instanceof Error ? err.message : 'unknown' })
      }
    }
  } catch (err) { logError('cron-reconcile-pig-query', err) }

  // --- Egg ---
  try {
    const { data: payments } = await supabaseAdmin
      .from('egg_payments')
      .select('id, egg_order_id, payment_type, vipps_order_id, idempotency_key')
      .eq('status', 'pending')
      .lt('created_at', cutoff)
      .limit(50)

    for (const p of payments || []) {
      try {
        const session = await resolveVippsSession(p)
        if (!session || session.sessionState !== 'PaymentSuccessful') {
          results.push({ id: p.id, scope: 'egg', action: 'skipped', detail: session?.sessionState || 'no session' })
          continue
        }
        const paidAt = new Date().toISOString()
        await supabaseAdmin.from('egg_payments').update({ status: 'completed', paid_at: paidAt, webhook_processed_at: paidAt }).eq('id', p.id).eq('status', 'pending')
        if (p.payment_type === 'deposit') {
          try { await finalizeConfirmedEggOrder(p.egg_order_id) } catch (finErr) {
            logError('cron-reconcile-egg-finalize', finErr, { paymentId: p.id })
            notifyInventoryOverallocation({ orderId: p.egg_order_id, orderNumber: p.egg_order_id, errorMessage: finErr instanceof Error ? finErr.message : 'Unknown', source: 'cron-reconcile' }).catch((e) => logError('cron-reconcile-notify-overallocation', e))
          }
          const { data: order } = await supabaseAdmin.from('egg_orders').select('deposit_amount, total_amount, remainder_amount').eq('id', p.egg_order_id).maybeSingle()
          const remainder = Number(order?.remainder_amount || 0)
          const deposit = Number(order?.deposit_amount || 0)
          const total = Number(order?.total_amount || 0)
          const status = (remainder <= 0 || (deposit > 0 && total > 0 && deposit >= total)) ? 'fully_paid' : 'deposit_paid'
          await supabaseAdmin.from('egg_orders').update({ status }).eq('id', p.egg_order_id)
        }
        if (p.payment_type === 'remainder') {
          const { data: all } = await supabaseAdmin.from('egg_payments').select('amount_nok').eq('egg_order_id', p.egg_order_id).eq('payment_type', 'remainder').eq('status', 'completed')
          const { data: order } = await supabaseAdmin.from('egg_orders').select('remainder_amount').eq('id', p.egg_order_id).maybeSingle()
          const paidOre = (all || []).reduce((s, r: any) => s + (r.amount_nok || 0) * 100, 0)
          if (paidOre >= Number(order?.remainder_amount || 0)) {
            await supabaseAdmin.from('egg_orders').update({ status: 'fully_paid' }).eq('id', p.egg_order_id)
          }
        }
        results.push({ id: p.id, scope: 'egg', action: 'reconciled' })
      } catch (err) {
        logError('cron-reconcile-egg', err, { paymentId: p.id })
        results.push({ id: p.id, scope: 'egg', action: 'error', detail: err instanceof Error ? err.message : 'unknown' })
      }
    }
  } catch (err) { logError('cron-reconcile-egg-query', err) }

  // --- Chicken ---
  try {
    const { data: payments } = await supabaseAdmin
      .from('chicken_payments')
      .select('id, chicken_order_id, payment_type, vipps_order_id, idempotency_key')
      .eq('status', 'pending')
      .lt('created_at', cutoff)
      .limit(50)

    for (const p of payments || []) {
      try {
        const session = await resolveVippsSession(p)
        if (!session || session.sessionState !== 'PaymentSuccessful') {
          results.push({ id: p.id, scope: 'chicken', action: 'skipped', detail: session?.sessionState || 'no session' })
          continue
        }
        const paidAt = new Date().toISOString()
        await supabaseAdmin.from('chicken_payments').update({ status: 'completed', paid_at: paidAt, webhook_processed_at: paidAt }).eq('id', p.id).eq('status', 'pending')
        if (p.payment_type === 'deposit') {
          const { data: order } = await supabaseAdmin.from('chicken_orders').select('remainder_amount_nok').eq('id', p.chicken_order_id).maybeSingle()
          const status = Number(order?.remainder_amount_nok || 0) <= 0 ? 'fully_paid' : 'deposit_paid'
          await supabaseAdmin.from('chicken_orders').update({ status }).eq('id', p.chicken_order_id)
        }
        results.push({ id: p.id, scope: 'chicken', action: 'reconciled' })
      } catch (err) {
        logError('cron-reconcile-chicken', err, { paymentId: p.id })
        results.push({ id: p.id, scope: 'chicken', action: 'error', detail: err instanceof Error ? err.message : 'unknown' })
      }
    }
  } catch (err) { logError('cron-reconcile-chicken-query', err) }

  return results
}

// ─── Cancel abandoned checkouts ────────────────────────────────
// An abandoned checkout is an order with:
//   - status still "pending" (or "draft" for pork)
//   - a pending payment record with a Vipps session that expired/terminated
//   - created more than 30 minutes ago
// Deferred orders (no payment record) are NOT touched — those are intentional.

async function cancelAbandonedCheckouts(cutoff: string): Promise<ResultEntry[]> {
  const results: ResultEntry[] = []

  // --- Pig: draft orders with expired Vipps sessions ---
  try {
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, box_size, mangalitsa_preset_id, mangalitsa_preset:mangalitsa_box_presets(target_weight_kg), payments(id, vipps_session_id, idempotency_key, status)')
      .in('status', ['draft', 'pending'])
      .lt('created_at', cutoff)
      .limit(50)

    for (const order of orders || []) {
      const pendingPayment = (order.payments || []).find((p: any) => p.status === 'pending')
      if (!pendingPayment) continue // No payment = deferred, keep it

      try {
        const session = await resolveVippsSession(pendingPayment)
        // If session still active (PaymentInitiated/SessionCreated), skip
        if (session?.sessionState === 'PaymentSuccessful' || session?.sessionState === 'PaymentInitiated' || session?.sessionState === 'SessionCreated') continue

        // Session expired/terminated/not found → cancel
        await supabaseAdmin.from('payments').update({ status: 'expired' }).eq('id', pendingPayment.id)
        await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', order.id)

        // Restore inventory — mangalitsa uses preset target_weight_kg, standard uses box_size
        const preset = order.mangalitsa_preset as { target_weight_kg?: number } | null
        const kgToRestore = Number(order.box_size || preset?.target_weight_kg || 0)
        if (kgToRestore > 0) {
          const { data: inv } = await supabaseAdmin.from('inventory').select('id, kg_remaining').eq('active', true).maybeSingle()
          if (inv) {
            await supabaseAdmin.from('inventory').update({ kg_remaining: inv.kg_remaining + kgToRestore }).eq('id', inv.id)
          }
        }

        results.push({ id: order.id, scope: 'pig', action: 'cancelled', detail: order.order_number })
      } catch (err) {
        logError('cron-cancel-pig', err, { orderId: order.id })
        results.push({ id: order.id, scope: 'pig', action: 'error', detail: err instanceof Error ? err.message : 'unknown' })
      }
    }
  } catch (err) { logError('cron-cancel-pig-query', err) }

  // --- Egg: pending orders with expired Vipps sessions ---
  try {
    const { data: orders } = await supabaseAdmin
      .from('egg_orders')
      .select('id, order_number, egg_payments(id, vipps_order_id, idempotency_key, status)')
      .eq('status', 'pending')
      .lt('created_at', cutoff)
      .limit(50)

    for (const order of orders || []) {
      const pendingPayment = (order.egg_payments || []).find((p: any) => p.status === 'pending')
      if (!pendingPayment) continue // Deferred, keep

      try {
        const session = await resolveVippsSession(pendingPayment)
        if (session?.sessionState === 'PaymentSuccessful' || session?.sessionState === 'PaymentInitiated' || session?.sessionState === 'SessionCreated') continue

        await supabaseAdmin.from('egg_payments').update({ status: 'expired' }).eq('id', pendingPayment.id)
        await supabaseAdmin.from('egg_orders').update({ status: 'cancelled' }).eq('id', order.id)
        // Egg inventory is NOT allocated at checkout, so nothing to restore

        results.push({ id: order.id, scope: 'egg', action: 'cancelled', detail: order.order_number })
      } catch (err) {
        logError('cron-cancel-egg', err, { orderId: order.id })
        results.push({ id: order.id, scope: 'egg', action: 'error', detail: err instanceof Error ? err.message : 'unknown' })
      }
    }
  } catch (err) { logError('cron-cancel-egg-query', err) }

  // --- Chicken: pending orders with expired Vipps sessions ---
  try {
    const { data: orders } = await supabaseAdmin
      .from('chicken_orders')
      .select('id, order_number, hatch_id, quantity_hens, quantity_roosters, chicken_order_additions(hatch_id, quantity_hens, quantity_roosters), chicken_payments(id, vipps_order_id, idempotency_key, status)')
      .eq('status', 'pending')
      .lt('created_at', cutoff)
      .limit(50)

    for (const order of orders || []) {
      const pendingPayment = (order.chicken_payments || []).find((p: any) => p.status === 'pending')
      if (!pendingPayment) continue // Deferred, keep

      try {
        const session = await resolveVippsSession(pendingPayment)
        if (session?.sessionState === 'PaymentSuccessful' || session?.sessionState === 'PaymentInitiated' || session?.sessionState === 'SessionCreated') continue

        await supabaseAdmin.from('chicken_payments').update({ status: 'expired' }).eq('id', pendingPayment.id)
        await supabaseAdmin.from('chicken_orders').update({ status: 'cancelled' }).eq('id', order.id)

        // Restore hatch availability for main order line
        if (order.hatch_id) {
          const { data: hatch } = await supabaseAdmin.from('chicken_hatches').select('available_hens, available_roosters').eq('id', order.hatch_id).maybeSingle()
          if (hatch) {
            await supabaseAdmin.from('chicken_hatches').update({
              available_hens: Number(hatch.available_hens || 0) + Number(order.quantity_hens || 0),
              available_roosters: Number(hatch.available_roosters || 0) + Number(order.quantity_roosters || 0),
            }).eq('id', order.hatch_id)
          }
        }

        // Restore hatch availability for additions
        for (const addition of order.chicken_order_additions || []) {
          if (!addition.hatch_id) continue
          const { data: hatch } = await supabaseAdmin.from('chicken_hatches').select('available_hens, available_roosters').eq('id', addition.hatch_id).maybeSingle()
          if (hatch) {
            await supabaseAdmin.from('chicken_hatches').update({
              available_hens: Number(hatch.available_hens || 0) + Number(addition.quantity_hens || 0),
              available_roosters: Number(hatch.available_roosters || 0) + Number(addition.quantity_roosters || 0),
            }).eq('id', addition.hatch_id)
          }
        }

        results.push({ id: order.id, scope: 'chicken', action: 'cancelled', detail: order.order_number })
      } catch (err) {
        logError('cron-cancel-chicken', err, { orderId: order.id })
        results.push({ id: order.id, scope: 'chicken', action: 'error', detail: err instanceof Error ? err.message : 'unknown' })
      }
    }
  } catch (err) { logError('cron-cancel-chicken-query', err) }

  return results
}

// ─── Main handler ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = getCronAuth(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const [reconciled, cancelled] = await Promise.all([
    reconcilePendingPayments(fiveMinutesAgo),
    cancelAbandonedCheckouts(thirtyMinutesAgo),
  ])

  const reconciledCount = reconciled.filter((r) => r.action === 'reconciled').length
  const cancelledCount = cancelled.filter((r) => r.action === 'cancelled').length
  const errors = [...reconciled, ...cancelled].filter((r) => r.action === 'error').length

  if (reconciledCount > 0 || cancelledCount > 0) {
    console.log(`Payment cron: ${reconciledCount} reconciled, ${cancelledCount} abandoned cancelled, ${errors} errors`)
  }

  return NextResponse.json({
    ok: true,
    reconciled: reconciledCount,
    cancelled: cancelledCount,
    errors,
    details: { reconciled, cancelled },
  })
}
