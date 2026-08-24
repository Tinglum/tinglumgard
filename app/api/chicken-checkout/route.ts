import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'
import { getAgeWeeks, getHenPrice, getDepositAmount, getMondayOfWeek } from '@/lib/chickens/pricing'
import { createOrderAccessToken } from '@/lib/auth/order-access'
import { getSession } from '@/lib/auth/session'
import { VIPPS_PENDING_EMAIL } from '@/lib/constants'

interface ChickenCheckoutLineItem {
  hatchId: string
  breedId: string
  quantityHens: number
  quantityRoosters?: number
}

interface ChickenCheckoutRequest {
  hatchId?: string
  breedId?: string
  quantityHens?: number
  quantityRoosters?: number
  lineItems?: ChickenCheckoutLineItem[]
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

interface NormalizedLineItem {
  hatchId: string
  breedId: string
  quantityHens: number
  quantityRoosters: number
}

function normalizeEmail(value?: string | null): string {
  return String(value || '').trim().toLowerCase()
}

function normalizePhone(value?: string | null): string {
  return String(value || '').trim()
}

function normalizeLineItems(body: ChickenCheckoutRequest): NormalizedLineItem[] {
  const rawItems = Array.isArray(body.lineItems) && body.lineItems.length > 0
    ? body.lineItems
    : (body.hatchId && body.breedId
      ? [{
          hatchId: body.hatchId,
          breedId: body.breedId,
          quantityHens: Number(body.quantityHens || 0),
          quantityRoosters: Number(body.quantityRoosters || 0),
        }]
      : [])

  const merged = new Map<string, NormalizedLineItem>()
  for (const item of rawItems) {
    const hatchId = String(item.hatchId || '').trim()
    const breedId = String(item.breedId || '').trim()
    const quantityHens = Number(item.quantityHens || 0)
    const quantityRoosters = Number(item.quantityRoosters || 0)

    if (!hatchId || !breedId) continue

    const key = `${hatchId}:${breedId}`
    const existing = merged.get(key)
    if (existing) {
      existing.quantityHens += quantityHens
      existing.quantityRoosters += quantityRoosters
      continue
    }

    merged.set(key, { hatchId, breedId, quantityHens, quantityRoosters })
  }

  return Array.from(merged.values())
}

export async function POST(request: NextRequest) {
  try {
    const body: ChickenCheckoutRequest = await request.json()
    const session = await getSession()

    if (!body.pickupYear || !body.pickupWeek || !body.deliveryMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const lineItems = normalizeLineItems(body)
    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })
    }

    for (const item of lineItems) {
      if (!Number.isFinite(item.quantityHens) || item.quantityHens <= 0) {
        return NextResponse.json({ error: 'Invalid hen quantity in one or more line items' }, { status: 400 })
      }

      if (!Number.isFinite(item.quantityRoosters) || item.quantityRoosters < 0) {
        return NextResponse.json({ error: 'Invalid rooster quantity in one or more line items' }, { status: 400 })
      }
    }

    const hatchIds = Array.from(new Set(lineItems.map((item) => item.hatchId)))
    const { data: hatches, error: hatchError } = await supabaseAdmin
      .from('chicken_hatches')
      .select('*, chicken_breeds(*)')
      .in('id', hatchIds)
      .eq('active', true)

    if (hatchError || !hatches) {
      return NextResponse.json({ error: 'Failed to fetch hatch data' }, { status: 500 })
    }

    const hatchMap = new Map<string, any>()
    for (const hatch of hatches) {
      hatchMap.set(hatch.id, hatch)
    }

    const pickupMonday = getMondayOfWeek(body.pickupYear, body.pickupWeek)
    const pickupMondayStr = pickupMonday.toISOString().split('T')[0]

    const computedLines: Array<{
      hatchId: string
      breedId: string
      quantityHens: number
      quantityRoosters: number
      ageWeeksAtPickup: number
      pricePerHen: number
      pricePerRooster: number
      subtotal: number
      hatch: any
      breed: any
    }> = []

    for (const item of lineItems) {
      const hatch = hatchMap.get(item.hatchId)
      if (!hatch) {
        return NextResponse.json({ error: `Hatch not found: ${item.hatchId}` }, { status: 404 })
      }

      const breed = hatch.chicken_breeds
      if (!breed || breed.id !== item.breedId) {
        return NextResponse.json({ error: 'Breed mismatch for one or more line items' }, { status: 400 })
      }

      if (Number(hatch.available_hens) < item.quantityHens) {
        return NextResponse.json({ error: `Not enough hens available for ${breed.name}` }, { status: 400 })
      }

      const ageWeeksAtPickup = getAgeWeeks(hatch.hatch_date, pickupMonday)
      if (ageWeeksAtPickup < 1) {
        return NextResponse.json({ error: `${breed.name} is not bookable yet (minimum age is 1 week)` }, { status: 400 })
      }

      const breedSlug = String(breed.slug || '').toLowerCase()
      const isCreamLegbar = breedSlug === 'cream-legbar'
      const allowRoosters = ageWeeksAtPickup >= 10 && !isCreamLegbar

      if (item.quantityRoosters > 0 && !allowRoosters) {
        return NextResponse.json({ error: `Roosters can only be ordered for chickens 10 weeks or older${isCreamLegbar ? ' (Cream Legbar is always female)' : ''}.` }, { status: 400 })
      }

      if (item.quantityRoosters > 0 && Number(hatch.available_roosters) < item.quantityRoosters) {
        return NextResponse.json({ error: `Not enough roosters available for ${breed.name}` }, { status: 400 })
      }

      const pricePerHen = getHenPrice(
        ageWeeksAtPickup,
        Number(breed.start_price_nok),
        Number(breed.weekly_increase_nok),
        Number(breed.adult_price_nok)
      )

      const defaultRoosterPrice = breedSlug === 'ayam-cemani' ? 400 : 200
      const pricePerRooster = Number(breed.rooster_price_nok) || defaultRoosterPrice
      const subtotal = (item.quantityHens * pricePerHen) + (item.quantityRoosters * pricePerRooster)

      computedLines.push({
        hatchId: item.hatchId,
        breedId: item.breedId,
        quantityHens: item.quantityHens,
        quantityRoosters: item.quantityRoosters,
        ageWeeksAtPickup,
        pricePerHen,
        pricePerRooster,
        subtotal,
        hatch,
        breed,
      })
    }

    const subtotal = computedLines.reduce((sum, line) => sum + line.subtotal, 0)
    const deliveryFee = body.deliveryMethod === 'delivery_namsos_trondheim' ? 300 : 0
    const totalAmount = subtotal + deliveryFee
    const depositAmount = getDepositAmount(totalAmount)
    const remainderAmount = totalAmount - depositAmount

    const remainderDueDate = new Date(pickupMonday)
    remainderDueDate.setDate(remainderDueDate.getDate() - 7)

    const orderNumber = `CHICK${Date.now().toString().slice(-8)}`
    const primaryLine = computedLines[0]
    const normalizedBodyEmail = normalizeEmail(body.customerEmail)
    const normalizedSessionEmail = normalizeEmail(session?.email as string | undefined)
    const customerEmail = normalizedBodyEmail || normalizedSessionEmail || VIPPS_PENDING_EMAIL
    const customerPhone =
      normalizePhone(body.customerPhone) || normalizePhone(session?.phoneNumber as string | undefined) || null
    const customerName = String(body.customerName || session?.name || '').trim() || 'Vipps kunde'

    const { data: order, error: orderError } = await supabaseAdmin
      .from('chicken_orders')
      .insert({
        order_number: orderNumber,
        user_id: session?.userId || null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        hatch_id: primaryLine.hatchId,
        breed_id: primaryLine.breedId,
        quantity_hens: primaryLine.quantityHens,
        quantity_roosters: primaryLine.quantityRoosters,
        pickup_year: body.pickupYear,
        pickup_week: body.pickupWeek,
        pickup_monday: pickupMondayStr,
        age_weeks_at_pickup: primaryLine.ageWeeksAtPickup,
        price_per_hen_nok: primaryLine.pricePerHen,
        price_per_rooster_nok: primaryLine.pricePerRooster,
        // Keep subtotal as base line only; additional lines live in chicken_order_additions.
        subtotal_nok: primaryLine.subtotal,
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

    const additions = computedLines.slice(1)
    if (additions.length > 0) {
      const additionsPayload = additions.map((line) => ({
        chicken_order_id: order.id,
        hatch_id: line.hatchId,
        breed_id: line.breedId,
        quantity_hens: line.quantityHens,
        quantity_roosters: line.quantityRoosters,
        price_per_hen_nok: line.pricePerHen,
        subtotal_nok: line.subtotal,
      }))

      const { error: additionsError } = await supabaseAdmin
        .from('chicken_order_additions')
        .insert(additionsPayload)

      if (additionsError) {
        logError('chicken-checkout-additions', additionsError)
        return NextResponse.json({ error: 'Failed to create order additions' }, { status: 500 })
      }
    }

    // Hatch stock is NOT decremented at checkout — chickens are reserved only
    // when the deposit payment completes (see the Vipps webhook). A failed or
    // abandoned Vipps payment therefore never holds birds; the customer is told
    // on Min side that the chickens are unreserved until they pay. The
    // availability checks above still prevent obviously-sold-out checkouts.

    // Grant pork deposit discount benefit to chicken customers
    if (customerEmail && customerEmail !== VIPPS_PENDING_EMAIL) {
      await supabaseAdmin
        .from('customer_benefits')
        .upsert({
          user_email: customerEmail,
          user_phone: customerPhone || null,
          benefit_type: 'egg_customer_pork_discount',
          discount_percent: 10,
          granted_by_order_id: order.id,
          granted_by_order_type: 'chicken',
        }, { onConflict: 'user_email,benefit_type,granted_by_order_id' })
        .then(({ error }) => {
          if (error) logError('chicken-checkout-benefit-grant', error)
        })
    }

    const orderAccessToken = await createOrderAccessToken({
      scope: 'chickens',
      orderId: order.id,
    })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      orderAccessToken,
      totalAmount,
      depositAmount,
      lineCount: computedLines.length,
    })
  } catch (error) {
    logError('chicken-checkout-main', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to process checkout'
    return NextResponse.json({ error: 'Failed to process checkout', details: errorMessage }, { status: 500 })
  }
}
