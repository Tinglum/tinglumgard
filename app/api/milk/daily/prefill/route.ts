import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { prefillDay, MilkCollectionError } from '@/lib/milk/collection'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const date = body?.date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' })
    const sessions = await prefillDay(date, access.session)
    return NextResponse.json({ sessions })
  } catch (error: any) {
    if (error instanceof MilkCollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Failed to prefill day' }, { status: 500 })
  }
}
