/**
 * Egg forecast v2 — single code path, no buffers in the math.
 *
 * Rules:
 *  Week +1 (imminent, eggs being collected NOW)
 *    Sunday:   actual sum of week's collections — no buffer, no projection
 *    Weekday:  collected so far + (remaining days × recent daily avg)
 *
 *  Week +2:   last 1 complete collection week × BUFFER_FACTOR
 *  Week +3:   avg of last 2 complete collection weeks × BUFFER_FACTOR
 *  Week +4:   avg of last 3 complete collection weeks × BUFFER_FACTOR
 *  Week +5+:  avg of last 4 complete collection weeks × BUFFER_FACTOR
 *             → is_estimate = true (flagged for UI warning on order page)
 *
 *  Buffer factor: 0.80 (20% held back). Removed for Sunday +1 run.
 *
 *  Flock event markers: if one exists for a breed, only data on/after that
 *  date is used for averages — ignores disruption periods.
 *
 *  Divergence alerts: when a week is now 1–3 weeks out and the current
 *  estimate differs >20% from the last stored forecast for that week.
 *
 *  Structural change detection: 3 consecutive days ≥40% above/below
 *  recent daily avg → egg_ops_alert.
 *
 *  Missing day detection: a breed with entries the day before and after
 *  a day but not on that day → egg_ops_alert.
 *
 *  Floor rule: auto-forecast never reduces eggs_available below
 *  eggs_allocated once orders exist. Only manual override can do that.
 *
 *  Accuracy log: on Sunday +1 finalisation, record actual vs prior forecasts.
 */

import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

// ─── Constants ───────────────────────────────────────────────────────────────

const BUFFER_FACTOR = 0.80          // 20% buffer for week +2 and beyond
const DIVERGENCE_THRESHOLD = 0.20   // 20% difference triggers divergence alert
const STREAK_THRESHOLD = 0.40       // 40% above/below avg triggers structural alert
const STREAK_DAYS = 3               // consecutive days needed for structural alert
const HORIZON_WEEKS = 12            // how many future delivery weeks to forecast

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfIsoWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function isoWeekOf(date: Date): { year: number; week: number } {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: target.getUTCFullYear(), week }
}

function osloDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}

function isSundayOslo(date: Date): boolean {
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Oslo',
    weekday: 'short',
  }).format(date)
  return day === 'Sun'
}

function safeNum(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

// ─── Flock event marker ───────────────────────────────────────────────────────

async function getFlockEventCutoff(breedId: string, asOfDate: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('egg_flock_events')
    .select('event_date')
    .eq('breed_id', breedId)
    .lte('event_date', asOfDate)
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.event_date ?? null
}

// ─── Collection data ──────────────────────────────────────────────────────────

async function getCollectionsSince(breedId: string, fromDate: string, toDate: string) {
  const { data, error } = await supabaseAdmin
    .from('egg_daily_collections')
    .select('collection_date, sellable_standard')
    .eq('breed_id', breedId)
    .gte('collection_date', fromDate)
    .lte('collection_date', toDate)
    .order('collection_date', { ascending: true })

  if (error) throw error
  return (data || []) as { collection_date: string; sellable_standard: number }[]
}

// Build a map of date → sellable count from raw rows
function buildDayMap(rows: { collection_date: string; sellable_standard: number }[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.collection_date, safeNum(row.sellable_standard))
  }
  return map
}

// Sum a contiguous range from a day-map (missing days = 0)
function sumRange(dayMap: Map<string, number>, from: Date, to: Date): number {
  let sum = 0
  const cursor = new Date(from)
  while (cursor <= to) {
    sum += dayMap.get(toDateString(cursor)) ?? 0
    cursor.setDate(cursor.getDate() + 1)
  }
  return sum
}

// Get totals for up to N complete ISO weeks ending the week before thisWeekMonday
function getCompleteWeeklyTotals(
  dayMap: Map<string, number>,
  thisWeekMonday: Date,
  maxWeeks: number,
  cutoffDate: string | null,
): number[] {
  const totals: number[] = []
  for (let w = maxWeeks; w >= 1; w--) {
    const weekStart = addDays(thisWeekMonday, -w * 7)
    // Respect flock event cutoff: if this whole week predates the cutoff, skip it
    if (cutoffDate) {
      const weekEnd = addDays(weekStart, 6)
      if (toDateString(weekEnd) < cutoffDate) continue
      // Partial week after cutoff: only count days on/after cutoff
      const effectiveStart = toDateString(weekStart) < cutoffDate
        ? new Date(`${cutoffDate}T00:00:00`)
        : weekStart
      totals.push(sumRange(dayMap, effectiveStart, addDays(weekStart, 6)))
      continue
    }
    totals.push(sumRange(dayMap, weekStart, addDays(weekStart, 6)))
  }
  return totals
}

// Average the last N entries of an array
function avgLast(arr: number[], n: number): number {
  if (arr.length === 0) return 0
  const slice = arr.slice(-n)
  return slice.reduce((a, b) => a + b, 0) / slice.length
}

// ─── Alert helpers ────────────────────────────────────────────────────────────

async function upsertAlert(params: {
  alertType: string
  breedId: string
  year?: number
  weekNumber?: number
  severity: 'critical' | 'warning' | 'info'
  message: string
  metadata?: Record<string, unknown>
}) {
  const filter = supabaseAdmin
    .from('egg_ops_alerts')
    .select('id')
    .eq('alert_type', params.alertType)
    .eq('breed_id', params.breedId)
    .is('resolved_at', null)

  const { data: existing } = await filter.limit(1).maybeSingle()

  if (existing) {
    await supabaseAdmin
      .from('egg_ops_alerts')
      .update({ severity: params.severity, message: params.message, metadata: params.metadata ?? {} })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin.from('egg_ops_alerts').insert({
      alert_type: params.alertType,
      severity: params.severity,
      breed_id: params.breedId,
      year: params.year ?? null,
      week_number: params.weekNumber ?? null,
      message: params.message,
      metadata: params.metadata ?? {},
    })
  }
}

async function resolveAlert(alertType: string, breedId: string, weekNumber?: number) {
  const q = supabaseAdmin
    .from('egg_ops_alerts')
    .update({ resolved_at: new Date().toISOString() })
    .eq('alert_type', alertType)
    .eq('breed_id', breedId)
    .is('resolved_at', null)
  if (weekNumber != null) q.eq('week_number', weekNumber)
  await q
}

// ─── Structural change detection ──────────────────────────────────────────────

async function checkStructuralChange(
  breedId: string,
  breedName: string,
  dayMap: Map<string, number>,
  asOfDate: string,
  recentDailyAvg: number,
) {
  if (recentDailyAvg === 0) return

  // Look at last STREAK_DAYS days ending today
  const streakDays: number[] = []
  for (let i = STREAK_DAYS - 1; i >= 0; i--) {
    const d = toDateString(addDays(new Date(`${asOfDate}T00:00:00`), -i))
    streakDays.push(dayMap.get(d) ?? 0)
  }

  if (streakDays.some(v => v === 0)) return // gap in data, skip

  const streakAvg = streakDays.reduce((a, b) => a + b, 0) / streakDays.length
  const ratio = (streakAvg - recentDailyAvg) / recentDailyAvg

  if (Math.abs(ratio) >= STREAK_THRESHOLD) {
    const direction = ratio > 0 ? 'above' : 'below'
    const pct = Math.round(Math.abs(ratio) * 100)
    await upsertAlert({
      alertType: 'structural_change',
      breedId,
      severity: 'warning',
      message: `${breedName}: ${STREAK_DAYS} consecutive days ${pct}% ${direction} recent average (avg ${recentDailyAvg.toFixed(1)}/day, recent ${streakAvg.toFixed(1)}/day). Possible flock change.`,
      metadata: { recent_daily_avg: recentDailyAvg, streak_avg: streakAvg, ratio, as_of: asOfDate },
    })
  } else {
    await resolveAlert('structural_change', breedId)
  }
}

// ─── Missing day detection ────────────────────────────────────────────────────

async function checkMissingDays(
  breedId: string,
  breedName: string,
  dayMap: Map<string, number>,
  asOfDate: string,
) {
  // Check last 3 days: if middle day is missing but surrounding days have entries
  const yesterday = toDateString(addDays(new Date(`${asOfDate}T00:00:00`), -1))
  const dayBefore = toDateString(addDays(new Date(`${asOfDate}T00:00:00`), -2))
  const twoDaysBefore = toDateString(addDays(new Date(`${asOfDate}T00:00:00`), -3))

  const hasTwoDaysBefore = dayMap.has(twoDaysBefore)
  const hasDayBefore = dayMap.has(dayBefore)
  const hasYesterday = dayMap.has(yesterday)

  // Gap = day before yesterday has no entry, but surrounding days do
  if (hasTwoDaysBefore && !hasDayBefore && hasYesterday) {
    await upsertAlert({
      alertType: 'data_gap',
      breedId,
      severity: 'info',
      message: `${breedName}: no collection entry for ${dayBefore}. Was this day missed? Forecast is using 0 for that day.`,
      metadata: { missing_date: dayBefore },
    })
  } else {
    await resolveAlert('data_gap', breedId)
  }
}

// ─── Divergence check ─────────────────────────────────────────────────────────

async function checkDivergence(
  breedId: string,
  breedName: string,
  year: number,
  weekNumber: number,
  deliveryMonday: string,
  weeksOut: number,
  newForecast: number,
) {
  if (weeksOut > 3) return // only flag when close

  // Look up the previous stored forecast for this week
  const { data: prev } = await supabaseAdmin
    .from('egg_inventory')
    .select('eggs_available, auto_forecast_eggs')
    .eq('breed_id', breedId)
    .eq('year', year)
    .eq('week_number', weekNumber)
    .maybeSingle()

  if (!prev) return
  const prevForecast = safeNum(prev.auto_forecast_eggs || prev.eggs_available)
  if (prevForecast === 0) return

  const divergence = (newForecast - prevForecast) / prevForecast
  const pct = Math.round(divergence * 100)

  if (Math.abs(divergence) >= DIVERGENCE_THRESHOLD) {
    const direction = divergence > 0 ? 'higher' : 'lower'
    await upsertAlert({
      alertType: 'forecast_divergence',
      breedId,
      year,
      weekNumber,
      severity: weeksOut === 1 ? 'critical' : 'warning',
      message: `${breedName} week ${weekNumber}: forecast revised to ${newForecast} (${Math.abs(pct)}% ${direction} than previous ${prevForecast}). ${weeksOut} week${weeksOut === 1 ? '' : 's'} to delivery.`,
      metadata: { prev_forecast: prevForecast, new_forecast: newForecast, divergence_pct: pct, weeks_out: weeksOut, delivery_monday: deliveryMonday },
    })
  } else {
    await resolveAlert('forecast_divergence', breedId, weekNumber)
  }
}

// ─── Accuracy log ─────────────────────────────────────────────────────────────

async function updateAccuracyLog(
  breedId: string,
  year: number,
  weekNumber: number,
  deliveryMonday: string,
  weeksOut: number,
  forecastValue: number,
  actualEggs?: number,
) {
  const columnMap: Record<number, string> = {
    1: 'forecast_1wk_out',
    2: 'forecast_2wk_out',
    3: 'forecast_3wk_out',
    4: 'forecast_4wk_out',
  }
  const col = columnMap[weeksOut]

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (col) update[col] = forecastValue
  if (weeksOut === 1 && actualEggs != null) {
    update['actual_eggs'] = actualEggs
    update['finalised_at'] = new Date().toISOString()
  }
  if (weeksOut >= 5) update['forecast_5wk_out'] = forecastValue

  await supabaseAdmin
    .from('egg_forecast_accuracy_log')
    .upsert(
      { breed_id: breedId, year, week_number: weekNumber, delivery_monday: deliveryMonday, ...update },
      { onConflict: 'breed_id,year,week_number' },
    )
}

// ─── Inventory write ──────────────────────────────────────────────────────────

async function writeInventory(params: {
  breedId: string
  year: number
  weekNumber: number
  deliveryMonday: string
  eggsAvailable: number
  isEstimate: boolean
  divergenceAlert: boolean
  divergencePct: number | null
}) {
  const { data: existing } = await supabaseAdmin
    .from('egg_inventory')
    .select('id, eggs_allocated, manual_override, status')
    .eq('breed_id', params.breedId)
    .eq('year', params.year)
    .eq('week_number', params.weekNumber)
    .maybeSingle()

  // Floor: never auto-reduce below already-allocated eggs
  const eggsAllocated = safeNum(existing?.eggs_allocated)
  const safeAvailable = existing && eggsAllocated > 0
    ? Math.max(params.eggsAvailable, eggsAllocated)
    : params.eggsAvailable

  if (existing?.manual_override) {
    // Manual override: only update metadata flags, never touch eggs_available
    await supabaseAdmin
      .from('egg_inventory')
      .update({
        is_estimate: params.isEstimate,
        divergence_alert: params.divergenceAlert,
        divergence_pct: params.divergencePct,
        auto_forecast_eggs: params.eggsAvailable,
        auto_forecast_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return
  }

  const prevStatus = (existing?.status ?? 'open') as string
  const status = prevStatus === 'closed' ? 'closed'
    : safeAvailable < eggsAllocated ? 'locked'
    : safeAvailable <= eggsAllocated ? 'sold_out'
    : 'open'

  if (existing) {
    await supabaseAdmin
      .from('egg_inventory')
      .update({
        eggs_available: safeAvailable,
        auto_forecast_eggs: params.eggsAvailable,
        auto_forecast_at: new Date().toISOString(),
        forecast_source: 'auto',
        status,
        is_estimate: params.isEstimate,
        divergence_alert: params.divergenceAlert,
        divergence_pct: params.divergencePct,
        deficit_alert: safeAvailable < eggsAllocated,
      })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin
      .from('egg_inventory')
      .insert({
        breed_id: params.breedId,
        year: params.year,
        week_number: params.weekNumber,
        delivery_monday: params.deliveryMonday,
        eggs_available: safeAvailable,
        eggs_allocated: 0,
        auto_forecast_eggs: params.eggsAvailable,
        auto_forecast_at: new Date().toISOString(),
        forecast_source: 'auto',
        manual_override: false,
        manual_adjustment: 0,
        status: safeAvailable > 0 ? 'open' : 'sold_out',
        is_estimate: params.isEstimate,
        divergence_alert: params.divergenceAlert,
        divergence_pct: params.divergencePct,
        deficit_alert: false,
      })
  }
}

// ─── Core per-breed recompute ─────────────────────────────────────────────────

export async function recomputeForecastForBreed(params: {
  breedId: string
  date?: string
  weeksOverride?: number
}) {
  const { breedId } = params
  const asOfDate = params.date ?? osloDateString(new Date())
  const horizonWeeks = params.weeksOverride ?? HORIZON_WEEKS
  const isSunday = isSundayOslo(new Date(`${asOfDate}T12:00:00`))

  // 1. Load breed
  const { data: breed } = await supabaseAdmin
    .from('egg_breeds')
    .select('id, slug, name')
    .eq('id', breedId)
    .maybeSingle()

  if (!breed) return { ok: false, reason: 'breed_not_found' as const }

  // 2. Flock event cutoff
  const cutoffDate = await getFlockEventCutoff(breedId, asOfDate)

  // 3. Load all relevant collection data
  const asOf = new Date(`${asOfDate}T00:00:00`)
  const thisWeekMonday = startOfIsoWeek(asOf)
  const lookbackStart = cutoffDate
    ? new Date(`${cutoffDate}T00:00:00`)
    : addDays(thisWeekMonday, -(4 * 7)) // max 4 complete weeks back + current week
  const collectionsFrom = toDateString(lookbackStart)

  const rows = await getCollectionsSince(breedId, collectionsFrom, asOfDate)
  const dayMap = buildDayMap(rows)

  // 4. Complete weekly totals (weeks before this one)
  const weeklyTotals = getCompleteWeeklyTotals(dayMap, thisWeekMonday, 4, cutoffDate)

  // 5. Recent daily average (for projection on non-Sunday +1 and structural check)
  const totalCollectedInWindow = weeklyTotals.reduce((a, b) => a + b, 0)
  const windowDays = weeklyTotals.length * 7
  const recentDailyAvg = windowDays > 0 ? totalCollectedInWindow / windowDays : 0

  // If there is no collection data at all, do not overwrite existing inventory rows
  // with a 0-egg forecast — the farm simply hasn't entered data yet, not that they
  // have 0 eggs. Admin-set values must be preserved until real data arrives.
  const hasCollectionData = rows.length > 0

  // 6. Structural change and missing day checks
  await checkStructuralChange(breedId, breed.name, dayMap, asOfDate, recentDailyAvg)
  await checkMissingDays(breedId, breed.name, dayMap, asOfDate)

  // 7. Compute and write each delivery week
  const nowIso = new Date().toISOString()

  for (let i = 0; i < horizonWeeks; i++) {
    const deliveryMonday = addDays(thisWeekMonday, (i + 1) * 7)
    const deliveryMondayStr = toDateString(deliveryMonday)
    const { year, week: weekNumber } = isoWeekOf(deliveryMonday)
    const weekOffset = i + 1 // 1 = next Monday, 2 = week after, etc.
    const isEstimate = weekOffset > 4

    let eggsAvailable: number

    if (weekOffset === 1) {
      // Imminent week: use actual collected + projection if not Sunday
      const collectedSoFar = sumRange(dayMap, thisWeekMonday, asOf)

      if (isSunday) {
        // Full week collected — lock in actual, no buffer
        eggsAvailable = collectedSoFar
      } else {
        // Project remaining days at recent daily avg
        const isoDayIndex = asOf.getDay() === 0 ? 6 : asOf.getDay() - 1
        const daysRemaining = 6 - isoDayIndex
        const projected = Math.round(recentDailyAvg * daysRemaining)
        eggsAvailable = collectedSoFar + projected
        // Light 10% buffer mid-week (collection not complete yet)
        eggsAvailable = Math.round(eggsAvailable * 0.90)
      }
    } else {
      // Future weeks: average of recent complete weeks × BUFFER_FACTOR
      const weeksToUse = weekOffset === 2 ? 1 : weekOffset === 3 ? 2 : weekOffset === 4 ? 3 : 4
      const avg = avgLast(weeklyTotals, weeksToUse)
      eggsAvailable = Math.round(avg * BUFFER_FACTOR)
    }

    eggsAvailable = Math.max(0, eggsAvailable)

    // If forecast is 0 and we have no collection data, skip the write entirely.
    // This prevents zeroing out admin-configured inventory when the farm hasn't
    // entered collection batches yet.
    if (!hasCollectionData && eggsAvailable === 0) continue

    // 8. Divergence check (weeks 1–3 only)
    let divergenceAlert = false
    let divergencePct: number | null = null

    if (weekOffset <= 3) {
      const { data: prev } = await supabaseAdmin
        .from('egg_inventory')
        .select('auto_forecast_eggs, eggs_available')
        .eq('breed_id', breedId)
        .eq('year', year)
        .eq('week_number', weekNumber)
        .maybeSingle()

      if (prev) {
        const prevForecast = safeNum(prev.auto_forecast_eggs || prev.eggs_available)
        if (prevForecast > 0) {
          const divergence = (eggsAvailable - prevForecast) / prevForecast
          divergencePct = Math.round(divergence * 100)
          if (Math.abs(divergence) >= DIVERGENCE_THRESHOLD) {
            divergenceAlert = true
            await checkDivergence(breedId, breed.name, year, weekNumber, deliveryMondayStr, weekOffset, eggsAvailable)
          } else {
            await resolveAlert('forecast_divergence', breedId, weekNumber)
          }
        }
      }
    }

    // 9. Write to inventory
    await writeInventory({
      breedId,
      year,
      weekNumber,
      deliveryMonday: deliveryMondayStr,
      eggsAvailable,
      isEstimate,
      divergenceAlert,
      divergencePct,
    })

    // 10. Accuracy log
    await updateAccuracyLog(
      breedId, year, weekNumber, deliveryMondayStr,
      weekOffset,
      eggsAvailable,
      weekOffset === 1 && isSunday ? eggsAvailable : undefined,
    )
  }

  return { ok: true, reason: 'ok' as const, breedId, breedName: breed.name, isSunday }
}

// ─── All breeds ───────────────────────────────────────────────────────────────

export async function recomputeForecastsForAllBreeds(params?: { date?: string; weeksOverride?: number }) {
  try {
    const { data: breeds, error } = await supabaseAdmin
      .from('egg_breeds')
      .select('id, slug, name')
      .eq('active', true)
      .order('display_order', { ascending: true })

    if (error) throw error

    const results = await Promise.all(
      (breeds || []).map((breed) =>
        recomputeForecastForBreed({ breedId: breed.id, date: params?.date, weeksOverride: params?.weeksOverride })
          .catch((err) => {
            logError('egg-forecast-v2-breed', err, { breedId: breed.id })
            return { ok: false, reason: 'exception' as const, breedId: breed.id }
          })
      )
    )

    return {
      ok: true,
      totalBreeds: breeds?.length ?? 0,
      processed: results.filter((r) => r.ok).length,
      results,
    }
  } catch (error) {
    logError('egg-forecast-v2-all', error)
    return { ok: false, totalBreeds: 0, processed: 0, results: [] }
  }
}

// ─── getForecastRows (used by GET /api/admin/eggs/forecast) ──────────────────

export async function getForecastRows(weeks = 4) {
  const horizon = Math.max(1, Math.min(12, weeks))
  const today = new Date()
  const startMonday = addDays(startOfIsoWeek(today), 7)
  const cutoff = addDays(startMonday, horizon * 7)

  const { data: inventoryRows, error } = await supabaseAdmin
    .from('egg_inventory')
    .select(`
      id, breed_id, year, week_number, delivery_monday,
      eggs_available, eggs_allocated, auto_forecast_eggs,
      status, manual_override, deficit_alert, is_estimate,
      divergence_alert, divergence_pct
    `)
    .gte('delivery_monday', toDateString(startMonday))
    .lt('delivery_monday', toDateString(cutoff))
    .order('delivery_monday', { ascending: true })

  if (error) throw error

  const breedIds = Array.from(new Set((inventoryRows || []).map((r) => r.breed_id)))
  const { data: breeds } = await supabaseAdmin
    .from('egg_breeds')
    .select('id, name, slug, accent_color')
    .in('id', breedIds.length > 0 ? breedIds : ['00000000-0000-0000-0000-000000000000'])

  const breedMap = new Map((breeds || []).map((b) => [b.id, b]))

  return (inventoryRows || []).map((row) => {
    const breed = breedMap.get(row.breed_id)
    return {
      ...row,
      breed_name: breed?.name ?? 'Unknown',
      breed_slug: breed?.slug ?? null,
      breed_accent_color: breed?.accent_color ?? '#111111',
    }
  })
}
