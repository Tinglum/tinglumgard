import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { allocateEggWishlistRequest } from '@/lib/eggs/wishlist'

type Body = {
  allocations?: Array<{ breedId?: string; quantity?: number }>
  notes?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Request id is required' }, { status: 400 })

  const body = (await request.json().catch(() => ({}))) as Body
  const result = await allocateEggWishlistRequest(
    id,
    {
      allocations: Array.isArray(body.allocations)
        ? body.allocations
            .map((row) => ({
              breedId: String(row?.breedId || '').trim(),
              quantity: Math.max(0, Math.floor(Number(row?.quantity || 0))),
            }))
            .filter((row) => row.breedId && row.quantity > 0)
        : undefined,
      notes: body.notes || null,
    },
    session
  )

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(
    {
      ok: true,
      request: result.request,
      summary: result.summary,
    },
    { status: 200 }
  )
}

