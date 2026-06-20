import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { getGoatStats } from '@/lib/milk/analytics'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10)
  const goats = await getGoatStats(days)
  return NextResponse.json({ goats })
}
