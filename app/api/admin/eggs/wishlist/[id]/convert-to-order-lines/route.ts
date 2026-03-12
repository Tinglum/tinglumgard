import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { convertEggWishlistToOrderLines } from '@/lib/eggs/wishlist'

type Body = {
  orderId?: string
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
  const result = await convertEggWishlistToOrderLines(
    id,
    {
      orderId: body.orderId || null,
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
      convertedRows: result.converted_rows,
    },
    { status: 200 }
  )
}

