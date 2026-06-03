import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { getInventoryHistory } from '@/lib/milk/inventory'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)
  const items = await getInventoryHistory(limit)
  return NextResponse.json({ items })
}
