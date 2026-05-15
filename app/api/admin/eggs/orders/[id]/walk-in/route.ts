import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

function toNonNegativeInt(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed)
}

async function fetchOrderWithRelations(orderId: string) {
  return supabaseAdmin
    .from('egg_orders')
    .select('*, egg_breeds(*), egg_inventory(*), egg_payments(*), egg_order_additions(*, egg_breeds(*), egg_inventory(*))')
    .eq('id', orderId)
    .maybeSingle()
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()

    const inventoryId = typeof body.inventoryId === 'string' ? body.inventoryId.trim() : null
    if (!inventoryId) {
      return NextResponse.json({ error: 'inventoryId is required' }, { status: 400 })
    }

    const quantity = toNonNegativeInt(body.quantity)
    if (quantity === null || quantity <= 0) {
      return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 })
    }

    const pricePerEgg = toNonNegativeInt(body.pricePerEgg)
    if (pricePerEgg === null || pricePerEgg <= 0) {
      return NextResponse.json({ error: 'pricePerEgg must be a positive integer (øre)' }, { status: 400 })
    }

    const adminNote = typeof body.adminNote === 'string' ? body.adminNote.trim() : ''

    // Load the order
    const { data: order, error: orderError } = await fetchOrderWithRelations(params.id)
    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (['cancelled', 'forfeited'].includes(String(order.status || ''))) {
      return NextResponse.json({ error: 'Cannot modify a cancelled or forfeited order' }, { status: 400 })
    }

    // Load inventory — bypass cutoff/status checks since this is a walk-in
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('egg_inventory')
      .select('id, breed_id, eggs_available, eggs_allocated, status')
      .eq('id', inventoryId)
      .maybeSingle()

    if (inventoryError || !inventory) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 })
    }

    const freeEggs = (inventory.eggs_available || 0) - (inventory.eggs_allocated || 0)
    if (freeEggs < quantity) {
      return NextResponse.json(
        {
          error: `Not enough eggs available: need ${quantity}, have ${freeEggs} free (${inventory.eggs_available} available, ${inventory.eggs_allocated} allocated)`,
        },
        { status: 400 }
      )
    }

    const subtotal = quantity * pricePerEgg

    // Insert addition row
    const { data: insertedAddition, error: insertError } = await supabaseAdmin
      .from('egg_order_additions')
      .insert({
        egg_order_id: order.id,
        inventory_id: inventoryId,
        breed_id: inventory.breed_id,
        quantity,
        price_per_egg: pricePerEgg,
        subtotal,
      })
      .select('id')
      .single()

    if (insertError) {
      logError('walk-in-addition-insert', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Deduct from inventory: eggs_allocated += quantity
    const nextAllocated = (inventory.eggs_allocated || 0) + quantity
    const remainingAfter = (inventory.eggs_available || 0) - nextAllocated
    const nextStatus = remainingAfter <= 0 ? 'sold_out' : inventory.status === 'sold_out' ? 'open' : inventory.status

    const { error: inventoryUpdateError } = await supabaseAdmin
      .from('egg_inventory')
      .update({ eggs_allocated: nextAllocated, status: nextStatus })
      .eq('id', inventoryId)

    if (inventoryUpdateError) {
      logError('walk-in-addition-inventory-update', inventoryUpdateError)
      // Rollback the addition
      await supabaseAdmin.from('egg_order_additions').delete().eq('id', insertedAddition.id)
      return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 })
    }

    // Reload order to recalculate totals
    const { data: updatedOrder, error: refetchError } = await fetchOrderWithRelations(order.id)
    if (refetchError || !updatedOrder) {
      return NextResponse.json({ error: 'Failed to reload order for recalculation' }, { status: 500 })
    }

    const baseSubtotal = Number(updatedOrder.subtotal || 0)
    const additionsTotal = ((updatedOrder.egg_order_additions as Array<any> | null) || []).reduce(
      (sum: number, row: any) => sum + Number(row?.subtotal || 0),
      0
    )
    const deliveryFee = Number(updatedOrder.delivery_fee || 0)
    const nextTotal = baseSubtotal + additionsTotal + deliveryFee
    const depositAmount = Number(updatedOrder.deposit_amount || 0)
    const nextRemainder = Math.max(0, nextTotal - depositAmount)

    // Append admin note
    const noteEntry = `[${new Date().toISOString().slice(0, 16)}] Walk-in addition: ${quantity} eggs @ kr ${Math.round(pricePerEgg / 100)} — ${adminNote || 'No note'}`
    const newNotes = [updatedOrder.admin_notes || '', noteEntry].filter(Boolean).join('\n')

    const { error: finalError } = await supabaseAdmin
      .from('egg_orders')
      .update({
        total_amount: nextTotal,
        remainder_amount: nextRemainder,
        admin_notes: newNotes,
      })
      .eq('id', order.id)

    if (finalError) {
      logError('walk-in-addition-final-update', finalError)
      return NextResponse.json({ error: 'Failed to recalculate order totals' }, { status: 500 })
    }

    const { data: finalOrder, error: finalOrderError } = await fetchOrderWithRelations(order.id)
    if (finalOrderError || !finalOrder) {
      return NextResponse.json({ error: 'Order updated but could not be reloaded' }, { status: 500 })
    }

    return NextResponse.json({ success: true, order: finalOrder })
  } catch (error) {
    logError('walk-in-addition-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
