import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { upsertMilkSession, MilkCollectionError } from '@/lib/milk/collection'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const row = await upsertMilkSession({ ...body, id: params.id }, access.session)
    return NextResponse.json({ row })
  } catch (error: any) {
    if (error instanceof MilkCollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Failed to update session' }, { status: 500 })
  }
}
