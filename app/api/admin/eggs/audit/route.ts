import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { getEggDailyAuditTrail } from '@/lib/eggs/collection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceEggOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const date = request.nextUrl.searchParams.get('date') || undefined
    const breedId = request.nextUrl.searchParams.get('breed_id') || undefined
    const limitParam = request.nextUrl.searchParams.get('limit')
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined

    const rows = await getEggDailyAuditTrail({ date, breedId, limit })
    return NextResponse.json({ rows })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch audit trail' }, { status: 500 })
  }
}
