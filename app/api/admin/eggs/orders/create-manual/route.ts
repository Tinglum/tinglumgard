import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

/**
 * POST /api/admin/eggs/orders/create-manual
 *
 * Creates a walk-in / admin-generated egg order for an existing customer.
 * Bypasses checkout restrictions (cutoff dates, minimum quantities, inventory status).
 *
 * Walk-in model:
 *   - deposit_amount = 0  (no deposit collected)
 *   - remainder_amount = total_amount  (full price owed)
 *   - status = 'deposit_paid' means remainder link is live (egg orders have no separate enable flag)
 *   - status = 'deposit_paid'  (deposit phase satisfied since deposit = 0)
 *
 * Amounts are in øre throughout.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()

    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : ''
    const customerEmail = typeof body.customerEmail === 'string' ? body.customerEmail.trim().toLowerCase() : ''
    const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim() || null : null
    const inventoryId = typeof body.inventoryId === 'string' ? body.inventoryId.trim() : ''
    const quantity = Number(body.quantity)
    const deliveryMethod = typeof body.deliveryMethod === 'string' ? body.deliveryMethod.trim() : 'farm_pickup'
    const adminNote = typeof body.adminNote === 'string' ? body.adminNote.trim() : ''
    const pricePerEggOverrideOre = body.pricePerEggOre != null ? Number(body.pricePerEggOre) : null

    if (!customerName) {
      return NextResponse.json({ error: 'customerName is required' }, { status: 400 })
    }
    if (!customerEmail) {
      return NextResponse.json({ error: 'customerEmail is required' }, { status: 400 })
    }
    if (!inventoryId) {
      return NextResponse.json({ error: 'inventoryId is required' }, { status: 400 })
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 })
    }

    // Load inventory + breed — bypass status/cutoff checks intentionally
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('egg_inventory')
      .select('id, breed_id, year, week_number, delivery_monday, eggs_available, eggs_allocated, egg_breeds(id, name, price_per_egg)')
      .eq('id', inventoryId)
      .maybeSingle()

    if (inventoryError || !inventory) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 })
    }

    const freeEggs = (inventory.eggs_available || 0) - (inventory.eggs_allocated || 0)
    if (freeEggs < quantity) {
      return NextResponse.json(
        { error: `Not enough eggs: need ${quantity}, only ${freeEggs} free (${inventory.eggs_available} available, ${inventory.eggs_allocated} allocated)` },
        { status: 400 }
      )
    }

    const breed = Array.isArray(inventory.egg_breeds) ? inventory.egg_breeds[0] : inventory.egg_breeds
    const breedPriceOre = Number((breed as any)?.price_per_egg || 0)
    const pricePerEggOre =
      pricePerEggOverrideOre != null && Number.isFinite(pricePerEggOverrideOre) && pricePerEggOverrideOre > 0
        ? Math.round(pricePerEggOverrideOre)
        : breedPriceOre

    if (pricePerEggOre <= 0) {
      return NextResponse.json({ error: 'Could not determine price per egg — provide pricePerEggOre' }, { status: 400 })
    }

    const deliveryFeeOre =
      deliveryMethod === 'posten' ? 30000 : deliveryMethod === 'e6_pickup' ? 20000 : 0

    const subtotalOre = quantity * pricePerEggOre
    const totalAmountOre = subtotalOre + deliveryFeeOre

    // Walk-in: no deposit collected, full amount owed as remainder
    const depositAmountOre = 0
    const remainderAmountOre = totalAmountOre

    const orderNumber = `EGG${Date.now().toString().slice(-8)}`
    const nowIso = new Date().toISOString()
    const createdBy = session.email || session.name || 'admin'

    const { data: order, error: orderError } = await supabaseAdmin
      .from('egg_orders')
      .insert({
        order_number: orderNumber,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        breed_id: inventory.breed_id,
        inventory_id: inventoryId,
        quantity: Math.round(quantity),
        price_per_egg: pricePerEggOre,
        subtotal: subtotalOre,
        delivery_fee: deliveryFeeOre,
        total_amount: totalAmountOre,
        deposit_amount: depositAmountOre,
        remainder_amount: remainderAmountOre,
        delivery_method: deliveryMethod,
        year: inventory.year,
        week_number: inventory.week_number,
        delivery_monday: inventory.delivery_monday,
        remainder_due_date: inventory.delivery_monday,
        status: 'deposit_paid',
        admin_notes: adminNote
          ? `[${nowIso.slice(0, 16)}] Walk-in created by ${createdBy}: ${adminNote}`
          : `[${nowIso.slice(0, 16)}] Walk-in order created by ${createdBy}`,
        policy_version: 'v1-2026',
      })
      .select()
      .single()

    if (orderError || !order) {
      logError('create-manual-egg-order', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Allocate from inventory
    const nextAllocated = (inventory.eggs_allocated || 0) + quantity
    const remainingAfter = (inventory.eggs_available || 0) - nextAllocated
    const nextInvStatus = remainingAfter <= 0 ? 'sold_out' : 'open'

    await supabaseAdmin
      .from('egg_inventory')
      .update({ eggs_allocated: nextAllocated, status: nextInvStatus })
      .eq('id', inventoryId)

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      totalAmountOre,
      remainderAmountOre,
      breed: (breed as any)?.name || '',
      quantity,
    })
  } catch (error) {
    logError('create-manual-egg-order-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
