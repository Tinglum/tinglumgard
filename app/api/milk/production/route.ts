import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { getProductionBatches, createProductionBatch, ProductionError } from '@/lib/milk/production'
import type { ProductionStatus, ProductType } from '@/lib/milk/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const statusParam = request.nextUrl.searchParams.get('status')
    const type = request.nextUrl.searchParams.get('type') as ProductType | null
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)
    const status = statusParam ? statusParam.split(',') as ProductionStatus[] : undefined
    const batches = await getProductionBatches({ status, product_type: type || undefined, limit })
    return NextResponse.json({ batches })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const batch = await createProductionBatch(body, access.session)
    return NextResponse.json({ batch })
  } catch (error: any) {
    if (error instanceof ProductionError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error?.message || 'Failed to create' }, { status: 500 })
  }
}
