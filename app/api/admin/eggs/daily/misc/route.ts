import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { EggCollectionError, upsertEggOpsDayMiscCounts } from '@/lib/eggs/collection'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  const access = await enforceEggOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const collectionDate = body?.collection_date
    const duckEggs = body?.duck_eggs
    const otherEggs = body?.other_eggs

    if (!collectionDate) {
      return NextResponse.json({ error: 'collection_date is required' }, { status: 400 })
    }

    const dayState = await upsertEggOpsDayMiscCounts({
      collectionDate,
      duckEggs,
      otherEggs,
      reason: body?.reason || null,
      session: access.session,
    })

    return NextResponse.json({ day_state: dayState })
  } catch (error: any) {
    if (error instanceof EggCollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Failed to save misc egg counts' }, { status: 500 })
  }
}
