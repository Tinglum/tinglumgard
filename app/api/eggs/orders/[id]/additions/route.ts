import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

interface AdditionInput {
  inventoryId: string
  quantity: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const additions: AdditionInput[] = Array.isArray(body?.additions)
      ? body.additions.filter((item: AdditionInput) => item && item.quantity > 0)
      : []

    const { data: order, error: orderError } = await supabaseAdmin
      .from('egg_orders')
      .select('id, status, order_number, inventory_id, quantity, subtotal, delivery_fee, total_amount, deposit_amount, remainder_amount, year, week_number, delivery_monday')
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!['fully_paid', 'preparing'].includes(order.status)) {
      return NextResponse.json({ error: 'Order is not eligible for additions' }, { status: 400 })
    }

    const now = new Date()
    const deliveryMondayLocal = new Date(`${order.delivery_monday}T00:00:00`)
    if (now >= deliveryMondayLocal) {
      return NextResponse.json({ error: 'Additions are closed for this delivery week' }, { status: 400 })
    }

    const dayBeforeStart = new Date(deliveryMondayLocal)
    dayBeforeStart.setDate(dayBeforeStart.getDate() - 1)
    const discountEligible = now >= dayBeforeStart && now < deliveryMondayLocal
    const discountMultiplier = discountEligible ? 0.7 : 1

    const { data: remainderPayments } = await supabaseAdmin
      .from('egg_payments')
      .select('amount_nok, status')
      .eq('egg_order_id', order.id)
      .eq('payment_type', 'remainder')
      .eq('status', 'completed')

    const remainderPaidOre =
      (remainderPayments || []).reduce((sum, p: any) => sum + (p.amount_nok || 0) * 100, 0) || 0

    const { data: existingAdditions, error: existingError } = await supabaseAdmin
      .from('egg_order_additions')
      .select('id, inventory_id, quantity, subtotal')
      .eq('egg_order_id', order.id)

    if (existingError) {
      logError('egg-additions-existing-fetch', existingError)
      return NextResponse.json({ error: 'Failed to load existing additions' }, { status: 500 })
    }

    const existingMap = new Map<string, { quantity: number; subtotal: number }>()
    for (const row of existingAdditions || []) {
      existingMap.set(row.inventory_id, { quantity: row.quantity, subtotal: row.subtotal })
    }

    if (order.status === 'fully_paid') {
      for (const inventoryId of Array.from(existingMap.keys())) {
        const existing = existingMap.get(inventoryId)
        if (!existing) continue
        const nextQty = additions.find((item) => item.inventoryId === inventoryId)?.quantity || 0
        if (nextQty < existing.quantity) {
          return NextResponse.json(
            { error: 'Paid orders can only add eggs, not remove them' },
            { status: 400 }
          )
        }
      }
    }

    const inventoryIds = Array.from(
      new Set([
        ...additions.map((item) => item.inventoryId),
        ...Array.from(existingMap.keys()),
      ])
    )

    if (inventoryIds.length === 0) {
      const existingTotal = (existingAdditions || []).reduce((sum, row) => sum + row.subtotal, 0)
      const baseTotal = order.total_amount - existingTotal
      const nextRemainder = Math.max(0, baseTotal - order.deposit_amount)

      await supabaseAdmin.from('egg_order_additions').delete().eq('egg_order_id', order.id)
      const nextStatus = remainderPaidOre >= nextRemainder ? 'fully_paid' : 'deposit_paid'
      await supabaseAdmin
        .from('egg_orders')
        .update({ total_amount: baseTotal, remainder_amount: nextRemainder, status: nextStatus })
        .eq('id', order.id)

      return NextResponse.json({ success: true, additions: [] })
    }

    const { data: inventories, error: inventoryError } = await supabaseAdmin
      .from('egg_inventory')
      .select(`
        id,
        breed_id,
        year,
        week_number,
        eggs_available,
        eggs_allocated,
        status,
        egg_breeds (
          id,
          name,
          price_per_egg
        )
      `)
      .in('id', inventoryIds)

    if (inventoryError) {
      logError('egg-additions-inventory-fetch', inventoryError)
      return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 })
    }

    const inventoryMap = new Map<string, any>()
    for (const row of inventories || []) {
      inventoryMap.set(row.id, row)
    }

    for (const addition of additions) {
      const inventory = inventoryMap.get(addition.inventoryId)
      if (!inventory) {
        return NextResponse.json({ error: 'Invalid inventory selection' }, { status: 400 })
      }

      if (inventory.year !== order.year || inventory.week_number !== order.week_number) {
        return NextResponse.json({ error: 'Additions must match delivery week' }, { status: 400 })
      }

      if (!['open', 'sold_out'].includes(inventory.status)) {
        return NextResponse.json({ error: 'Week is closed for additions' }, { status: 400 })
      }

      const existingQty = existingMap.get(addition.inventoryId)?.quantity || 0
      const available = (inventory.eggs_available - inventory.eggs_allocated) + existingQty

      if (addition.quantity > available) {
        return NextResponse.json({ error: 'Not enough eggs available for additions' }, { status: 400 })
      }
    }

    for (const inventoryId of Array.from(inventoryMap.keys())) {
      const inventory = inventoryMap.get(inventoryId)
      if (!inventory) continue

      const existingQty = existingMap.get(inventoryId)?.quantity || 0
      const nextQty = additions.find((item) => item.inventoryId === inventoryId)?.quantity || 0
      const delta = nextQty - existingQty

      if (delta !== 0) {
        const nextAllocated = Math.max(0, (inventory.eggs_allocated || 0) + delta)
        const remainingAfter = inventory.eggs_available - nextAllocated
        let nextStatus = inventory.status
        if (remainingAfter <= 0) {
          nextStatus = 'sold_out'
        } else if (inventory.status === 'sold_out') {
          nextStatus = 'open'
        }

        const { error: updateError } = await supabaseAdmin
          .from('egg_inventory')
          .update({ eggs_allocated: nextAllocated, status: nextStatus })
          .eq('id', inventoryId)

        if (updateError) {
          logError('egg-additions-inventory-update', updateError)
          return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 })
        }
      }
    }

    await supabaseAdmin.from('egg_order_additions').delete().eq('egg_order_id', order.id)

    const additionsPayload = additions.map((item) => {
      const inventory = inventoryMap.get(item.inventoryId)
      const basePrice = inventory?.egg_breeds?.price_per_egg || 0
      const pricePerEgg = Math.round(basePrice * discountMultiplier)
      return {
        egg_order_id: order.id,
        breed_id: inventory.breed_id,
        inventory_id: item.inventoryId,
        quantity: item.quantity,
        price_per_egg: pricePerEgg,
        subtotal: item.quantity * pricePerEgg,
      }
    })

    if (additionsPayload.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('egg_order_additions')
        .insert(additionsPayload)

      if (insertError) {
        logError('egg-additions-insert', insertError)
        return NextResponse.json({ error: 'Failed to save additions' }, { status: 500 })
      }
    }

    const existingTotal = (existingAdditions || []).reduce((sum, row) => sum + row.subtotal, 0)
    const baseTotal = order.total_amount - existingTotal
    const newAdditionsTotal = additionsPayload.reduce((sum, row) => sum + row.subtotal, 0)
    const nextTotal = baseTotal + newAdditionsTotal
    const nextRemainder = Math.max(0, nextTotal - order.deposit_amount)

    const nextStatus = remainderPaidOre >= nextRemainder ? 'fully_paid' : 'deposit_paid'
    const { error: orderUpdateError } = await supabaseAdmin
      .from('egg_orders')
      .update({ total_amount: nextTotal, remainder_amount: nextRemainder, status: nextStatus })
      .eq('id', order.id)

    if (orderUpdateError) {
      logError('egg-additions-order-update', orderUpdateError)
      return NextResponse.json({ error: 'Failed to update order totals' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      additions: additionsPayload,
      totals: {
        total_amount: nextTotal,
        remainder_amount: nextRemainder,
      },
    })
  } catch (error) {
    logError('egg-additions-main', error)
    return NextResponse.json({ error: 'Failed to save additions' }, { status: 500 })
  }
}
