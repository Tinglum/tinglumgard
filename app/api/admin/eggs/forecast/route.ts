import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { getForecastRows } from '@/lib/eggs/forecast'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceEggOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const weeksParam = request.nextUrl.searchParams.get('weeks')
    const weeks = weeksParam ? Number.parseInt(weeksParam, 10) : 4
    const rows = await getForecastRows(weeks)
    return NextResponse.json({ rows, weeks })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch forecast' }, { status: 500 })
  }
}
