import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { canAccessEggOps } from '@/lib/auth/roles'
import { EggCollectionError, patchEggDailyCollectionById } from '@/lib/eggs/collection'
import { recomputeForecastForBreed } from '@/lib/eggs/forecast'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !canAccessEggOps(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const row = await patchEggDailyCollectionById(params.id, body, session)
    const forecast = await recomputeForecastForBreed({ breedId: row.breed_id, date: row.collection_date })
    return NextResponse.json({ row, forecast })
  } catch (error: any) {
    if (error instanceof EggCollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Failed to update daily collection' }, { status: 500 })
  }
}
