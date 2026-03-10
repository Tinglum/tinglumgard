import { logError } from '@/lib/logger'
import { supabaseAdmin } from '@/lib/supabase/server'
import { processEggWaitlistQueue, reactivatePausedWaitlistEntries } from '@/lib/eggs/waitlist'

type InventoryStatus = 'open' | 'closed' | 'locked' | 'sold_out'

interface SyncForecastInput {
  breedId: string
  year: number
  weekNumber: number
  deliveryMonday: string
  forecastEggs: number
  lowStock: boolean
  threshold: number
}

interface InventoryRow {
  id: string
  eggs_available: number
  eggs_allocated: number
  status: InventoryStatus
  manual_override: boolean
}

function computeStatus(
  previousStatus: InventoryStatus,
  eggsAvailable: number,
  eggsAllocated: number,
  deficit: boolean
): InventoryStatus {
  if (previousStatus === 'closed') return 'closed'
  if (deficit) return 'locked'
  if (eggsAvailable <= eggsAllocated) return 'sold_out'
  return 'open'
}

async function ensureAlert(params: {
  alertType: 'low_stock' | 'deficit'
  breedId: string
  year: number
  weekNumber: number
  message: string
  severity: 'critical' | 'warning' | 'info'
  metadata?: Record<string, unknown>
}) {
  const { data: existing } = await supabaseAdmin
    .from('egg_ops_alerts')
    .select('id')
    .eq('alert_type', params.alertType)
    .eq('breed_id', params.breedId)
    .eq('year', params.year)
    .eq('week_number', params.weekNumber)
    .is('resolved_at', null)
    .limit(1)

  if (existing && existing.length > 0) {
    await supabaseAdmin
      .from('egg_ops_alerts')
      .update({
        message: params.message,
        severity: params.severity,
        metadata: params.metadata || {},
      })
      .eq('id', existing[0].id)
    return
  }

  const { error } = await supabaseAdmin
    .from('egg_ops_alerts')
    .insert({
      alert_type: params.alertType,
      severity: params.severity,
      breed_id: params.breedId,
      year: params.year,
      week_number: params.weekNumber,
      message: params.message,
      metadata: params.metadata || {},
    })

  if (error) {
    logError('egg-ops-alert-insert', error, params)
  }
}

async function resolveAlert(params: {
  alertType: 'low_stock' | 'deficit'
  breedId: string
  year: number
  weekNumber: number
}) {
  const { error } = await supabaseAdmin
    .from('egg_ops_alerts')
    .update({ resolved_at: new Date().toISOString() })
    .eq('alert_type', params.alertType)
    .eq('breed_id', params.breedId)
    .eq('year', params.year)
    .eq('week_number', params.weekNumber)
    .is('resolved_at', null)

  if (error) {
    logError('egg-ops-alert-resolve', error, params)
  }
}

async function reconcileAlerts(params: {
  breedId: string
  year: number
  weekNumber: number
  lowStock: boolean
  deficit: boolean
  threshold: number
  forecastEggs: number
  eggsAllocated: number
}) {
  if (params.lowStock) {
    await ensureAlert({
      alertType: 'low_stock',
      severity: 'warning',
      breedId: params.breedId,
      year: params.year,
      weekNumber: params.weekNumber,
      message: `Low stock forecast for week ${params.weekNumber}/${params.year}: ${params.forecastEggs} eggs (threshold ${params.threshold})`,
      metadata: {
        forecast_eggs: params.forecastEggs,
        threshold: params.threshold,
      },
    })
  } else {
    await resolveAlert({
      alertType: 'low_stock',
      breedId: params.breedId,
      year: params.year,
      weekNumber: params.weekNumber,
    })
  }

  if (params.deficit) {
    await ensureAlert({
      alertType: 'deficit',
      severity: 'critical',
      breedId: params.breedId,
      year: params.year,
      weekNumber: params.weekNumber,
      message: `Forecast below allocated orders for week ${params.weekNumber}/${params.year}: forecast ${params.forecastEggs}, allocated ${params.eggsAllocated}`,
      metadata: {
        forecast_eggs: params.forecastEggs,
        eggs_allocated: params.eggsAllocated,
      },
    })
  } else {
    await resolveAlert({
      alertType: 'deficit',
      breedId: params.breedId,
      year: params.year,
      weekNumber: params.weekNumber,
    })
  }
}

export async function syncForecastToInventory(input: SyncForecastInput) {
  const nextAvailable = Math.max(0, Math.round(input.forecastEggs))
  const nowIso = new Date().toISOString()

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('egg_inventory')
    .select('id, eggs_available, eggs_allocated, status, manual_override')
    .eq('breed_id', input.breedId)
    .eq('year', input.year)
    .eq('week_number', input.weekNumber)
    .maybeSingle()

  if (fetchError) {
    logError('egg-ops-sync-fetch-inventory', fetchError, input)
    return { ok: false, skipped: false, reason: 'fetch_failed' as const }
  }

  if (!existing) {
    const deficit = nextAvailable < 0
    const status: InventoryStatus = deficit ? 'locked' : nextAvailable <= 0 ? 'sold_out' : 'open'
    const { data: created, error: insertError } = await supabaseAdmin
      .from('egg_inventory')
      .insert({
        breed_id: input.breedId,
        year: input.year,
        week_number: input.weekNumber,
        delivery_monday: input.deliveryMonday,
        eggs_available: nextAvailable,
        eggs_allocated: 0,
        status,
        manual_override: false,
        forecast_source: 'auto',
        auto_forecast_at: nowIso,
        deficit_alert: false,
      })
      .select('id, eggs_allocated')
      .single()

    if (insertError || !created) {
      logError('egg-ops-sync-insert-inventory', insertError, input)
      return { ok: false, skipped: false, reason: 'insert_failed' as const }
    }

    await reconcileAlerts({
      breedId: input.breedId,
      year: input.year,
      weekNumber: input.weekNumber,
      lowStock: input.lowStock,
      deficit: false,
      threshold: input.threshold,
      forecastEggs: nextAvailable,
      eggsAllocated: created.eggs_allocated || 0,
    })

    return { ok: true, skipped: false, inventoryId: created.id }
  }

  if (existing.manual_override) {
    await reconcileAlerts({
      breedId: input.breedId,
      year: input.year,
      weekNumber: input.weekNumber,
      lowStock: input.lowStock,
      deficit: existing.eggs_available < (existing.eggs_allocated || 0),
      threshold: input.threshold,
      forecastEggs: nextAvailable,
      eggsAllocated: existing.eggs_allocated || 0,
    })
    return { ok: true, skipped: true, inventoryId: existing.id }
  }

  const previousStatus = (existing.status || 'open') as InventoryStatus
  const eggsAllocated = existing.eggs_allocated || 0
  const deficit = nextAvailable < eggsAllocated
  const nextStatus = computeStatus(previousStatus, nextAvailable, eggsAllocated, deficit)

  const { error: updateError } = await supabaseAdmin
    .from('egg_inventory')
    .update({
      eggs_available: nextAvailable,
      status: nextStatus,
      forecast_source: 'auto',
      auto_forecast_at: nowIso,
      deficit_alert: deficit,
    })
    .eq('id', existing.id)

  if (updateError) {
    logError('egg-ops-sync-update-inventory', updateError, input)
    return { ok: false, skipped: false, reason: 'update_failed' as const, inventoryId: existing.id }
  }

  const capacityIncreased = nextAvailable > (existing.eggs_available || 0)
  const reopened = (previousStatus === 'locked' || previousStatus === 'sold_out') && nextStatus === 'open'

  if (capacityIncreased || reopened) {
    await reactivatePausedWaitlistEntries(existing.id)
    await processEggWaitlistQueue({ inventoryIds: [existing.id] })
  }

  await reconcileAlerts({
    breedId: input.breedId,
    year: input.year,
    weekNumber: input.weekNumber,
    lowStock: input.lowStock,
    deficit,
    threshold: input.threshold,
    forecastEggs: nextAvailable,
    eggsAllocated,
  })

  return { ok: true, skipped: false, inventoryId: existing.id }
}
