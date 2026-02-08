import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

interface EggCheckoutRequest {
  productType?: 'eggs'
  breedId?: string
  inventoryId?: string
  quantity?: number
  items?: Array<{ breedId: string; inventoryId: string; quantity: number }>
  deliveryMethod: 'farm_pickup' | 'e6_pickup' | 'posten'
  notes?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: EggCheckoutRequest = await request.json()

    if (!body.deliveryMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const rawItems = Array.isArray(body.items) && body.items.length > 0
      ? body.items
      : body.breedId && body.inventoryId && body.quantity
        ? [{ breedId: body.breedId, inventoryId: body.inventoryId, quantity: body.quantity }]
        : []

    if (rawItems.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const items = rawItems.map((item) => ({
      breedId: item.breedId,
      inventoryId: item.inventoryId,
      quantity: Number(item.quantity),
    }))

    if (items.some((item) => !item.breedId || !item.inventoryId || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
    }

    const inventoryIds = items.map((item) => item.inventoryId)
    const { data: inventories, error: inventoryError } = await supabaseAdmin
      .from('egg_inventory')
      .select('*, egg_breeds(*)')
      .in('id', inventoryIds)

    if (inventoryError || !inventories || inventories.length !== inventoryIds.length) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 })
    }

    const inventoryMap = new Map(inventories.map((row) => [row.id, row]))

    const deliveryWeek = inventories[0]
    if (!inventories.every((row) => row.year === deliveryWeek.year && row.week_number === deliveryWeek.week_number)) {
      return NextResponse.json({ error: 'All items must be in the same delivery week' }, { status: 400 })
    }

    const requiredBaseQty = (slug: string) => (slug === 'ayam-cemani' ? 6 : 10)
    const totalEggs = items.reduce((sum, item) => sum + item.quantity, 0)
    const hasBaseQuantity = items.some((item) => {
      const inventory = inventoryMap.get(item.inventoryId)
      const slug = inventory?.egg_breeds?.slug || ''
      return item.quantity >= requiredBaseQty(slug)
    })

    if (items.length === 1) {
      const onlyItem = items[0]
      const inventory = inventoryMap.get(onlyItem.inventoryId)
      const slug = inventory?.egg_breeds?.slug || ''
      if (onlyItem.quantity < requiredBaseQty(slug)) {
        return NextResponse.json({ error: 'Below minimum order quantity' }, { status: 400 })
      }
    } else if (!hasBaseQuantity && totalEggs < 12) {
      return NextResponse.json({ error: 'Below minimum order quantity' }, { status: 400 })
    }

    for (const item of items) {
      const inventory = inventoryMap.get(item.inventoryId)
      if (!inventory) {
        return NextResponse.json({ error: 'Inventory not found' }, { status: 404 })
      }

      if (inventory.breed_id !== item.breedId) {
        return NextResponse.json({ error: 'Inventory mismatch' }, { status: 400 })
      }

      const eggsRemaining = inventory.eggs_remaining ?? (inventory.eggs_available - inventory.eggs_allocated)
      if (eggsRemaining < item.quantity) {
        return NextResponse.json({ error: 'Not enough eggs available' }, { status: 400 })
      }
    }

    const subtotal = items.reduce((sum, item) => {
      const inventory = inventoryMap.get(item.inventoryId)
      const pricePerEgg = inventory?.egg_breeds?.price_per_egg || 0
      return sum + item.quantity * pricePerEgg
    }, 0)

    const deliveryFee =
      body.deliveryMethod === 'posten'
        ? 30000
        : body.deliveryMethod === 'e6_pickup'
          ? 20000
          : 0
    const totalAmount = subtotal + deliveryFee
    const deliveryDate = new Date(new Date(deliveryWeek.delivery_monday).toISOString().split('T')[0])
    const today = new Date(new Date().toISOString().split('T')[0])
    const daysToDelivery = Math.round((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const isFullPayment = daysToDelivery <= 11
    const depositAmount = isFullPayment ? totalAmount : Math.round(subtotal / 2)
    const remainderAmount = isFullPayment ? 0 : (subtotal - depositAmount) + deliveryFee

    const deliveryMonday = deliveryWeek.delivery_monday
    const remainderDueDate = new Date(deliveryMonday)
    remainderDueDate.setDate(remainderDueDate.getDate() - 6)

    const orderNumber = `EGG${Date.now().toString().slice(-8)}`

    const primaryItem = items[0]
    const primaryInventory = inventoryMap.get(primaryItem.inventoryId)
    const primaryPricePerEgg = primaryInventory?.egg_breeds?.price_per_egg || 0

    const { data: order, error: orderError } = await supabaseAdmin
      .from('egg_orders')
      .insert({
        user_id: null,
        order_number: orderNumber,
        customer_name: body.customerName || 'Vipps kunde',
        customer_email: body.customerEmail || 'pending@vipps.no',
        customer_phone: body.customerPhone || null,
        breed_id: primaryItem.breedId,
        inventory_id: primaryItem.inventoryId,
        quantity: primaryItem.quantity,
        price_per_egg: primaryPricePerEgg,
        subtotal: primaryItem.quantity * primaryPricePerEgg,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        remainder_amount: remainderAmount,
        delivery_method: body.deliveryMethod,
        year: deliveryWeek.year,
        week_number: deliveryWeek.week_number,
        delivery_monday: deliveryWeek.delivery_monday,
        remainder_due_date: isFullPayment ? null : remainderDueDate.toISOString().split('T')[0],
        notes: body.notes || null,
        status: 'pending',
        policy_version: 'v1-2026',
      })
      .select()
      .single()

    if (orderError || !order) {
      logError('egg-checkout-order-creation', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    for (const item of items) {
      const inventory = inventoryMap.get(item.inventoryId)
      if (!inventory) continue

      const nextAllocated = (inventory.eggs_allocated || 0) + item.quantity
      const { error: updateError } = await supabaseAdmin
        .from('egg_inventory')
        .update({ eggs_allocated: nextAllocated })
        .eq('id', inventory.id)

      if (updateError) {
        logError('egg-checkout-inventory-update', updateError)
      }
    }

    const additions = items.slice(1).map((item) => {
      const inventory = inventoryMap.get(item.inventoryId)
      const pricePerEgg = inventory?.egg_breeds?.price_per_egg || 0
      return {
        egg_order_id: order.id,
        breed_id: item.breedId,
        inventory_id: item.inventoryId,
        quantity: item.quantity,
        price_per_egg: pricePerEgg,
        subtotal: item.quantity * pricePerEgg,
      }
    })

    if (additions.length > 0) {
      const { error: additionsError } = await supabaseAdmin
        .from('egg_order_additions')
        .insert(additions)

      if (additionsError) {
        logError('egg-checkout-additions-insert', additionsError)
      }
    }

    return NextResponse.json({ success: true, orderId: order.id, orderNumber: order.order_number })
  } catch (error) {
    logError('egg-checkout-main', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to process checkout'
    return NextResponse.json({ error: 'Failed to process checkout', details: errorMessage }, { status: 500 })
  }
}
