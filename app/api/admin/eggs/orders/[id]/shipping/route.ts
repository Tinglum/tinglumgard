import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getFulfillmentAvailabilityByBreed } from '@/lib/eggs/fulfillment-availability'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const orderId = params.id
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)
  const column = isUuid ? 'id' : 'order_number'

  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select(
      `id, order_number, status, customer_name, customer_email, customer_phone,
       shipping_name, shipping_email, shipping_phone, shipping_address, shipping_postal_code, shipping_city, shipping_country,
       quantity, price_per_egg, subtotal, delivery_fee, total_amount, deposit_amount, remainder_amount,
       delivery_method, year, week_number, delivery_monday, tracking_number, notes, admin_notes,
       egg_breeds(id, name),
       egg_order_additions(id, quantity, price_per_egg, subtotal, egg_breeds(id, name))`
    )
    .eq(column, orderId)
    .maybeSingle()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Fetch wishlist requests linked to this order
  const { data: wishlistRequests } = await supabaseAdmin
    .from('egg_wishlist_requests')
    .select(
      `id, status, year, week_number, delivery_monday, notes,
       egg_wishlist_items(id, breed_id, qty_requested, qty_allocated, qty_remaining, egg_breeds(name, price_per_egg))`
    )
    .eq('order_id', order.id)
    .not('status', 'in', '(cancelled,expired)')

  const wishlistBreedIds = Array.from(
    new Set(
      (wishlistRequests || []).flatMap((request: any) =>
        (request.egg_wishlist_items || [])
          .map((item: any) => String(item?.breed_id || '').trim())
          .filter(Boolean)
      )
    )
  )

  const fulfillmentAvailability = await getFulfillmentAvailabilityByBreed({
    breedIds: wishlistBreedIds,
    year: order.year,
    weekNumber: order.week_number,
    deliveryMonday: order.delivery_monday,
  })

  // Compute total egg count and weight estimate
  const baseQuantity = order.quantity || 0
  const additionsQuantity = ((order as any).egg_order_additions || []).reduce(
    (sum: number, a: any) => sum + (a.quantity || 0),
    0
  )
  const totalEggs = baseQuantity + additionsQuantity
  // Average hatching egg weight ~60g, plus packing material ~200g
  const estimatedWeightGrams = totalEggs * 60 + 200

  return NextResponse.json({
    order,
    wishlistRequests: wishlistRequests || [],
    fulfillmentAvailability: Object.fromEntries(
      Array.from(fulfillmentAvailability.entries()).map(([breedId, availability]) => [
        breedId,
        {
          remaining: availability.remaining,
          source: availability.source,
          actualCollected: availability.actualCollected,
          eggsAllocated: availability.eggsAllocated,
          collectionDaysRecorded: availability.collectionDaysRecorded,
        },
      ])
    ),
    shippingMeta: {
      totalEggs,
      estimatedWeightGrams,
    },
  })
}
