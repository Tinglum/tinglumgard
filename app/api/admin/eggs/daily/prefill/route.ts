import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { EggCollectionError, prefillEggDailyFromPreviousDay } from '@/lib/eggs/collection'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const access = await enforceEggOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const collectionDate = body?.collection_date
    if (!collectionDate) {
      return NextResponse.json({ error: 'collection_date is required' }, { status: 400 })
    }

    const result = await prefillEggDailyFromPreviousDay(collectionDate, access.session)
    return NextResponse.json(result)
  } catch (error: any) {
    if (error instanceof EggCollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Failed to prefill rows' }, { status: 500 })
  }
}
