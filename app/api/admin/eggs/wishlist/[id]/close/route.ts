import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { closeEggWishlistRequest } from '@/lib/eggs/wishlist'

type Body = {
  status?: 'closed' | 'cancelled' | 'expired'
  reason?: string
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
  const status = body.status || 'closed'
  if (!['closed', 'cancelled', 'expired'].includes(status)) {
    return NextResponse.json({ error: 'Invalid close status' }, { status: 400 })
  }

  const result = await closeEggWishlistRequest(
    id,
    {
      status,
      reason: body.reason || null,
    },
    session
  )

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true, request: result.request }, { status: 200 })
}

