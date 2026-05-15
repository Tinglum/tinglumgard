import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

type OrderStatus = 'pending' | 'deposit_paid' | 'fully_paid' | 'shipped' | string

function isoWeekLabel(year: number, week: number): string {
  return `Uke ${week} (${year})`
}

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // 1. Fetch all egg inventory rows with breed info
    const { data: inventoryRows, error: inventoryError } = await supabaseAdmin
      .from('egg_inventory')
      .select('id, breed_id, year, week_number, delivery_monday, eggs_available, eggs_allocated, egg_breeds(name)')
      .order('year', { ascending: true })
      .order('week_number', { ascending: true })

    if (inventoryError) {
      logError('admin-eggs-demand-summary-inventory', inventoryError)
      return NextResponse.json({ error: inventoryError.message }, { status: 500 })
    }

    // 2. Fetch all active egg orders with payments
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('egg_orders')
      .select('id, inventory_id, status, remainder_due_date, remainder_amount, egg_payments(*)')
      .not('status', 'in', '(cancelled,forfeited,delivered)')

    if (ordersError) {
      logError('admin-eggs-demand-summary-orders', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    // 3. Build lookup: inventoryId -> orders
    type OrderEntry = {
      id: string
      status: OrderStatus
      remainder_due_date: string | null
      remainder_amount: number
      egg_payments: Array<{ payment_type: string; status: string; amount_nok: number }> | null
    }

    const ordersByInventory = new Map<string, OrderEntry[]>()
    for (const order of orders || []) {
      const existing = ordersByInventory.get(order.inventory_id) || []
      existing.push(order as OrderEntry)
      ordersByInventory.set(order.inventory_id, existing)
    }

    // 4. Group inventory by year+week
    type WeekKey = `${number}-${number}`
    type WeekAccum = {
      weekLabel: string
      year: number
      weekNumber: number
      deliveryMonday: string
      breeds: Map<string, {
        breedName: string
        eggsAvailable: number
        eggsAllocated: number
        inventoryIds: string[]
      }>
    }

    const weekMap = new Map<WeekKey, WeekAccum>()

    for (const inv of inventoryRows || []) {
      const year = Number(inv.year || 0)
      const week = Number(inv.week_number || 0)
      const key: WeekKey = `${year}-${week}`
      const breed = inv.egg_breeds as any
      const breedName: string = breed?.name || inv.breed_id

      if (!weekMap.has(key)) {
        weekMap.set(key, {
          weekLabel: isoWeekLabel(year, week),
          year,
          weekNumber: week,
          deliveryMonday: String(inv.delivery_monday || ''),
          breeds: new Map(),
        })
      }

      const weekEntry = weekMap.get(key)!

      const existing = weekEntry.breeds.get(breedName)
      if (existing) {
        existing.eggsAvailable += Number(inv.eggs_available || 0)
        existing.eggsAllocated += Number(inv.eggs_allocated || 0)
        existing.inventoryIds.push(inv.id)
      } else {
        weekEntry.breeds.set(breedName, {
          breedName,
          eggsAvailable: Number(inv.eggs_available || 0),
          eggsAllocated: Number(inv.eggs_allocated || 0),
          inventoryIds: [inv.id],
        })
      }
    }

    // 5. Compute per-breed order statistics
    const today = new Date(new Date().toISOString().split('T')[0])

    let totalActiveOrders = 0
    let totalOutstandingOre = 0
    let atRiskOrders = 0

    const byWeek = Array.from(weekMap.values())
      .sort((a, b) => a.year === b.year ? a.weekNumber - b.weekNumber : a.year - b.year)
      .map((week) => {
        let weekTotalEggs = 0
        let weekTotalOrders = 0
        let weekFullyPaid = 0
        let weekOutstandingOre = 0

        const breeds = Array.from(week.breeds.values()).map((breed) => {
          // Gather orders for all inventory rows of this breed this week
          const breedOrders: OrderEntry[] = []
          for (const invId of breed.inventoryIds) {
            const invOrders = ordersByInventory.get(invId) || []
            breedOrders.push(...invOrders)
          }

          const ordersByStatus: Record<string, number> = {
            pending: 0,
            deposit_paid: 0,
            fully_paid: 0,
            shipped: 0,
          }
          let breedOutstandingOre = 0

          for (const order of breedOrders) {
            const s = order.status
            if (s in ordersByStatus) {
              ordersByStatus[s] += 1
            }

            // Outstanding remainder
            const remainderPaidOre = ((order.egg_payments || []) as any[])
              .filter((p) => p.payment_type === 'remainder' && p.status === 'completed')
              .reduce((sum: number, p: any) => sum + (p.amount_nok || 0) * 100, 0)
            const amountDueOre = Math.max(0, (order.remainder_amount || 0) - remainderPaidOre)
            breedOutstandingOre += amountDueOre

            // At-risk: deposit_paid with due date within 3 days
            if (order.status === 'deposit_paid' && order.remainder_due_date && amountDueOre > 0) {
              const dueDate = new Date(order.remainder_due_date)
              const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              if (diffDays <= 3) {
                atRiskOrders += 1
              }
            }
          }

          weekTotalEggs += breed.eggsAvailable
          weekTotalOrders += breedOrders.length
          weekFullyPaid += ordersByStatus.fully_paid
          weekOutstandingOre += breedOutstandingOre
          totalActiveOrders += breedOrders.length
          totalOutstandingOre += breedOutstandingOre

          return {
            breedName: breed.breedName,
            eggsAvailable: breed.eggsAvailable,
            eggsAllocated: breed.eggsAllocated,
            eggsRemaining: Math.max(0, breed.eggsAvailable - breed.eggsAllocated),
            ordersTotal: breedOrders.length,
            ordersByStatus,
          }
        })

        return {
          weekLabel: week.weekLabel,
          year: week.year,
          weekNumber: week.weekNumber,
          deliveryMonday: week.deliveryMonday,
          breeds,
          totalEggs: weekTotalEggs,
          totalOrders: weekTotalOrders,
          fullyPaidOrders: weekFullyPaid,
          outstandingRemainderOre: weekOutstandingOre,
        }
      })

    return NextResponse.json({
      byWeek,
      summary: {
        totalActiveOrders,
        totalOutstandingOre,
        atRiskOrders,
      },
    })
  } catch (error) {
    logError('admin-eggs-demand-summary-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
