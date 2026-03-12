import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { generateEggWishlistProposal } from '@/lib/eggs/wishlist'

type ProposalBody = {
  year?: number
  week?: number
  persistEvents?: boolean
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as ProposalBody
  const result = await generateEggWishlistProposal({
    year: Number.isFinite(Number(body.year)) ? Number(body.year) : undefined,
    weekNumber: Number.isFinite(Number(body.week)) ? Number(body.week) : undefined,
    persistEvents: body.persistEvents !== false,
    createdBy: session.email || session.name || session.userId || 'admin',
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: true,
    summary: result.summary,
    requests: result.requests,
    inventoryPool: result.inventoryPool || {},
  })
}

