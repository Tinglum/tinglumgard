import { supabaseAdmin } from '@/lib/supabase/server'
import { getEggOpsConfig, getLowStockThresholdForBreed } from '@/lib/eggs/ops-config'
import { syncForecastToInventory } from '@/lib/eggs/inventory-sync'
import { logError } from '@/lib/logger'

type EggBreed = {
  id: string
  slug: string | null
  name: string
}

type ForecastRow = {
  id: string
  breed_id: string
  year: number
  week_number: number
  delivery_monday: string
  avg_14d_sellable: number
  forecast_eggs: number
  low_stock: boolean
  deficit: boolean
  computed_at: string
  created_at: string
  updated_at: string
}

function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfIsoWeek(date: Date): Date {
  const next = new Date(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next
}

function isoWeekYearAndNumber(date: Date): { year: number; week: number } {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { year: target.getUTCFullYear(), week }
}

function numberOrZero(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

async function ensureDataGapAlert(params: {
  breedId: string
  message: string
  metadata?: Record<string, unknown>
}) {
  const { data: existing } = await supabaseAdmin
    .from('egg_ops_alerts')
    .select('id')
    .eq('alert_type', 'data_gap')
    .eq('breed_id', params.breedId)
    .is('resolved_at', null)
    .limit(1)

  if (existing && existing.length > 0) {
    await supabaseAdmin
      .from('egg_ops_alerts')
      .update({
        severity: 'info',
        message: params.message,
        metadata: params.metadata || {},
      })
      .eq('id', existing[0].id)
    return
  }

  await supabaseAdmin
    .from('egg_ops_alerts')
    .insert({
      alert_type: 'data_gap',
      severity: 'info',
      breed_id: params.breedId,
      message: params.message,
      metadata: params.metadata || {},
    })
}

async function resolveDataGapAlert(breedId: string) {
  await supabaseAdmin
    .from('egg_ops_alerts')
    .update({ resolved_at: new Date().toISOString() })
    .eq('alert_type', 'data_gap')
    .eq('breed_id', breedId)
    .is('resolved_at', null)
}

async function getActiveEggBreeds(): Promise<EggBreed[]> {
  const { data, error } = await supabaseAdmin
    .from('egg_breeds')
    .select('id, slug, name')
    .eq('active', true)
    .order('display_order', { ascending: true })

  if (error) {
    throw error
  }

  return (data || []) as EggBreed[]
}

async function computeRollingAverageSellable(
  breedId: string,
  asOfDate: string,
  windowDays: number
): Promise<number> {
  const asOf = new Date(`${asOfDate}T00:00:00`)
  const start = addDays(asOf, -(windowDays - 1))
  const startDate = toDateString(start)

  const { data, error } = await supabaseAdmin
    .from('egg_daily_collections')
    .select('collection_date, sellable_standard')
    .eq('breed_id', breedId)
    .gte('collection_date', startDate)
    .lte('collection_date', asOfDate)

  if (error) {
    throw error
  }

  const byDate = new Map<string, number>()
  for (const row of data || []) {
    byDate.set(row.collection_date, numberOrZero(row.sellable_standard))
  }

  let sum = 0
  for (let i = 0; i < windowDays; i += 1) {
    const day = addDays(start, i)
    const key = toDateString(day)
    sum += byDate.get(key) || 0
  }

  return sum / windowDays
}

export async function recomputeForecastForBreed(params: {
  breedId: string
  date?: string
  weeksOverride?: number
}) {
  const config = await getEggOpsConfig()
  const asOfDate = params.date || toDateString(new Date())
  const horizonWeeks = params.weeksOverride || config.forecastHorizonWeeks

  const { data: breed } = await supabaseAdmin
    .from('egg_breeds')
    .select('id, slug, name')
    .eq('id', params.breedId)
    .maybeSingle()

  if (!breed) {
    return { ok: false, reason: 'breed_not_found' as const, created: 0, updated: 0, rows: [] as ForecastRow[] }
  }

  const avg14d = await computeRollingAverageSellable(params.breedId, asOfDate, config.forecastWindowDays)
  const forecastEggs = Math.max(0, Math.round(avg14d * 7))
  const threshold = getLowStockThresholdForBreed(breed.id, breed.slug, config)

  const twoDaysAgo = addDays(new Date(`${asOfDate}T00:00:00`), -2)
  const twoDaysAgoDate = toDateString(twoDaysAgo)
  const { data: recentRows } = await supabaseAdmin
    .from('egg_daily_collections')
    .select('collection_date')
    .eq('breed_id', params.breedId)
    .gte('collection_date', twoDaysAgoDate)
    .lte('collection_date', asOfDate)

  if (!recentRows || recentRows.length === 0) {
    await ensureDataGapAlert({
      breedId: params.breedId,
      message: `No collection rows in the last 2 days for ${breed.name}. Forecast uses historical data.`,
      metadata: {
        as_of_date: asOfDate,
        lookback_start: twoDaysAgoDate,
      },
    })
  } else {
    await resolveDataGapAlert(params.breedId)
  }

  const nowIso = new Date().toISOString()
  const startMonday = addDays(startOfIsoWeek(new Date(`${asOfDate}T00:00:00`)), 7)
  const rows: ForecastRow[] = []
  let created = 0
  let updated = 0

  for (let i = 0; i < horizonWeeks; i += 1) {
    const monday = addDays(startMonday, i * 7)
    const deliveryMonday = toDateString(monday)
    const { year, week } = isoWeekYearAndNumber(monday)
    const lowStock = forecastEggs < threshold

    const { data: forecastUpserted, error: forecastError } = await supabaseAdmin
      .from('egg_weekly_forecasts')
      .upsert(
        {
          breed_id: params.breedId,
          year,
          week_number: week,
          delivery_monday: deliveryMonday,
          avg_14d_sellable: avg14d,
          forecast_eggs: forecastEggs,
          low_stock: lowStock,
          computed_at: nowIso,
        },
        { onConflict: 'breed_id,year,week_number' }
      )
      .select('*')
      .single()

    if (forecastError || !forecastUpserted) {
      logError('egg-forecast-upsert', forecastError, { breedId: params.breedId, year, week })
      continue
    }

    if (new Date(forecastUpserted.created_at).getTime() === new Date(forecastUpserted.updated_at).getTime()) {
      created += 1
    } else {
      updated += 1
    }

    if (config.forecastSyncEnabled) {
      await syncForecastToInventory({
        breedId: params.breedId,
        year,
        weekNumber: week,
        deliveryMonday,
        forecastEggs,
        lowStock,
        threshold,
      })
    }

    const { data: inventory } = await supabaseAdmin
      .from('egg_inventory')
      .select('eggs_allocated')
      .eq('breed_id', params.breedId)
      .eq('year', year)
      .eq('week_number', week)
      .maybeSingle()

    const deficit = forecastEggs < numberOrZero(inventory?.eggs_allocated)
    const { data: forecastRow } = await supabaseAdmin
      .from('egg_weekly_forecasts')
      .update({ deficit, low_stock: lowStock })
      .eq('id', forecastUpserted.id)
      .select('*')
      .single()

    rows.push((forecastRow || forecastUpserted) as ForecastRow)
  }

  return {
    ok: true,
    reason: 'ok' as const,
    created,
    updated,
    rows,
    avg14d,
    forecastEggs,
    threshold,
  }
}

export async function recomputeForecastsForAllBreeds(params?: { date?: string; weeksOverride?: number }) {
  try {
    const breeds = await getActiveEggBreeds()
    const results = await Promise.all(
      breeds.map((breed) =>
        recomputeForecastForBreed({
          breedId: breed.id,
          date: params?.date,
          weeksOverride: params?.weeksOverride,
        })
      )
    )

    const okCount = results.filter((result) => result.ok).length
    return {
      ok: true,
      totalBreeds: breeds.length,
      processed: okCount,
      results,
    }
  } catch (error) {
    logError('egg-forecast-recompute-all', error)
    return {
      ok: false,
      totalBreeds: 0,
      processed: 0,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getForecastRows(weeks = 4) {
  const horizon = Math.max(1, Math.min(12, weeks))
  const today = new Date()
  const startMonday = addDays(startOfIsoWeek(today), 7)
  const cutoff = addDays(startMonday, horizon * 7)
  const cutoffDate = toDateString(cutoff)
  const startDate = toDateString(startMonday)

  const { data: forecasts, error: forecastError } = await supabaseAdmin
    .from('egg_weekly_forecasts')
    .select('id, breed_id, year, week_number, delivery_monday, avg_14d_sellable, forecast_eggs, low_stock, deficit, computed_at')
    .gte('delivery_monday', startDate)
    .lt('delivery_monday', cutoffDate)
    .order('delivery_monday', { ascending: true })

  if (forecastError) {
    throw forecastError
  }

  const breedIds = Array.from(new Set((forecasts || []).map((row) => row.breed_id)))
  const [breedResponse, inventoryResponse] = await Promise.all([
    supabaseAdmin
      .from('egg_breeds')
      .select('id, name, slug, accent_color')
      .in('id', breedIds.length > 0 ? breedIds : ['00000000-0000-0000-0000-000000000000']),
    supabaseAdmin
      .from('egg_inventory')
      .select('id, breed_id, year, week_number, eggs_available, eggs_allocated, status, manual_override, deficit_alert')
      .gte('delivery_monday', startDate)
      .lt('delivery_monday', cutoffDate),
  ])

  if (breedResponse.error) throw breedResponse.error
  if (inventoryResponse.error) throw inventoryResponse.error

  const breedMap = new Map((breedResponse.data || []).map((breed) => [breed.id, breed]))
  const inventoryMap = new Map(
    (inventoryResponse.data || []).map((row) => [`${row.breed_id}:${row.year}:${row.week_number}`, row])
  )

  return (forecasts || []).map((row) => {
    const key = `${row.breed_id}:${row.year}:${row.week_number}`
    const inventory = inventoryMap.get(key)
    const breed = breedMap.get(row.breed_id)

    return {
      ...row,
      breed_name: breed?.name || 'Unknown',
      breed_slug: breed?.slug || null,
      breed_accent_color: breed?.accent_color || '#111111',
      inventory_id: inventory?.id || null,
      eggs_available: inventory?.eggs_available ?? null,
      eggs_allocated: inventory?.eggs_allocated ?? null,
      inventory_status: inventory?.status || null,
      manual_override: Boolean(inventory?.manual_override),
      deficit_alert: Boolean(inventory?.deficit_alert),
    }
  })
}
