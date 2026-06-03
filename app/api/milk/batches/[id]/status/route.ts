import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { advanceBatchStatus, MilkBatchError } from '@/lib/milk/batches'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const batch = await advanceBatchStatus(params.id, body, access.session)
    return NextResponse.json({ batch })
  } catch (error: any) {
    if (error instanceof MilkBatchError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error?.message || 'Failed to advance status' }, { status: 500 })
  }
}
