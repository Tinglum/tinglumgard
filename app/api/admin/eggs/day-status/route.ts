import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { EggCollectionError, setEggOpsDayStatus } from '@/lib/eggs/collection'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  const access = await enforceEggOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const collectionDate = body?.collection_date
    const status = body?.status

    if (!collectionDate || !status) {
      return NextResponse.json({ error: 'collection_date and status are required' }, { status: 400 })
    }

    const dayState = await setEggOpsDayStatus({
      collectionDate,
      status,
      reason: body?.reason,
      session: access.session,
    })

    return NextResponse.json({ day_state: dayState })
  } catch (error: any) {
    if (error instanceof EggCollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Failed to update day status' }, { status: 500 })
  }
}
