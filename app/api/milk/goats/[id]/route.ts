import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { upsertGoat, MilkCollectionError } from '@/lib/milk/collection'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const goat = await upsertGoat({ ...body, id: params.id }, access.session)
    return NextResponse.json({ goat })
  } catch (error: any) {
    if (error instanceof MilkCollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Failed to update goat' }, { status: 500 })
  }
}
