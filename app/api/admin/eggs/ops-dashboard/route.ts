import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { getEggOpsDashboardData } from '@/lib/eggs/collection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceEggOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const daysParam = request.nextUrl.searchParams.get('days')
    const days = daysParam ? Number.parseInt(daysParam, 10) : 30
    const data = await getEggOpsDashboardData(days)
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch dashboard' }, { status: 500 })
  }
}
