import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { EggCollectionError, updateEggOpsAlert } from '@/lib/eggs/collection'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceEggOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const action = body?.action as 'acknowledge' | 'snooze' | 'resolve'
    if (!action || !['acknowledge', 'snooze', 'resolve'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const row = await updateEggOpsAlert({
      alertId: params.id,
      action,
      snoozeMinutes: body?.snooze_minutes,
      session: access.session,
    })

    return NextResponse.json({ row })
  } catch (error: any) {
    if (error instanceof EggCollectionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Failed to update alert' }, { status: 500 })
  }
}
