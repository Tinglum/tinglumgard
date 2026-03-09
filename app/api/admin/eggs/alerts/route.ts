import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOpenEggOpsAlerts } from '@/lib/eggs/collection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  await getSession()

  try {
    const limitParam = request.nextUrl.searchParams.get('limit')
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 200
    const rows = await getOpenEggOpsAlerts(limit)
    return NextResponse.json({ rows })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch alerts' }, { status: 500 })
  }
}
