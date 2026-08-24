// Payment-time stock reservation for pig (Mangalitsa) and chicken orders.
//
// Eggs reserve via finalizeConfirmedEggOrder; these mirror that model for the
// other two lines: stock is claimed ONLY when the deposit payment completes, so
// a failed/abandoned Vipps payment never holds stock. Both are:
//   - Idempotent: they act only while the order is still in its pre-payment
//     status (pig 'draft', chicken 'pending'). A webhook/cron retry sees the
//     already-advanced status and no-ops.
//   - Atomic: conditional UPDATEs (.gte guards) prevent overselling under
//     concurrent claims.
// They THROW when stock cannot be claimed (e.g. sold out between checkout and
// payment); the caller logs + alerts so an admin can resolve a paid-but-
// unreserved order. They never leave partial state that breaks payment status.

import { supabaseAdmin } from '@/lib/supabase/server'

/** Reserve a Mangalitsa box's kg from the active inventory. Throws if it can't. */
export async function reservePigBoxOnPayment(order: any): Promise<void> {
  if (!order || String(order.status) !== 'draft') return // already reserved/processed
  const boxKg = Number(
    order.mangalitsa_preset?.target_weight_kg ||
      order.effective_box_size ||
      order.box_size ||
      0
  )
  if (boxKg <= 0) return

  const { data: inv, error: invErr } = await supabaseAdmin
    .from('inventory')
    .select('id, kg_remaining')
    .eq('active', true)
    .maybeSingle()
  if (invErr) throw invErr
  if (!inv) throw new Error('No active pig inventory to reserve against')

  const { data: locked, error } = await supabaseAdmin
    .from('inventory')
    .update({ kg_remaining: Number(inv.kg_remaining) - boxKg })
    .eq('id', inv.id)
    .gte('kg_remaining', boxKg) // only succeeds if stock still covers the box
    .select('id')
  if (error) throw error
  if (!locked || locked.length === 0) {
    throw new Error(`Sold out: cannot reserve ${boxKg}kg for order ${order.order_number || order.id}`)
  }
}

/** Reserve hen/rooster stock across a chicken order's hatches. Throws if it can't. */
export async function reserveChickenHatchesOnPayment(order: any): Promise<void> {
  if (!order || String(order.status) !== 'pending') return // already reserved/processed

  const lines = new Map<string, { hens: number; roosters: number }>()
  const push = (hatchId: unknown, hens: unknown, roosters: unknown) => {
    const id = String(hatchId || '')
    if (!id) return
    const cur = lines.get(id) || { hens: 0, roosters: 0 }
    cur.hens += Number(hens || 0)
    cur.roosters += Number(roosters || 0)
    lines.set(id, cur)
  }
  push(order.hatch_id, order.quantity_hens, order.quantity_roosters)
  for (const a of order.chicken_order_additions || []) {
    push(a.hatch_id, a.quantity_hens, a.quantity_roosters)
  }

  for (const [hatchId, q] of Array.from(lines.entries())) {
    if (q.hens <= 0 && q.roosters <= 0) continue
    const { data: hatch, error: hatchErr } = await supabaseAdmin
      .from('chicken_hatches')
      .select('id, available_hens, available_roosters')
      .eq('id', hatchId)
      .maybeSingle()
    if (hatchErr) throw hatchErr
    if (!hatch) throw new Error(`Hatch ${hatchId} not found`)
    if (Number(hatch.available_hens) < q.hens || Number(hatch.available_roosters) < q.roosters) {
      throw new Error(`Sold out: cannot reserve ${q.hens}h/${q.roosters}r from hatch ${hatchId}`)
    }
    const { data: upd, error } = await supabaseAdmin
      .from('chicken_hatches')
      .update({
        available_hens: Number(hatch.available_hens) - q.hens,
        available_roosters: Number(hatch.available_roosters) - q.roosters,
      })
      .eq('id', hatchId)
      .gte('available_hens', q.hens)
      .gte('available_roosters', q.roosters)
      .select('id')
    if (error) throw error
    if (!upd || upd.length === 0) {
      throw new Error(`Concurrent stock change while reserving hatch ${hatchId}`)
    }
  }
}
