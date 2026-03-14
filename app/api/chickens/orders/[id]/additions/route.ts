import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'
import { getAgeWeeks, getHenPrice, getMondayOfWeek } from '@/lib/chickens/pricing'
import { getSession } from '@/lib/auth/session'

interface AdditionRequest {
  hatchId: string
  breedId: string
  quantityHens: number
  quantityRoosters?: number
}

function normalizeEmail(value?: string | null): string {
  return String(value || '').trim().toLowerCase()
}

function phoneDigits(value?: string | null): string {
  return String(value || '').replace(/\D/g, '')
}

function isEmailMatch(a?: string | null, b?: string | null): boolean {
  const left = normalizeEmail(a)
  const right = normalizeEmail(b)
  if (!left || !right) return false
  return left === right
}

function isPhoneMatch(a?: string | null, b?: string | null): boolean {
  const left = phoneDigits(a)
  const right = phoneDigits(b)
  if (!left || !right) return false
  if (left === right) return true
  if (left.length >= 8 && right.length >= 8) {
    return left.slice(-8) === right.slice(-8)
  }
  return false
}

function hasOrderAccess(session: any, order: any): boolean {
  if (session?.isAdmin) return true
  if (session?.userId && order?.user_id && session.userId === order.user_id) return true
  if (isEmailMatch(session?.email, order?.customer_email)) return true
  if (isPhoneMatch(session?.phoneNumber, order?.customer_phone)) return true
  return false
}

function isPickupWindowClosed(order: any): boolean {
  const rawPickupMonday = String(order?.pickup_monday || '').trim()
  if (!rawPickupMonday) return false
  const cutoff = new Date(`${rawPickupMonday}T23:59:59`)
  if (Number.isNaN(cutoff.getTime())) return false
  return Date.now() > cutoff.getTime()
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AdditionRequest = await request.json()
    const quantityHens = Number(body.quantityHens || 0)
    const quantityRoosters = Number(body.quantityRoosters || 0)

    if (!body.hatchId || !body.breedId || quantityHens <= 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch existing order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('chicken_orders')
      .select('*, chicken_payments(payment_type, status, amount_nok)')
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!hasOrderAccess(session, order)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!['deposit_paid', 'fully_paid', 'ready_for_pickup'].includes(order.status)) {
      return NextResponse.json({ error: 'Order not eligible for additions' }, { status: 400 })
    }

    if (isPickupWindowClosed(order)) {
      return NextResponse.json({ error: 'Additions window is closed' }, { status: 400 })
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
      return NextResponse.json({ error: 'Breed mismatch for hatch' }, { status: 400 })
    }

    if (!Number.isInteger(quantityHens) || quantityHens <= 0) {
      return NextResponse.json({ error: 'Invalid hen quantity' }, { status: 400 })
    }

    if (!Number.isInteger(quantityRoosters) || quantityRoosters < 0) {
      return NextResponse.json({ error: 'Invalid rooster quantity' }, { status: 400 })
    }

    if (hatch.available_hens < quantityHens) {
      return NextResponse.json({ error: 'Not enough hens available' }, { status: 400 })
    }

    // Compute price at the order's pickup week
    const pickupMonday = getMondayOfWeek(order.pickup_year, order.pickup_week)
    const ageWeeks = getAgeWeeks(hatch.hatch_date, pickupMonday)

    const breedSlug = String(breed.slug || '').toLowerCase()
    const isCreamLegbar = breedSlug === 'cream-legbar'
    const allowRoosters = ageWeeks >= 10 && !isCreamLegbar

    if (quantityRoosters > 0 && !allowRoosters) {
      return NextResponse.json({ error: `Roosters can only be ordered for chickens 10 weeks or older${isCreamLegbar ? ' (Cream Legbar is always female)' : ''}.` }, { status: 400 })
    }

    if (quantityRoosters > hatch.available_roosters) {
      return NextResponse.json({ error: 'Not enough roosters available' }, { status: 400 })
    }

    const pricePerHen = getHenPrice(
      ageWeeks,
      Number(breed.start_price_nok),
      Number(breed.weekly_increase_nok),
      Number(breed.adult_price_nok)
    )

    const defaultRoosterPrice = breedSlug === 'ayam-cemani' ? 400 : 200
    const pricePerRooster = Number(breed.rooster_price_nok) || defaultRoosterPrice
    const subtotal = (quantityHens * pricePerHen) + (quantityRoosters * pricePerRooster)

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

    // Keep base subtotal as base line only; additions are tracked in chicken_order_additions.
    const baseSubtotal =
      Number(order.quantity_hens || 0) * Number(order.price_per_hen_nok || 0) +
      Number(order.quantity_roosters || 0) * Number(order.price_per_rooster_nok || 0)

    const { data: additionsRows } = await supabaseAdmin
      .from('chicken_order_additions')
      .select('subtotal_nok, status')
      .eq('chicken_order_id', order.id)

    const additionsSubtotal = (additionsRows || []).reduce((sum: number, row: any) => {
      if (String(row?.status || '').toLowerCase() === 'cancelled') return sum
      return sum + Number(row?.subtotal_nok || 0)
    }, 0)

    const newTotal = baseSubtotal + additionsSubtotal + Number(order.delivery_fee_nok)
    const newRemainder = newTotal - Number(order.deposit_amount_nok)
    const updatedStatus =
      newRemainder > 0 && ['fully_paid', 'ready_for_pickup'].includes(order.status)
        ? 'deposit_paid'
        : order.status

    await supabaseAdmin
      .from('chicken_orders')
      .update({
        subtotal_nok: baseSubtotal,
        total_amount_nok: newTotal,
        remainder_amount_nok: Math.max(0, newRemainder),
        status: updatedStatus,
      })
      .eq('id', order.id)

    return NextResponse.json({
      success: true,
      addition,
      order: {
        id: order.id,
        subtotal_nok: baseSubtotal,
        total_amount_nok: newTotal,
        remainder_amount_nok: Math.max(0, newRemainder),
        status: updatedStatus,
      },
    })
  } catch (error) {
    logError('chicken-addition-main', error)
    return NextResponse.json({ error: 'Failed to add chickens' }, { status: 500 })
  }
}
