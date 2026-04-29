import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'
import { getHenPrice, roundTo5 } from '@/lib/chickens/pricing'

function toNonNegativeInt(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed)
}

function toInt(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : 0
}

async function loadOrder(orderId: string) {
  return supabaseAdmin
    .from('chicken_orders')
    .select('*, chicken_breeds(*), chicken_hatches(*), chicken_payments(*), chicken_order_additions(*, chicken_breeds(*), chicken_hatches(*))')
    .eq('id', orderId)
    .maybeSingle()
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()

    const hatchId = typeof body.hatchId === 'string' ? body.hatchId.trim() : null
    if (!hatchId) return NextResponse.json({ error: 'hatchId is required' }, { status: 400 })

    const quantityHens = toNonNegativeInt(body.quantityHens)
    const quantityRoosters = toNonNegativeInt(body.quantityRoosters)
    if (quantityHens === null || quantityRoosters === null) {
      return NextResponse.json({ error: 'quantityHens and quantityRoosters must be non-negative integers' }, { status: 400 })
    }
    if (quantityHens === 0 && quantityRoosters === 0) {
      return NextResponse.json({ error: 'At least one bird must be added' }, { status: 400 })
    }

    const ageWeeksAtPickup = toNonNegativeInt(body.ageWeeksAtPickup)
    if (ageWeeksAtPickup === null) {
      return NextResponse.json({ error: 'ageWeeksAtPickup must be a non-negative integer' }, { status: 400 })
    }

    // Load the order
    const { data: order, error: orderError } = await loadOrder(params.id)
    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Load the hatch with breed pricing
    const { data: hatch, error: hatchError } = await supabaseAdmin
      .from('chicken_hatches')
      .select('id, breed_id, available_hens, available_roosters, chicken_breeds(name, start_price_nok, weekly_increase_nok, adult_price_nok, rooster_price_nok)')
      .eq('id', hatchId)
      .maybeSingle()

    if (hatchError || !hatch) {
      return NextResponse.json({ error: 'Hatch not found' }, { status: 404 })
    }

    const breed = hatch.chicken_breeds as any
    const availableHens = Number(hatch.available_hens || 0)
    const availableRoosters = Number(hatch.available_roosters || 0)

    if (quantityHens > availableHens) {
      return NextResponse.json({ error: `Not enough free hens: need ${quantityHens}, have ${availableHens}` }, { status: 400 })
    }
    if (quantityRoosters > availableRoosters) {
      return NextResponse.json({ error: `Not enough free roosters: need ${quantityRoosters}, have ${availableRoosters}` }, { status: 400 })
    }

    // Compute price
    const pricePerHen = getHenPrice(
      ageWeeksAtPickup,
      Number(breed?.start_price_nok || 0),
      Number(breed?.weekly_increase_nok || 0),
      Number(breed?.adult_price_nok || 0),
    )
    const pricePerRooster = breed?.rooster_price_nok != null
      ? roundTo5(Number(breed.rooster_price_nok))
      : pricePerHen
    const subtotalNok = quantityHens * pricePerHen + quantityRoosters * pricePerRooster

    // Insert new addition
    const { error: insertError } = await supabaseAdmin
      .from('chicken_order_additions')
      .insert({
        chicken_order_id: order.id,
        hatch_id: hatchId,
        breed_id: hatch.breed_id,
        quantity_hens: quantityHens,
        quantity_roosters: quantityRoosters,
        price_per_hen_nok: pricePerHen,
        subtotal_nok: subtotalNok,
      })

    if (insertError) {
      logError('add-addition-insert', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Deduct from hatch inventory
    const { error: hatchUpdateError } = await supabaseAdmin
      .from('chicken_hatches')
      .update({
        available_hens: availableHens - quantityHens,
        available_roosters: availableRoosters - quantityRoosters,
      })
      .eq('id', hatchId)

    if (hatchUpdateError) {
      logError('add-addition-hatch-update', hatchUpdateError)
      return NextResponse.json({ error: 'Failed to update hatch inventory' }, { status: 500 })
    }

    // Reload order and recalculate totals
    const { data: updatedOrder, error: refetchError } = await loadOrder(order.id)
    if (refetchError || !updatedOrder) {
      return NextResponse.json({ error: 'Failed to reload order' }, { status: 500 })
    }

    const baseSubtotal =
      toInt(updatedOrder.quantity_hens) * Number(updatedOrder.price_per_hen_nok || 0) +
      toInt(updatedOrder.quantity_roosters) * Number(updatedOrder.price_per_rooster_nok || 0)

    const additionsSubtotal = (updatedOrder.chicken_order_additions || []).reduce(
      (sum: number, row: any) => sum + Number(row?.subtotal_nok || 0),
      0
    )

    const deliveryFee = Number(updatedOrder.delivery_fee_nok || 0)
    const totalAmountNok = Math.max(0, baseSubtotal + additionsSubtotal + deliveryFee)
    const depositAmountNok = Math.max(0, Math.min(toInt(updatedOrder.deposit_amount_nok || 0), Math.round(totalAmountNok)))
    const remainderAmountNok = Math.max(0, Math.round(totalAmountNok - depositAmountNok))

    const noteEntry = `[${new Date().toISOString().slice(0, 16)}] Admin added breed: ${breed?.name || hatchId} (${quantityHens}♀ ${quantityRoosters}♂, ${ageWeeksAtPickup} wks)`
    const newNotes = [updatedOrder.admin_notes || '', noteEntry].filter(Boolean).join('\n')

    const { error: finalError } = await supabaseAdmin
      .from('chicken_orders')
      .update({
        subtotal_nok: Math.max(0, baseSubtotal),
        total_amount_nok: totalAmountNok,
        deposit_amount_nok: depositAmountNok,
        remainder_amount_nok: remainderAmountNok,
        admin_notes: newNotes,
      })
      .eq('id', order.id)

    if (finalError) {
      logError('add-addition-final-update', finalError)
      return NextResponse.json({ error: 'Failed to recalculate totals' }, { status: 500 })
    }

    const { data: finalOrder, error: finalOrderError } = await loadOrder(order.id)
    if (finalOrderError || !finalOrder) {
      return NextResponse.json({ error: 'Updated order could not be reloaded' }, { status: 500 })
    }

    return NextResponse.json({ success: true, order: finalOrder })
  } catch (error) {
    logError('add-addition-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
