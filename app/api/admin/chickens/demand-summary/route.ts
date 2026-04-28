import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export type ChickenDemandRow = {
  hatch_id: string
  breed_id: string
  breed_name: string
  age_weeks: number | null
  total_hens: number
  total_roosters: number
  order_count: number
}

const TERMINAL_STATUSES = ['picked_up', 'cancelled', 'forfeited']

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Fetch all active orders (main lines)
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('chicken_orders')
      .select('id, hatch_id, breed_id, age_weeks_at_pickup, quantity_hens, quantity_roosters, chicken_breeds(name)')
      .not('status', 'in', `(${TERMINAL_STATUSES.map((s) => `"${s}"`).join(',')})`)

    if (ordersError) {
      logError('admin-chicken-demand-summary-orders', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    // Fetch all active additions
    const { data: additions, error: additionsError } = await supabaseAdmin
      .from('chicken_order_additions')
      .select('id, order_id, hatch_id, breed_id, age_weeks_at_pickup, quantity_hens, quantity_roosters, chicken_breeds(name), chicken_orders!inner(status)')
      .not('chicken_orders.status', 'in', `(${TERMINAL_STATUSES.map((s) => `"${s}"`).join(',')})`)

    if (additionsError) {
      logError('admin-chicken-demand-summary-additions', additionsError)
      return NextResponse.json({ error: additionsError.message }, { status: 500 })
    }

    // Aggregate by hatch_id + breed_id + age_weeks
    type Key = string
    type Entry = {
      hatch_id: string
      breed_id: string
      breed_name: string
      age_weeks: number | null
      total_hens: number
      total_roosters: number
      order_ids: Set<string>
    }

    const map = new Map<Key, Entry>()

    const upsert = (
      hatchId: string,
      breedId: string,
      breedName: string,
      ageWeeks: number | null,
      hens: number,
      roosters: number,
      orderId: string
    ) => {
      const key = `${hatchId}__${breedId}__${ageWeeks ?? 'null'}`
      const existing = map.get(key)
      if (existing) {
        existing.total_hens += hens
        existing.total_roosters += roosters
        existing.order_ids.add(orderId)
      } else {
        map.set(key, {
          hatch_id: hatchId,
          breed_id: breedId,
          breed_name: breedName,
          age_weeks: ageWeeks,
          total_hens: hens,
          total_roosters: roosters,
          order_ids: new Set([orderId]),
        })
      }
    }

    for (const order of orders || []) {
      if (!order.hatch_id || !order.breed_id) continue
      upsert(
        order.hatch_id,
        order.breed_id,
        (order.chicken_breeds as any)?.name || order.breed_id,
        order.age_weeks_at_pickup ?? null,
        Number(order.quantity_hens || 0),
        Number(order.quantity_roosters || 0),
        order.id
      )
    }

    for (const addition of additions || []) {
      if (!addition.hatch_id || !addition.breed_id) continue
      upsert(
        addition.hatch_id,
        addition.breed_id,
        (addition.chicken_breeds as any)?.name || addition.breed_id,
        addition.age_weeks_at_pickup ?? null,
        Number(addition.quantity_hens || 0),
        Number(addition.quantity_roosters || 0),
        addition.order_id
      )
    }

    const rows: ChickenDemandRow[] = Array.from(map.values())
      .map((entry) => ({
        hatch_id: entry.hatch_id,
        breed_id: entry.breed_id,
        breed_name: entry.breed_name,
        age_weeks: entry.age_weeks,
        total_hens: entry.total_hens,
        total_roosters: entry.total_roosters,
        order_count: entry.order_ids.size,
      }))
      .sort((a, b) => {
        const nameCompare = a.breed_name.localeCompare(b.breed_name)
        if (nameCompare !== 0) return nameCompare
        return (a.age_weeks ?? 0) - (b.age_weeks ?? 0)
      })

    return NextResponse.json({ rows })
  } catch (error) {
    logError('admin-chicken-demand-summary-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
