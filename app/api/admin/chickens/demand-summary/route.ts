import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export type ChickenDemandRow = {
  hatch_id: string
  breed_id: string
  breed_name: string
  hatch_date: string
  available_hens: number
  available_roosters: number
  demanded_hens: number
  demanded_roosters: number
  order_count: number
}

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // 1. All active hatches — always shown even if no orders yet
    const { data: hatches, error: hatchesError } = await supabaseAdmin
      .from('chicken_hatches')
      .select('id, breed_id, hatch_date, available_hens, available_roosters, chicken_breeds(name)')
      .order('hatch_date', { ascending: true })

    if (hatchesError) {
      logError('admin-chicken-demand-summary-hatches', hatchesError)
      return NextResponse.json({ error: hatchesError.message }, { status: 500 })
    }

    // 2. Active orders (main lines)
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('chicken_orders')
      .select('id, hatch_id, quantity_hens, quantity_roosters')
      .not('status', 'in', '(picked_up,cancelled,forfeited)')

    if (ordersError) {
      logError('admin-chicken-demand-summary-orders', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    // 3. Additions for active orders
    const activeOrderIds = (orders || []).map((o) => o.id)
    let additions: Array<{ chicken_order_id: string; hatch_id: string; quantity_hens: number; quantity_roosters: number }> = []
    if (activeOrderIds.length > 0) {
      const { data: addData, error: addError } = await supabaseAdmin
        .from('chicken_order_additions')
        .select('chicken_order_id, hatch_id, quantity_hens, quantity_roosters')
        .in('chicken_order_id', activeOrderIds)

      if (addError) {
        logError('admin-chicken-demand-summary-additions', addError)
        return NextResponse.json({ error: addError.message }, { status: 500 })
      }
      additions = addData || []
    }

    // 4. Aggregate demand per hatch_id
    type Demand = { hens: number; roosters: number; orderIds: Set<string> }
    const demandMap = new Map<string, Demand>()

    const addDemand = (hatchId: string, orderId: string, hens: number, roosters: number) => {
      const existing = demandMap.get(hatchId)
      if (existing) {
        existing.hens += hens
        existing.roosters += roosters
        existing.orderIds.add(orderId)
      } else {
        demandMap.set(hatchId, { hens, roosters, orderIds: new Set([orderId]) })
      }
    }

    for (const order of orders || []) {
      if (!order.hatch_id) continue
      addDemand(order.hatch_id, order.id, Number(order.quantity_hens || 0), Number(order.quantity_roosters || 0))
    }
    for (const addition of additions) {
      if (!addition.hatch_id) continue
      addDemand(addition.hatch_id, addition.chicken_order_id, Number(addition.quantity_hens || 0), Number(addition.quantity_roosters || 0))
    }

    // 5. Build one row per hatch
    const rows: ChickenDemandRow[] = (hatches || []).map((hatch) => {
      const demand = demandMap.get(hatch.id)
      const breed = hatch.chicken_breeds as any
      return {
        hatch_id: hatch.id,
        breed_id: hatch.breed_id,
        breed_name: breed?.name || hatch.breed_id,
        hatch_date: hatch.hatch_date,
        available_hens: Number(hatch.available_hens || 0),
        available_roosters: Number(hatch.available_roosters || 0),
        demanded_hens: demand?.hens ?? 0,
        demanded_roosters: demand?.roosters ?? 0,
        order_count: demand?.orderIds.size ?? 0,
      }
    })

    return NextResponse.json({ rows })
  } catch (error) {
    logError('admin-chicken-demand-summary-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
