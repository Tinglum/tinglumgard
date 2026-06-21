import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { getSessionAnalytics } from '@/lib/milk/analytics'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  const days = parseInt(request.nextUrl.searchParams.get('days') || '90', 10)
  const data = await getSessionAnalytics(days)
  return NextResponse.json(data)
}
