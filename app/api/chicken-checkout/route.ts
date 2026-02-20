import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'
import { getAgeWeeks, getHenPrice, getDepositAmount, getRemainderAmount, getMondayOfWeek } from '@/lib/chickens/pricing'

interface ChickenCheckoutRequest {
  hatchId: string
  breedId: string
  quantityHens: number
  quantityRoosters?: number
  pickupYear: number
  pickupWeek: number
  deliveryMethod: 'farm_pickup' | 'delivery_namsos_trondheim'
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: string
  shippingPostalCode?: string
  shippingCity?: string
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ChickenCheckoutRequest = await request.json()

    // Validate required fields
    if (!body.hatchId || !body.breedId || !body.pickupYear || !body.pickupWeek || !body.deliveryMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const quantityHens = Number(body.quantityHens)
    const quantityRoosters = Number(body.quantityRoosters || 0)

    if (!Number.isFinite(quantityHens) || quantityHens <= 0) {
      return NextResponse.json({ error: 'Invalid hen quantity' }, { status: 400 })
    }

    if (quantityRoosters < 0 || !Number.isFinite(quantityRoosters)) {
      return NextResponse.json({ error: 'Invalid rooster quantity' }, { status: 400 })
    }

    // Fetch hatch with breed
    const { data: hatch, error: hatchError } = await supabaseAdmin
      .from('chicken_hatches')
      .select('*, chicken_breeds(*)')
      .eq('id', body.hatchId)
      .eq('active', true)
      .single()

    if (hatchError || !hatch) {
      return NextResponse.json({ error: 'Hatch not found' }, { status: 404 })
    }

    const breed = hatch.chicken_breeds
    if (!breed || breed.id !== body.breedId) {
      return NextResponse.json({ error: 'Breed mismatch' }, { status: 400 })
    }

    // Check availability
    if (hatch.available_hens < quantityHens) {
      return NextResponse.json({ error: 'Not enough hens available' }, { status: 400 })
    }

    if (quantityRoosters > 0 && !breed.sell_roosters) {
      return NextResponse.json({ error: 'Roosters not available for this breed' }, { status: 400 })
    }

    if (quantityRoosters > 0 && hatch.available_roosters < quantityRoosters) {
      return NextResponse.json({ error: 'Not enough roosters available' }, { status: 400 })
    }

    // Compute age at pickup week
    const pickupMonday = getMondayOfWeek(body.pickupYear, body.pickupWeek)
    const ageWeeksAtPickup = getAgeWeeks(hatch.hatch_date, pickupMonday)
    if (ageWeeksAtPickup < 1) {
      return NextResponse.json({ error: 'Chickens can only be reserved from 1 week of age' }, { status: 400 })
    }

    // Compute price
    const pricePerHen = getHenPrice(
      ageWeeksAtPickup,
      Number(breed.start_price_nok),
      Number(breed.weekly_increase_nok),
      Number(breed.adult_price_nok)
    )
    const pricePerRooster = Number(breed.rooster_price_nok)

    const subtotal = (quantityHens * pricePerHen) + (quantityRoosters * pricePerRooster)

    // Delivery fee
    const deliveryFee = body.deliveryMethod === 'delivery_namsos_trondheim' ? 300 : 0
    const totalAmount = subtotal + deliveryFee
    const depositAmount = getDepositAmount(totalAmount)
    const remainderAmount = totalAmount - depositAmount

    // Remainder due date: 1 week before pickup
    const remainderDueDate = new Date(pickupMonday)
    remainderDueDate.setDate(remainderDueDate.getDate() - 7)

    const orderNumber = `CHICK${Date.now().toString().slice(-8)}`
    const pickupMondayStr = pickupMonday.toISOString().split('T')[0]

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('chicken_orders')
      .insert({
        order_number: orderNumber,
        user_id: null,
        customer_name: body.customerName || 'Vipps kunde',
        customer_email: body.customerEmail || 'pending@vipps.no',
        customer_phone: body.customerPhone || null,
        hatch_id: body.hatchId,
        breed_id: body.breedId,
        quantity_hens: quantityHens,
        quantity_roosters: quantityRoosters,
        pickup_year: body.pickupYear,
        pickup_week: body.pickupWeek,
        pickup_monday: pickupMondayStr,
        age_weeks_at_pickup: ageWeeksAtPickup,
        price_per_hen_nok: pricePerHen,
        price_per_rooster_nok: pricePerRooster,
        subtotal_nok: subtotal,
        delivery_method: body.deliveryMethod,
        delivery_fee_nok: deliveryFee,
        total_amount_nok: totalAmount,
        deposit_amount_nok: depositAmount,
        remainder_amount_nok: remainderAmount,
        remainder_due_date: remainderDueDate.toISOString().split('T')[0],
        notes: body.notes || '',
        status: 'pending',
        shipping_address: body.shippingAddress || null,
        shipping_postal_code: body.shippingPostalCode || null,
        shipping_city: body.shippingCity || null,
      })
      .select()
      .single()

    if (orderError || !order) {
      logError('chicken-checkout-order-creation', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Decrement available hens/roosters
    const { error: updateError } = await supabaseAdmin
      .from('chicken_hatches')
      .update({
        available_hens: hatch.available_hens - quantityHens,
        available_roosters: hatch.available_roosters - quantityRoosters,
      })
      .eq('id', hatch.id)

    if (updateError) {
      logError('chicken-checkout-hatch-update', updateError)
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      totalAmount,
      depositAmount,
    })
  } catch (error) {
    logError('chicken-checkout-main', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to process checkout'
    return NextResponse.json({ error: 'Failed to process checkout', details: errorMessage }, { status: 500 })
  }
}
