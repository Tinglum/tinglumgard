import { NextRequest, NextResponse } from 'next/server'
import { enforceMilkOpsAccess } from '@/lib/auth/milk-ops-access'
import { appendProcessLog, ProductionError } from '@/lib/milk/production'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceMilkOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const batch = await appendProcessLog(params.id, body, access.session)
    return NextResponse.json({ batch })
  } catch (error: any) {
    if (error instanceof ProductionError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error?.message || 'Failed to log' }, { status: 500 })
  }
}
