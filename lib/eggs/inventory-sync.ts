import { logError } from '@/lib/logger'
import { supabaseAdmin } from '@/lib/supabase/server'

type InventoryStatus = 'open' | 'closed' | 'locked' | 'sold_out'

export interface SyncForecastInput {
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
  auto_forecast_eggs: number
  manual_adjustment: number
  status: InventoryStatus
  manual_override: boolean
}

interface InventoryLookupRow extends InventoryRow {
  breed_id: string
  year: number
  week_number: number
}

interface InventoryAlertState {
  skipped: boolean
  alertLowStock: boolean
  alertForecastEggs: number
  eggsAllocated: number
  deficit: boolean
}

export interface InventorySyncResult {
  ok: boolean
  skipped: boolean
  reason?: 'fetch_failed' | 'insert_failed' | 'update_failed' | 'upsert_failed'
  inventoryId?: string
}

function buildInventoryKey(params: { breedId: string; year: number; weekNumber: number }) {
  return `${params.breedId}:${params.year}:${params.weekNumber}`
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

async function syncForecastToInventoryLegacy(input: SyncForecastInput): Promise<InventorySyncResult> {
  const nextAvailable = Math.max(0, Math.round(input.forecastEggs))
  const nowIso = new Date().toISOString()

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('egg_inventory')
    .select('id, eggs_available, eggs_allocated, auto_forecast_eggs, manual_adjustment, status, manual_override')
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
        auto_forecast_eggs: nextAvailable,
        manual_adjustment: 0,
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
    const adjustment = Number(existing.manual_adjustment || 0)
    const adjustedAvailable = Math.max(0, nextAvailable + adjustment)
    const previousStatus = (existing.status || 'open') as InventoryStatus
    const eggsAllocated = existing.eggs_allocated || 0
    const deficit = adjustedAvailable < eggsAllocated
    const adjustedLowStock = adjustedAvailable < input.threshold
    const nextStatus = computeStatus(previousStatus, adjustedAvailable, eggsAllocated, deficit)

    const { error: manualUpdateError } = await supabaseAdmin
      .from('egg_inventory')
      .update({
        eggs_available: adjustedAvailable,
        auto_forecast_eggs: nextAvailable,
        manual_adjustment: adjustment,
        status: nextStatus,
        forecast_source: 'manual',
        auto_forecast_at: nowIso,
        deficit_alert: deficit,
      })
      .eq('id', existing.id)

    if (manualUpdateError) {
      logError('egg-ops-sync-update-manual-adjustment', manualUpdateError, input)
      return { ok: false, skipped: false, reason: 'update_failed' as const, inventoryId: existing.id }
    }

    await reconcileAlerts({
      breedId: input.breedId,
      year: input.year,
      weekNumber: input.weekNumber,
      lowStock: adjustedLowStock,
      deficit,
      threshold: input.threshold,
      forecastEggs: adjustedAvailable,
      eggsAllocated,
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
      auto_forecast_eggs: nextAvailable,
      manual_adjustment: 0,
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

async function syncForecastBatchToInventoryLegacy(inputs: SyncForecastInput[]) {
  const entries = await Promise.all(
    inputs.map(async (input) => [buildInventoryKey(input), await syncForecastToInventoryLegacy(input)] as const)
  )
  return new Map(entries)
}

export async function syncForecastBatchToInventory(inputs: SyncForecastInput[]) {
  if (inputs.length === 0) {
    return new Map<string, InventorySyncResult>()
  }

  const breedIds = Array.from(new Set(inputs.map((input) => input.breedId)))
  const years = Array.from(new Set(inputs.map((input) => input.year)))
  const requestedKeys = new Set(inputs.map((input) => buildInventoryKey(input)))

  const { data: existingRows, error: fetchError } = await supabaseAdmin
    .from('egg_inventory')
    .select(
      'id, breed_id, year, week_number, eggs_available, eggs_allocated, auto_forecast_eggs, manual_adjustment, status, manual_override'
    )
    .in('breed_id', breedIds)
    .in('year', years)

  if (fetchError) {
    logError('egg-ops-sync-batch-fetch-inventory', fetchError, {
      breedIds,
      years,
      count: inputs.length,
    })
    return syncForecastBatchToInventoryLegacy(inputs)
  }

  const existingByKey = new Map<string, InventoryLookupRow>()
  for (const row of (existingRows || []) as InventoryLookupRow[]) {
    const key = buildInventoryKey({
      breedId: row.breed_id,
      year: row.year,
      weekNumber: row.week_number,
    })

    if (requestedKeys.has(key)) {
      existingByKey.set(key, row)
    }
  }

  const nowIso = new Date().toISOString()
  const rowsToUpsert = inputs.map((input) => {
    const key = buildInventoryKey(input)
    const existing = existingByKey.get(key)
    const nextAvailable = Math.max(0, Math.round(input.forecastEggs))

    if (!existing) {
      const status: InventoryStatus = nextAvailable <= 0 ? 'sold_out' : 'open'
      return {
        key,
        row: {
          breed_id: input.breedId,
          year: input.year,
          week_number: input.weekNumber,
          delivery_monday: input.deliveryMonday,
          eggs_available: nextAvailable,
          auto_forecast_eggs: nextAvailable,
          manual_adjustment: 0,
          eggs_allocated: 0,
          status,
          manual_override: false,
          forecast_source: 'auto',
          auto_forecast_at: nowIso,
          deficit_alert: false,
        },
        alertState: {
          skipped: false,
          alertLowStock: input.lowStock,
          alertForecastEggs: nextAvailable,
          eggsAllocated: 0,
          deficit: false,
        } satisfies InventoryAlertState,
      }
    }

    if (existing.manual_override) {
      const adjustment = Number(existing.manual_adjustment || 0)
      const adjustedAvailable = Math.max(0, nextAvailable + adjustment)
      const eggsAllocated = Number(existing.eggs_allocated || 0)
      const deficit = adjustedAvailable < eggsAllocated
      const adjustedLowStock = adjustedAvailable < input.threshold
      const nextStatus = computeStatus(existing.status || 'open', adjustedAvailable, eggsAllocated, deficit)

      return {
        key,
        row: {
          breed_id: input.breedId,
          year: input.year,
          week_number: input.weekNumber,
          delivery_monday: input.deliveryMonday,
          eggs_available: adjustedAvailable,
          auto_forecast_eggs: nextAvailable,
          manual_adjustment: adjustment,
          eggs_allocated: eggsAllocated,
          status: nextStatus,
          manual_override: true,
          forecast_source: 'manual',
          auto_forecast_at: nowIso,
          deficit_alert: deficit,
        },
        alertState: {
          skipped: true,
          alertLowStock: adjustedLowStock,
          alertForecastEggs: adjustedAvailable,
          eggsAllocated,
          deficit,
        } satisfies InventoryAlertState,
      }
    }

    const eggsAllocated = Number(existing.eggs_allocated || 0)
    const deficit = nextAvailable < eggsAllocated
    const nextStatus = computeStatus(existing.status || 'open', nextAvailable, eggsAllocated, deficit)

    return {
      key,
      row: {
        breed_id: input.breedId,
        year: input.year,
        week_number: input.weekNumber,
        delivery_monday: input.deliveryMonday,
        eggs_available: nextAvailable,
        auto_forecast_eggs: nextAvailable,
        manual_adjustment: 0,
        eggs_allocated: eggsAllocated,
        status: nextStatus,
        manual_override: false,
        forecast_source: 'auto',
        auto_forecast_at: nowIso,
        deficit_alert: deficit,
      },
      alertState: {
        skipped: false,
        alertLowStock: input.lowStock,
        alertForecastEggs: nextAvailable,
        eggsAllocated,
        deficit,
      } satisfies InventoryAlertState,
    }
  })

  const { data: upsertedRows, error: upsertError } = await supabaseAdmin
    .from('egg_inventory')
    .upsert(
      rowsToUpsert.map((entry) => entry.row),
      { onConflict: 'breed_id,year,week_number' }
    )
    .select('id, breed_id, year, week_number')

  if (upsertError) {
    logError('egg-ops-sync-batch-upsert-inventory', upsertError, {
      breedIds,
      years,
      count: inputs.length,
    })
    return syncForecastBatchToInventoryLegacy(inputs)
  }

  const inventoryIdsByKey = new Map<string, string>()
  for (const row of upsertedRows || []) {
    inventoryIdsByKey.set(
      buildInventoryKey({
        breedId: row.breed_id,
        year: row.year,
        weekNumber: row.week_number,
      }),
      row.id
    )
  }

  await Promise.allSettled(
    inputs.map(async (input) => {
      const entry = rowsToUpsert.find((candidate) => candidate.key === buildInventoryKey(input))
      if (!entry) return

      await reconcileAlerts({
        breedId: input.breedId,
        year: input.year,
        weekNumber: input.weekNumber,
        lowStock: entry.alertState.alertLowStock,
        deficit: entry.alertState.deficit,
        threshold: input.threshold,
        forecastEggs: entry.alertState.alertForecastEggs,
        eggsAllocated: entry.alertState.eggsAllocated,
      })
    })
  )

  return new Map(
    rowsToUpsert.map((entry) => [
      entry.key,
      {
        ok: true,
        skipped: entry.alertState.skipped,
        inventoryId: inventoryIdsByKey.get(entry.key),
      } satisfies InventorySyncResult,
    ])
  )
}

export async function syncForecastToInventory(input: SyncForecastInput) {
  return syncForecastToInventoryLegacy(input)
}
