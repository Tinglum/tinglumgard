import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { getBatchAudit, MilkBatchError } from '@/lib/milk/batches'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const audit = await getBatchAudit(params.id)
    return NextResponse.json({ audit })
  } catch (error: any) {
    if (error instanceof MilkBatchError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error?.message || 'Failed to fetch audit' }, { status: 500 })
  }
}
