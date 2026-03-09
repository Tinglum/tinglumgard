import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { canAccessEggOps } from '@/lib/auth/roles'
import { EggCollectionError, getEggDailyCollections, upsertEggDailyCollection } from '@/lib/eggs/collection'
import { recomputeForecastForBreed } from '@/lib/eggs/forecast'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!canAccessEggOps(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const date = request.nextUrl.searchParams.get('date') || undefined
    const data = await getEggDailyCollections(date)
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch daily collections' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || !canAccessEggOps(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const row = await upsertEggDailyCollection(body, session)
    const forecast = await recomputeForecastForBreed({ breedId: row.breed_id, date: row.collection_date })

    return NextResponse.json({ row, forecast })
  } catch (error: any) {
    if (error instanceof EggCollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Failed to save daily collection' }, { status: 500 })
  }
}
