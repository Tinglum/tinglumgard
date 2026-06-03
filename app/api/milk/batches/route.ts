import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { getMilkBatches, createMilkBatch, MilkBatchError } from '@/lib/milk/batches'
import type { PipelineStatus } from '@/lib/milk/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const statusParam = request.nextUrl.searchParams.get('status')
    const date = request.nextUrl.searchParams.get('date') || undefined
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100', 10)
    const status = statusParam ? statusParam.split(',') as PipelineStatus[] : undefined
    const batches = await getMilkBatches({ status, date, limit })
    return NextResponse.json({ batches })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch batches' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const batch = await createMilkBatch(body, access.session)
    return NextResponse.json({ batch })
  } catch (error: any) {
    if (error instanceof MilkBatchError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error?.message || 'Failed to create batch' }, { status: 500 })
  }
}
