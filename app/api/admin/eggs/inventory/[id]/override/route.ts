import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { supabaseAdmin } from '@/lib/supabase/server'

const ALLOWED_STATUSES = new Set(['open', 'closed', 'locked', 'sold_out'])

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceEggOpsAccess(request, { requireAdmin: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const updateData: Record<string, unknown> = {
      auto_forecast_at: new Date().toISOString(),
    }

    if (typeof body.manual_override === 'boolean') {
      updateData.manual_override = body.manual_override
      updateData.forecast_source = body.manual_override ? 'manual' : 'auto'
    }

    if (body.eggs_available !== undefined) {
      const eggsAvailable = Number(body.eggs_available)
      if (!Number.isInteger(eggsAvailable) || eggsAvailable < 0) {
        return NextResponse.json({ error: 'Invalid eggs_available value' }, { status: 400 })
      }
      updateData.eggs_available = eggsAvailable
    }

    if (body.status !== undefined) {
      if (!ALLOWED_STATUSES.has(body.status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
      }
      updateData.status = body.status
    }

    if (Object.keys(updateData).length === 1) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('egg_inventory')
      .update(updateData)
      .eq('id', params.id)
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Inventory row not found' }, { status: 404 })
    }

    return NextResponse.json({ row: data })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update override' }, { status: 500 })
  }
}
