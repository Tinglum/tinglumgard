import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { getPipelineAnalytics } from '@/lib/milk/analytics'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  const data = await getPipelineAnalytics()
  return NextResponse.json(data)
}
