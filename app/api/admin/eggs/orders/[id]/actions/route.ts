import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { initiateVippsRefund } from '@/lib/vipps/refund'
import { logError } from '@/lib/logger'

interface EggOrderAddition {
  id: string
  breed_id: string
  inventory_id: string
  quantity: number
}

async function releaseInventory(inventoryId: string, quantity: number) {
  const { data: inventory, error } = await supabaseAdmin
    .from('egg_inventory')
    .select('eggs_allocated, eggs_available, status')
    .eq('id', inventoryId)
    .single()

  if (error || !inventory) {
    logError('admin-egg-inventory-release-fetch', error)
    return
  }

  const nextAllocated = Math.max(0, (inventory.eggs_allocated || 0) - quantity)
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
    logError('admin-egg-inventory-release-update', updateError)
  }
}

async function allocateInventory(inventoryId: string, quantity: number) {
  const { data: inventory, error } = await supabaseAdmin
    .from('egg_inventory')
    .select('eggs_allocated, eggs_available, status')
    .eq('id', inventoryId)
    .single()

  if (error || !inventory) {
    throw new Error('Inventory not found')
  }

  const remaining = inventory.eggs_available - (inventory.eggs_allocated || 0)
  if (remaining < quantity) {
    throw new Error('Not enough inventory available')
  }

  const nextAllocated = (inventory.eggs_allocated || 0) + quantity
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
    throw updateError
  }
}

async function appendAdminNote(orderId: string, existingNotes: string | null, note: string) {
  const nextNotes = [existingNotes, note].filter(Boolean).join('\n')
  await supabaseAdmin
    .from('egg_orders')
    .update({ admin_notes: nextNotes })
    .eq('id', orderId)
}

async function refundDeposit(orderId: string, reason: string | undefined) {
  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, admin_notes, egg_payments(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const depositPayment = order.egg_payments?.find((p: any) => p.payment_type === 'deposit')

  if (depositPayment?.status === 'refunded') {
    return NextResponse.json({ error: 'Deposit already refunded' }, { status: 400 })
  }

  if (!depositPayment || depositPayment.status !== 'completed' || !depositPayment.vipps_order_id) {
    return NextResponse.json({ error: 'No completed deposit payment found' }, { status: 400 })
  }

  const refundResult = await initiateVippsRefund(
    depositPayment.vipps_order_id,
    depositPayment.amount_nok,
    `Refund deposit for egg order ${order.order_number}`
  )

  if (!refundResult.success) {
    return NextResponse.json({ error: refundResult.error || 'Vipps refund failed' }, { status: 500 })
  }

  await supabaseAdmin
    .from('egg_payments')
    .update({ status: 'refunded' })
    .eq('id', depositPayment.id)

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: refunded deposit${reason ? ` - ${reason}` : ''}`
  )

  return NextResponse.json({ success: true })
}

async function cancelEggOrder(orderId: string, reason: string | undefined, releaseStock: boolean) {
  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, admin_notes, inventory_id, quantity, egg_order_additions(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (releaseStock) {
    await releaseInventory(order.inventory_id, order.quantity)
    for (const addition of order.egg_order_additions || []) {
      await releaseInventory(addition.inventory_id, addition.quantity)
    }
  }

  await supabaseAdmin
    .from('egg_orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: cancelled${reason ? ` - ${reason}` : ''}${releaseStock ? '' : ' (inventory kept)'}`
  )

  return NextResponse.json({ success: true })
}

async function moveEggOrder(orderId: string, year: number, weekNumber: number, reason: string | undefined) {
  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, admin_notes, breed_id, inventory_id, quantity, egg_order_additions(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const { data: targetInventory, error: targetError } = await supabaseAdmin
    .from('egg_inventory')
    .select('id, eggs_available, eggs_allocated, delivery_monday, year, week_number')
    .eq('breed_id', order.breed_id)
    .eq('year', year)
    .eq('week_number', weekNumber)
    .maybeSingle()

  if (targetError || !targetInventory) {
    return NextResponse.json({ error: 'Target week not found for this breed' }, { status: 404 })
  }

  const additions: EggOrderAddition[] = order.egg_order_additions || []
  const targetByAdditionId = new Map<string, { id: string; quantity: number }>()
  const requiredByInventory = new Map<string, number>()

  requiredByInventory.set(
    targetInventory.id,
    (requiredByInventory.get(targetInventory.id) || 0) + order.quantity
  )

  for (const addition of additions) {
    const { data: additionInventory } = await supabaseAdmin
      .from('egg_inventory')
      .select('id, eggs_available, eggs_allocated')
      .eq('breed_id', addition.breed_id)
      .eq('year', year)
      .eq('week_number', weekNumber)
      .maybeSingle()

    if (!additionInventory) {
      return NextResponse.json({ error: 'Target week missing for additions' }, { status: 400 })
    }

    targetByAdditionId.set(addition.id, { id: additionInventory.id, quantity: addition.quantity })
    requiredByInventory.set(
      additionInventory.id,
      (requiredByInventory.get(additionInventory.id) || 0) + addition.quantity
    )
  }

  for (const [inventoryId, requiredQty] of Array.from(requiredByInventory.entries())) {
    const { data: inventory } = await supabaseAdmin
      .from('egg_inventory')
      .select('eggs_available, eggs_allocated')
      .eq('id', inventoryId)
      .single()

    if (!inventory) {
      return NextResponse.json({ error: 'Target inventory missing' }, { status: 400 })
    }

    const remaining = inventory.eggs_available - (inventory.eggs_allocated || 0)
    if (remaining < requiredQty) {
      return NextResponse.json({ error: 'Not enough inventory for move' }, { status: 400 })
    }
  }

  for (const [inventoryId, requiredQty] of Array.from(requiredByInventory.entries())) {
    await allocateInventory(inventoryId, requiredQty)
  }

  await releaseInventory(order.inventory_id, order.quantity)

  for (const addition of additions) {
    const target = targetByAdditionId.get(addition.id)
    if (!target) continue

    await releaseInventory(addition.inventory_id, addition.quantity)

    await supabaseAdmin
      .from('egg_order_additions')
      .update({ inventory_id: target.id })
      .eq('id', addition.id)
  }

  await supabaseAdmin
    .from('egg_orders')
    .update({
      inventory_id: targetInventory.id,
      week_number: targetInventory.week_number,
      year: targetInventory.year,
      delivery_monday: targetInventory.delivery_monday,
    })
    .eq('id', orderId)

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: moved to week ${weekNumber}/${year}${reason ? ` - ${reason}` : ''}`
  )

  return NextResponse.json({ success: true })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'refund_deposit':
        return await refundDeposit(params.id, data?.reason)
      case 'cancel_order':
        return await cancelEggOrder(params.id, data?.reason, data?.releaseInventory ?? true)
      case 'cancel_and_refund':
        {
          const refundResponse = await refundDeposit(params.id, data?.reason)
          if (!refundResponse.ok) {
            return refundResponse
          }
          return await cancelEggOrder(params.id, data?.reason, data?.releaseInventory ?? true)
        }
      case 'move_week':
        return await moveEggOrder(params.id, data?.year, data?.weekNumber, data?.reason)
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    logError('admin-egg-actions', error)
    return NextResponse.json({ error: 'Failed to update egg order' }, { status: 500 })
  }
}
