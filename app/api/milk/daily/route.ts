import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { getMilkDailyCollections, upsertMilkSession, MilkCollectionError } from '@/lib/milk/collection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const date = request.nextUrl.searchParams.get('date') || undefined
    const data = await getMilkDailyCollections(date)
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch daily data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const row = await upsertMilkSession(body, access.session)
    return NextResponse.json({ row })
  } catch (error: any) {
    if (error instanceof MilkCollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Failed to save session' }, { status: 500 })
  }
}
