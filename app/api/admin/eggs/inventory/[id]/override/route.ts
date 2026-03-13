import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { processEggWaitlistQueue, reactivatePausedWaitlistEntries } from '@/lib/eggs/waitlist'

const ALLOWED_STATUSES = new Set(['open', 'closed', 'locked', 'sold_out'])
type InventoryStatus = 'open' | 'closed' | 'locked' | 'sold_out'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await enforceEggOpsAccess(request, { requireAdmin: true })
  if (!access.ok) return access.response

  try {
    const body = await request.json()
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('egg_inventory')
      .select(
        'id, breed_id, year, week_number, eggs_available, eggs_allocated, auto_forecast_eggs, manual_adjustment, manual_override, status'
      )
      .eq('id', params.id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Inventory row not found' }, { status: 404 })
    }

    const { data: forecastRow } = await supabaseAdmin
      .from('egg_weekly_forecasts')
      .select('forecast_eggs')
      .eq('breed_id', existing.breed_id)
      .eq('year', existing.year)
      .eq('week_number', existing.week_number)
      .maybeSingle()

    const baseline = Number.isFinite(Number(forecastRow?.forecast_eggs))
      ? Number(forecastRow?.forecast_eggs)
      : Number.isFinite(Number(existing.auto_forecast_eggs))
        ? Number(existing.auto_forecast_eggs)
        : Number(existing.eggs_available || 0)

    const updateData: Record<string, unknown> = {
      auto_forecast_at: new Date().toISOString(),
    }

    const hasManualAdjustmentInput = body.manual_adjustment !== undefined
    const hasAbsoluteEggsInput = body.eggs_available !== undefined
    const hasManualOverrideInput = typeof body.manual_override === 'boolean'
    const hasAnyOverrideInput = hasManualAdjustmentInput || hasAbsoluteEggsInput || hasManualOverrideInput

    let adjustment = Number(existing.manual_adjustment || 0)
    let nextManualOverride = Boolean(existing.manual_override)

    if (hasManualAdjustmentInput) {
      const parsedAdjustment = Number(body.manual_adjustment)
      if (!Number.isInteger(parsedAdjustment)) {
        return NextResponse.json({ error: 'Invalid manual_adjustment value' }, { status: 400 })
      }
      adjustment = parsedAdjustment
      nextManualOverride = true
    }

    if (hasAbsoluteEggsInput) {
      const eggsAvailable = Number(body.eggs_available)
      if (!Number.isInteger(eggsAvailable) || eggsAvailable < 0) {
        return NextResponse.json({ error: 'Invalid eggs_available value' }, { status: 400 })
      }
      adjustment = eggsAvailable - baseline
      nextManualOverride = adjustment !== 0
    }

    if (hasManualOverrideInput) {
      nextManualOverride = Boolean(body.manual_override)
      if (!nextManualOverride) {
        adjustment = 0
      }
    }

    let nextEggsAvailable = Number(existing.eggs_available || 0)
    if (hasAnyOverrideInput) {
      nextEggsAvailable = Math.max(0, baseline + (nextManualOverride ? adjustment : 0))
      updateData.auto_forecast_eggs = baseline
      updateData.manual_adjustment = nextManualOverride ? adjustment : 0
      updateData.manual_override = nextManualOverride
      updateData.eggs_available = nextEggsAvailable
      updateData.forecast_source = nextManualOverride ? 'manual' : 'auto'
      updateData.deficit_alert = nextEggsAvailable < Number(existing.eggs_allocated || 0)
    }

    if (body.status !== undefined) {
      if (!ALLOWED_STATUSES.has(body.status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
      }
      updateData.status = body.status
    } else if (hasAnyOverrideInput && existing.status !== 'closed') {
      const currentStatus = String(existing.status || 'open') as InventoryStatus
      const allocated = Number(existing.eggs_allocated || 0)
      if (nextEggsAvailable <= allocated) {
        updateData.status = 'sold_out'
      } else if (currentStatus === 'sold_out' || currentStatus === 'locked') {
        updateData.status = 'open'
      }
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

    const previousAvailable = Number(existing.eggs_available || 0)
    const previousStatus = String(existing.status || 'open')
    const nextAvailable = Number(data.eggs_available || 0)
    const nextStatus = String(data.status || previousStatus)
    const capacityIncreased = nextAvailable > previousAvailable
    const reopened = (previousStatus === 'locked' || previousStatus === 'sold_out') && nextStatus === 'open'

    if (capacityIncreased || reopened) {
      await reactivatePausedWaitlistEntries(params.id)
      await processEggWaitlistQueue({ inventoryIds: [params.id] })
    }

    return NextResponse.json({ row: data })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update override' }, { status: 500 })
  }
}
