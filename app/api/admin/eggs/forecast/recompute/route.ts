import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { canAccessEggOps } from '@/lib/auth/roles'
import { recomputeForecastForBreed, recomputeForecastsForAllBreeds } from '@/lib/eggs/forecast'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || !canAccessEggOps(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const date = typeof body.date === 'string' ? body.date : undefined
    const weeksOverride = Number.isFinite(Number(body.weeks)) ? Number(body.weeks) : undefined

    if (typeof body.breed_id === 'string' && body.breed_id.length > 0) {
      const result = await recomputeForecastForBreed({
        breedId: body.breed_id,
        date,
        weeksOverride,
      })
      return NextResponse.json(result)
    }

    const result = await recomputeForecastsForAllBreeds({
      date,
      weeksOverride,
    })
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to recompute forecast' }, { status: 500 })
  }
}
