import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { getProductionTrends, getRecipeSuccessRates } from '@/lib/milk/analytics'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10)
  const [trends, recipes] = await Promise.all([
    getProductionTrends(days),
    getRecipeSuccessRates(),
  ])
  return NextResponse.json({ trends, recipes })
}
