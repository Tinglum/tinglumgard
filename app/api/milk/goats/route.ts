import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { getGoats, upsertGoat, MilkCollectionError } from '@/lib/milk/collection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const goats = await getGoats()
    return NextResponse.json({ goats })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch goats' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const goat = await upsertGoat(body, access.session)
    return NextResponse.json({ goat })
  } catch (error: any) {
    if (error instanceof MilkCollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Failed to save goat' }, { status: 500 })
  }
}
