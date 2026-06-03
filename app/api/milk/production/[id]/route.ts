import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { getProductionById, updateProductionBatch, ProductionError } from '@/lib/milk/production'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const batch = await getProductionById(params.id)
    return NextResponse.json({ batch })
  } catch (error: any) {
    if (error instanceof ProductionError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error?.message || 'Failed to fetch' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const batch = await updateProductionBatch(params.id, body, access.session)
    return NextResponse.json({ batch })
  } catch (error: any) {
    if (error instanceof ProductionError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error?.message || 'Failed to update' }, { status: 500 })
  }
}
