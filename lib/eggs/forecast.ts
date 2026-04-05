import { supabaseAdmin } from '@/lib/supabase/server'
import { getEggOpsConfig, getLowStockThresholdForBreed } from '@/lib/eggs/ops-config'
import { syncForecastBatchToInventory, type SyncForecastInput } from '@/lib/eggs/inventory-sync'
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

type ForecastPlanRow = {
  year: number
  week: number
  deliveryMonday: string
  avgForRow: number
  forecastEggs: number
  lowStock: boolean
}

function buildInventoryKey(breedId: string, year: number, weekNumber: number) {
  return `${breedId}:${year}:${weekNumber}`
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

function getOsloDateAndHour(date: Date): { date: string; hour: number } {
  const dateInOslo = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

  const hourText = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Oslo',
    hour: '2-digit',
    hour12: false,
  }).format(date)

  return {
    date: dateInOslo,
    hour: Number.parseInt(hourText, 10),
  }
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

async function computeRecentWeeklySellableTotals(
  breedId: string,
  asOfDate: string,
  weekCount: number
): Promise<number[]> {
  const asOf = new Date(`${asOfDate}T00:00:00`)
  const thisWeekMonday = startOfIsoWeek(asOf)
  const startDate = toDateString(addDays(thisWeekMonday, -weekCount * 7))
  const endDate = toDateString(addDays(thisWeekMonday, -1))

  const { data, error } = await supabaseAdmin
    .from('egg_daily_collections')
    .select('collection_date, sellable_standard')
    .eq('breed_id', breedId)
    .gte('collection_date', startDate)
    .lte('collection_date', endDate)

  if (error) {
    throw error
  }

  const byDate = new Map<string, number>()
  for (const row of data || []) {
    byDate.set(row.collection_date, numberOrZero(row.sellable_standard))
  }

  const totals: number[] = []
  for (let w = weekCount; w >= 1; w -= 1) {
    const weekStart = addDays(thisWeekMonday, -w * 7)
    let weekSum = 0
    for (let day = 0; day < 7; day += 1) {
      weekSum += byDate.get(toDateString(addDays(weekStart, day))) || 0
    }
    totals.push(weekSum)
  }

  return totals
}

function computeLinearSlope(values: number[]): number {
  if (values.length < 2) return 0
  return (values[values.length - 1] - values[0]) / (values.length - 1)
}

function resolveExpectedAdditionsFromEntry(entry: unknown, weekAhead: number): number | undefined {
  if (typeof entry === 'number' && Number.isFinite(entry)) {
    return Math.round(entry)
  }

  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return undefined
  }

  const map = entry as Record<string, unknown>
  const exact = map[String(weekAhead)]
  if (typeof exact === 'number' && Number.isFinite(exact)) {
    return Math.round(exact)
  }

  const fallback = map.default
  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return Math.round(fallback)
  }

  return undefined
}

function getExpectedAdditionsForWeek(params: {
  expectedAdditions: Record<string, unknown>
  breedId: string
  breedSlug: string | null
  weekAhead: number
}): number {
  const candidates = [
    params.expectedAdditions[params.breedId],
    params.breedSlug ? params.expectedAdditions[params.breedSlug] : undefined,
    params.expectedAdditions.default,
  ]

  for (const candidate of candidates) {
    const value = resolveExpectedAdditionsFromEntry(candidate, params.weekAhead)
    if (value !== undefined) return Math.max(0, value)
  }

  return 0
}

function scaleExpectedAdditions(value: number): number {
  return Math.max(0, Math.round(value * 0.5))
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
  const recentWeeklyTotals = await computeRecentWeeklySellableTotals(params.breedId, asOfDate, 4)
  const lastTwoWeekTotals = recentWeeklyTotals.slice(-2)
  const twoWeekAverage =
    lastTwoWeekTotals.length > 0
      ? lastTwoWeekTotals.reduce((sum, value) => sum + value, 0) / lastTwoWeekTotals.length
      : Math.round(avg14d * 7)
  const fourWeekTrendSlope = computeLinearSlope(recentWeeklyTotals)
  const shortHorizonWeeks = Math.max(1, Math.min(config.forecastShortHorizonWeeks, horizonWeeks))
  const firstWeekForecastEggs = Math.max(0, Math.round(twoWeekAverage) - config.forecastShortHorizonBufferEggs)
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
  // ── Current collection week (Mon..today) updates next delivery Monday row ─
  // Use actual collected so far + projected production for remaining days.
  if (config.forecastSyncEnabled) {
    const thisWeekMonday = startOfIsoWeek(new Date(`${asOfDate}T00:00:00`))
    const thisWeekMondayStr = toDateString(thisWeekMonday)
    const deliveryWeekMonday = addDays(thisWeekMonday, 7)
    const { year: deliveryYear, week: deliveryWeek } = isoWeekYearAndNumber(deliveryWeekMonday)

    const { data: thisWeekCollections } = await supabaseAdmin
      .from('egg_daily_collections')
      .select('sellable_standard')
      .eq('breed_id', params.breedId)
      .gte('collection_date', thisWeekMondayStr)
      .lte('collection_date', asOfDate)

    const collectedSoFar = (thisWeekCollections || []).reduce(
      (sum, r) => sum + numberOrZero(r.sellable_standard),
      0
    )

    const asOf = new Date(`${asOfDate}T00:00:00`)
    const jsDay = asOf.getDay() // 0=Sun, 1=Mon, ... 6=Sat
    const isoDayIndex = jsDay === 0 ? 6 : jsDay - 1 // Mon=0 ... Sun=6
    const daysAfterToday = Math.max(0, 6 - isoDayIndex)
    const osloNow = getOsloDateAndHour(new Date())
    const includeTodayProjection = asOfDate === osloNow.date && osloNow.hour < 20
    const projectedDays = daysAfterToday + (includeTodayProjection ? 1 : 0)
    const projectedRemaining = Math.max(0, Math.round(avg14d * projectedDays))
    const currentWeekForecastEggs = Math.max(
      0,
      collectedSoFar + projectedRemaining - config.forecastCurrentWeekBufferEggs
    )

    const { data: cwInventory } = await supabaseAdmin
      .from('egg_inventory')
      .select('id, eggs_allocated, status')
      .eq('breed_id', params.breedId)
      .eq('year', deliveryYear)
      .eq('week_number', deliveryWeek)
      .maybeSingle()

    if (cwInventory) {
      const eggsAllocated = numberOrZero(cwInventory.eggs_allocated)
      const previousStatus = (cwInventory.status || 'open') as 'open' | 'closed' | 'locked' | 'sold_out'
      const deficit = currentWeekForecastEggs < eggsAllocated
      const nextStatus =
        previousStatus === 'closed' ? 'closed'
        : deficit ? 'locked'
        : currentWeekForecastEggs <= eggsAllocated ? 'sold_out'
        : 'open'

      await supabaseAdmin
        .from('egg_inventory')
        .update({ eggs_available: currentWeekForecastEggs, status: nextStatus })
        .eq('id', cwInventory.id)
    }
  }

  const plans: ForecastPlanRow[] = []
  for (let i = 0; i < horizonWeeks; i += 1) {
    const monday = addDays(startMonday, i * 7)
    const deliveryMonday = toDateString(monday)
    const { year, week } = isoWeekYearAndNumber(monday)
    const weekAhead = i + 1
    const isShortHorizon = weekAhead <= shortHorizonWeeks
    const trendWeeksAhead = Math.max(0, weekAhead - shortHorizonWeeks)
    const trendBase = twoWeekAverage + (fourWeekTrendSlope * trendWeeksAhead)
    const expectedAdditions = isShortHorizon
      ? 0
      : scaleExpectedAdditions(
          getExpectedAdditionsForWeek({
            expectedAdditions: config.forecastExpectedAdditions,
            breedId: params.breedId,
            breedSlug: breed.slug,
            weekAhead,
          })
        )

    const rawForecastEggs = isShortHorizon
      ? Math.round(twoWeekAverage)
      : Math.round(trendBase + expectedAdditions)

    const forecastEggs = Math.max(
      0,
      rawForecastEggs - (isShortHorizon ? config.forecastShortHorizonBufferEggs : config.forecastLongHorizonBufferEggs)
    )
    const avgForRow = Math.max(0, (isShortHorizon ? twoWeekAverage : trendBase) / 7)
    const lowStock = forecastEggs < threshold

    plans.push({
      year,
      week,
      deliveryMonday,
      avgForRow,
      forecastEggs,
      lowStock,
    })
  }

  const inventoryYears = Array.from(new Set(plans.map((plan) => plan.year)))
  const inventoryByKey = new Map<string, { eggs_allocated: number }>()

  if (inventoryYears.length > 0) {
    const { data: inventoryRows, error: inventoryError } = await supabaseAdmin
      .from('egg_inventory')
      .select('breed_id, year, week_number, eggs_allocated')
      .eq('breed_id', params.breedId)
      .in('year', inventoryYears)

    if (inventoryError) {
      logError('egg-forecast-fetch-inventory-allocations', inventoryError, {
        breedId: params.breedId,
        years: inventoryYears,
      })
    } else {
      for (const row of inventoryRows || []) {
        inventoryByKey.set(buildInventoryKey(row.breed_id, row.year, row.week_number), row)
      }
    }
  }

  const rows: ForecastRow[] = []
  const syncInputs: SyncForecastInput[] = []
  let created = 0
  let updated = 0

  for (const plan of plans) {
    const eggsAllocated = numberOrZero(
      inventoryByKey.get(buildInventoryKey(params.breedId, plan.year, plan.week))?.eggs_allocated
    )
    const deficit = plan.forecastEggs < eggsAllocated
    const { data: forecastUpserted, error: forecastError } = await supabaseAdmin
      .from('egg_weekly_forecasts')
      .upsert(
        {
          breed_id: params.breedId,
          year: plan.year,
          week_number: plan.week,
          delivery_monday: plan.deliveryMonday,
          avg_14d_sellable: plan.avgForRow,
          forecast_eggs: plan.forecastEggs,
          low_stock: plan.lowStock,
          deficit,
          computed_at: nowIso,
        },
        { onConflict: 'breed_id,year,week_number' }
      )
      .select('*')
      .single()

    if (forecastError || !forecastUpserted) {
      logError('egg-forecast-upsert', forecastError, {
        breedId: params.breedId,
        year: plan.year,
        week: plan.week,
      })
      continue
    }

    if (new Date(forecastUpserted.created_at).getTime() === new Date(forecastUpserted.updated_at).getTime()) {
      created += 1
    } else {
      updated += 1
    }

    if (config.forecastSyncEnabled) {
      syncInputs.push({
        breedId: params.breedId,
        year: plan.year,
        weekNumber: plan.week,
        deliveryMonday: plan.deliveryMonday,
        forecastEggs: plan.forecastEggs,
        lowStock: plan.lowStock,
        threshold,
      })
    }
    rows.push(forecastUpserted as ForecastRow)
  }

  if (config.forecastSyncEnabled && syncInputs.length > 0) {
    await syncForecastBatchToInventory(syncInputs)
  }

  return {
    ok: true,
    reason: 'ok' as const,
    created,
    updated,
    rows,
    avg14d,
    forecastEggs: firstWeekForecastEggs,
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
