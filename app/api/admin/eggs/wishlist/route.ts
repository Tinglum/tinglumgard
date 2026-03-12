import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listAdminEggWishlistRequests } from '@/lib/eggs/wishlist'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const yearParam = request.nextUrl.searchParams.get('year')
  const weekParam = request.nextUrl.searchParams.get('week')
  const year = yearParam ? Number.parseInt(yearParam, 10) : undefined
  const weekNumber = weekParam ? Number.parseInt(weekParam, 10) : undefined

  const result = await listAdminEggWishlistRequests({
    year: Number.isFinite(year) ? year : undefined,
    weekNumber: Number.isFinite(weekNumber) ? weekNumber : undefined,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(
    {
      ok: true,
      requests: result.requests,
      summary: result.summary,
    },
    { status: 200 }
  )
}

