import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { canAccessEggOps } from '@/lib/auth/roles'
import { getForecastRows } from '@/lib/eggs/forecast'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!canAccessEggOps(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const weeksParam = request.nextUrl.searchParams.get('weeks')
    const weeks = weeksParam ? Number.parseInt(weeksParam, 10) : 4
    const rows = await getForecastRows(weeks)
    return NextResponse.json({ rows, weeks })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch forecast' }, { status: 500 })
  }
}
