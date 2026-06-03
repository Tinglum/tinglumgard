import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { updateDayStatus, MilkCollectionError } from '@/lib/milk/collection'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const dayState = await updateDayStatus(body, access.session)
    return NextResponse.json({ day_state: dayState })
  } catch (error: any) {
    if (error instanceof MilkCollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Failed to update day status' }, { status: 500 })
  }
}
