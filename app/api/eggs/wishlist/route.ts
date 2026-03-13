import { NextRequest, NextResponse } from 'next/server'
import { createEggWishlistRequest } from '@/lib/eggs/wishlist'

type WishlistItemInput = {
  breedId?: string
  quantity?: number
}

type WishlistRequestBody = {
  inventoryId?: string
  orderId?: string | null
  source?: 'order_addon' | 'standalone'
  notes?: string
  year?: number
  weekNumber?: number
  deliveryMonday?: string
  quantity?: number
  items?: WishlistItemInput[]
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as WishlistRequestBody | null
  if (!body) {
    return NextResponse.json({ error: 'Wishlist payload is required' }, { status: 400 })
  }

  const result = await createEggWishlistRequest({
    inventoryId: body.inventoryId,
    orderId: body.orderId || null,
    source: body.source,
    notes: body.notes || null,
    year: body.year,
    weekNumber: body.weekNumber,
    deliveryMonday: body.deliveryMonday,
    quantity: body.quantity,
    items: Array.isArray(body.items)
      ? body.items
          .map((item) => ({
            breedId: String(item?.breedId || '').trim(),
            quantity: Number(item?.quantity || 0),
          }))
          .filter((item) => item.breedId && Number.isFinite(item.quantity) && item.quantity > 0)
      : undefined,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(
    {
      ok: true,
      request: result.request,
      queuePosition: result.queuePosition,
    },
    { status: 200 }
  )
}
