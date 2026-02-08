import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

interface EggCheckoutRequest {
  productType?: 'eggs'
  breedId: string
  inventoryId: string
  quantity: number
  deliveryMethod: 'farm_pickup' | 'e6_pickup' | 'posten'
  notes?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: EggCheckoutRequest = await request.json()

    if (!body.breedId || !body.inventoryId || !body.quantity || !body.deliveryMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const quantity = Number(body.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
    }

    const { data: breed, error: breedError } = await supabaseAdmin
      .from('egg_breeds')
      .select('*')
      .eq('id', body.breedId)
      .eq('active', true)
      .single()

    if (breedError || !breed) {
      return NextResponse.json({ error: 'Breed not found' }, { status: 404 })
    }

    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('egg_inventory')
      .select('*')
      .eq('id', body.inventoryId)
      .single()

    if (inventoryError || !inventory) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 })
    }

    if (inventory.breed_id !== body.breedId) {
      return NextResponse.json({ error: 'Inventory mismatch' }, { status: 400 })
    }

    const eggsRemaining = inventory.eggs_remaining ?? (inventory.eggs_available - inventory.eggs_allocated)
    if (eggsRemaining < quantity) {
      return NextResponse.json({ error: 'Not enough eggs available' }, { status: 400 })
    }

    if (quantity < breed.min_order_quantity) {
      return NextResponse.json({ error: 'Below minimum order quantity' }, { status: 400 })
    }

    const subtotal = quantity * breed.price_per_egg
    const deliveryFee =
      body.deliveryMethod === 'posten'
        ? 30000
        : body.deliveryMethod === 'e6_pickup'
          ? 20000
          : 0
    const totalAmount = subtotal + deliveryFee
    const depositAmount = Math.round(subtotal / 2)
    const remainderAmount = (subtotal - depositAmount) + deliveryFee

    const deliveryMonday = inventory.delivery_monday
    const remainderDueDate = new Date(deliveryMonday)
    remainderDueDate.setDate(remainderDueDate.getDate() - 6)

    const orderNumber = `EGG${Date.now().toString().slice(-8)}`

    const { data: order, error: orderError } = await supabaseAdmin
      .from('egg_orders')
      .insert({
        user_id: null,
        order_number: orderNumber,
        customer_name: body.customerName || 'Vipps kunde',
        customer_email: body.customerEmail || 'pending@vipps.no',
        customer_phone: body.customerPhone || null,
        breed_id: body.breedId,
        inventory_id: body.inventoryId,
        quantity,
        price_per_egg: breed.price_per_egg,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        remainder_amount: remainderAmount,
        delivery_method: body.deliveryMethod,
        year: inventory.year,
        week_number: inventory.week_number,
        delivery_monday: inventory.delivery_monday,
        remainder_due_date: remainderDueDate.toISOString().split('T')[0],
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

    const nextAllocated = (inventory.eggs_allocated || 0) + quantity
    const { error: updateError } = await supabaseAdmin
      .from('egg_inventory')
      .update({ eggs_allocated: nextAllocated })
      .eq('id', inventory.id)

    if (updateError) {
      logError('egg-checkout-inventory-update', updateError)
    }

    return NextResponse.json({ success: true, orderId: order.id, orderNumber: order.order_number })
  } catch (error) {
    logError('egg-checkout-main', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to process checkout'
    return NextResponse.json({ error: 'Failed to process checkout', details: errorMessage }, { status: 500 })
  }
}
