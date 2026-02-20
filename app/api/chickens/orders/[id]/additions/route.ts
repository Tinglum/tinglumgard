import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'
import { getAgeWeeks, getHenPrice, getMondayOfWeek } from '@/lib/chickens/pricing'

interface AdditionRequest {
  hatchId: string
  breedId: string
  quantityHens: number
  quantityRoosters?: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: AdditionRequest = await request.json()

    if (!body.hatchId || !body.breedId || !body.quantityHens) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch existing order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('chicken_orders')
      .select('*')
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Only allow additions on deposit_paid or fully_paid orders
    if (!['deposit_paid', 'fully_paid'].includes(order.status)) {
      return NextResponse.json({ error: 'Order not eligible for additions' }, { status: 400 })
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
    const quantityHens = Number(body.quantityHens)
    const quantityRoosters = Number(body.quantityRoosters || 0)

    if (hatch.available_hens < quantityHens) {
      return NextResponse.json({ error: 'Not enough hens available' }, { status: 400 })
    }

    // Compute price at the order's pickup week
    const pickupMonday = getMondayOfWeek(order.pickup_year, order.pickup_week)
    const ageWeeks = getAgeWeeks(hatch.hatch_date, pickupMonday)
    const pricePerHen = getHenPrice(
      ageWeeks,
      Number(breed.start_price_nok),
      Number(breed.weekly_increase_nok),
      Number(breed.adult_price_nok)
    )

    const subtotal = (quantityHens * pricePerHen) + (quantityRoosters * Number(breed.rooster_price_nok))

    // Create addition
    const { data: addition, error: additionError } = await supabaseAdmin
      .from('chicken_order_additions')
      .insert({
        chicken_order_id: order.id,
        hatch_id: body.hatchId,
        breed_id: body.breedId,
        quantity_hens: quantityHens,
        quantity_roosters: quantityRoosters,
        price_per_hen_nok: pricePerHen,
        subtotal_nok: subtotal,
      })
      .select()
      .single()

    if (additionError) {
      logError('chicken-addition-insert', additionError)
      return NextResponse.json({ error: 'Failed to create addition' }, { status: 500 })
    }

    // Decrement availability
    await supabaseAdmin
      .from('chicken_hatches')
      .update({
        available_hens: hatch.available_hens - quantityHens,
        available_roosters: hatch.available_roosters - quantityRoosters,
      })
      .eq('id', hatch.id)

    // Update order totals
    const newSubtotal = Number(order.subtotal_nok) + subtotal
    const newTotal = newSubtotal + Number(order.delivery_fee_nok)
    const newRemainder = newTotal - Number(order.deposit_amount_nok)

    await supabaseAdmin
      .from('chicken_orders')
      .update({
        subtotal_nok: newSubtotal,
        total_amount_nok: newTotal,
        remainder_amount_nok: newRemainder,
      })
      .eq('id', order.id)

    return NextResponse.json({ success: true, addition })
  } catch (error) {
    logError('chicken-addition-main', error)
    return NextResponse.json({ error: 'Failed to add chickens' }, { status: 500 })
  }
}
