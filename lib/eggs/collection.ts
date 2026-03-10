import type { SessionData } from '@/lib/auth/session'
import { getSessionRole } from '@/lib/auth/roles'
import { getEggOpsConfig } from '@/lib/eggs/ops-config'
import { logError } from '@/lib/logger'
import { supabaseAdmin } from '@/lib/supabase/server'

export interface EggDailyInput {
  collection_date: string
  breed_id: string
  total_collected: number
  sellable_standard: number
  too_small: number
  dirty: number
  cracked: number
  shell_defect: number
  other_unsellable: number
  notes?: string | null
  reason?: string | null
}

export class EggCollectionError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

function isMissingRelationError(error: any): boolean {
  const code = String(error?.code || '')
  const message = String(error?.message || '').toLowerCase()
  return code === '42P01' || message.includes('does not exist')
}

function isMissingColumnError(error: any): boolean {
  const code = String(error?.code || '')
  return code === '42703'
}

export type EggOpsDayStatus = 'open' | 'in_progress' | 'closed'

export type EggOpsBulkAction =
  | 'set_notes'
  | 'clear_notes'
  | 'reset_unsellable'
  | 'set_same_totals'

type AnomalyCheckResult = {
  flagged: boolean
  averageRate: number
  currentRate: number
  sampleSize: number
}

function getActor(session: SessionData | null | undefined): string {
  if (!session) return 'eggops-public'
  return session.email || session.name || session.userId || 'eggops-public'
}

function numberOrZero(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function getOsloDateString(date?: Date): string {
  const target = date || new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(target)
}

function daysOld(dateString: string): number {
  const today = new Date(`${getOsloDateString()}T00:00:00`)
  const value = new Date(`${dateString}T00:00:00`)
  const diff = today.getTime() - value.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function ensureWithinCorrectionWindow(session: SessionData | null | undefined, dateString: string, reason?: string | null) {
  const age = daysOld(dateString)
  const role = getSessionRole(session)

  if (age <= 3) return
  if (role === 'admin') {
    if (!reason || reason.trim().length < 3) {
      throw new EggCollectionError('Reason is required when editing entries older than 3 days', 400)
    }
    return
  }

  throw new EggCollectionError('Only admin can edit entries older than 3 days', 403)
}

async function getDayState(dateString: string) {
  const { data, error } = await supabaseAdmin
    .from('egg_ops_day_states')
    .select('*')
    .eq('collection_date', dateString)
    .maybeSingle()

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        id: null,
        collection_date: dateString,
        status: 'open' as EggOpsDayStatus,
        closed_at: null,
        closed_by: null,
        reopened_at: null,
        reopened_by: null,
        reopen_reason: null,
        created_at: null,
        updated_at: null,
      }
    }
    throw error
  }

  if (data) return data

  return {
    id: null,
    collection_date: dateString,
    status: 'open' as EggOpsDayStatus,
    closed_at: null,
    closed_by: null,
    reopened_at: null,
    reopened_by: null,
    reopen_reason: null,
    created_at: null,
    updated_at: null,
  }
}

async function ensureDayWritable(
  session: SessionData | null | undefined,
  dateString: string,
  reason?: string | null
) {
  const dayState = await getDayState(dateString)
  if (dayState.status !== 'closed') return

  const role = getSessionRole(session)
  if (role === 'admin' && reason && reason.trim().length >= 3) return

  throw new EggCollectionError('Day is closed. Reopen day before changing rows.', 409)
}

function roundPercent(value: number): number {
  return Math.round(value * 1000) / 10
}

async function evaluateAnomalyForRow(input: EggDailyInput): Promise<AnomalyCheckResult> {
  const config = await getEggOpsConfig()
  const targetDate = new Date(`${input.collection_date}T00:00:00`)
  const start = new Date(targetDate)
  start.setDate(start.getDate() - 14)
  const startDate = start.toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('egg_daily_collections')
    .select('collection_date, total_collected, sellable_standard')
    .eq('breed_id', input.breed_id)
    .gte('collection_date', startDate)
    .lt('collection_date', input.collection_date)

  if (error) throw error

  const validRates = (data || [])
    .map((row) => {
      const total = numberOrZero(row.total_collected)
      const sellable = numberOrZero(row.sellable_standard)
      if (total <= 0) return null
      return sellable / total
    })
    .filter((value): value is number => typeof value === 'number')

  const currentTotal = numberOrZero(input.total_collected)
  const currentSellable = numberOrZero(input.sellable_standard)
  const currentRate = currentTotal > 0 ? currentSellable / currentTotal : 0

  if (validRates.length < 3) {
    return {
      flagged: false,
      averageRate: currentRate,
      currentRate,
      sampleSize: validRates.length,
    }
  }

  const averageRate = validRates.reduce((sum, value) => sum + value, 0) / validRates.length
  const dropThreshold = Math.max(0.01, config.anomalyDropThresholdPercent / 100)
  const spikeThreshold = Math.max(0.01, config.anomalySpikeThresholdPercent / 100)

  const isDrop = currentRate < averageRate * (1 - dropThreshold)
  const isSpike = currentRate > averageRate * (1 + spikeThreshold)
  const absoluteChange = Math.abs(currentRate - averageRate)

  return {
    flagged: (isDrop || isSpike) && absoluteChange >= 0.08,
    averageRate,
    currentRate,
    sampleSize: validRates.length,
  }
}

async function ensureAnomalyReasonIfNeeded(input: EggDailyInput) {
  const reason = input.reason?.trim()
  if (reason && reason.length >= 3) return

  const anomaly = await evaluateAnomalyForRow(input)
  if (!anomaly.flagged) return

  throw new EggCollectionError(
    `Anomaly detected in sellable rate (${roundPercent(anomaly.currentRate)}% vs ${roundPercent(
      anomaly.averageRate
    )}% avg). Add a reason before saving.`,
    400
  )
}

function validateDailyPayload(input: EggDailyInput) {
  if (!input.collection_date || !/^\d{4}-\d{2}-\d{2}$/.test(input.collection_date)) {
    throw new EggCollectionError('Invalid collection_date format')
  }
  if (!input.breed_id) {
    throw new EggCollectionError('Missing breed_id')
  }

  const normalized = {
    total_collected: numberOrZero(input.total_collected),
    sellable_standard: numberOrZero(input.sellable_standard),
    too_small: numberOrZero(input.too_small),
    dirty: numberOrZero(input.dirty),
    cracked: numberOrZero(input.cracked),
    shell_defect: numberOrZero(input.shell_defect),
    other_unsellable: numberOrZero(input.other_unsellable),
  }

  const values = Object.values(normalized)
  if (values.some((value) => value < 0)) {
    throw new EggCollectionError('All numeric fields must be >= 0')
  }

  const totalBreakdown =
    normalized.sellable_standard +
    normalized.too_small +
    normalized.dirty +
    normalized.cracked +
    normalized.shell_defect +
    normalized.other_unsellable

  if (totalBreakdown !== normalized.total_collected) {
    throw new EggCollectionError('sum(categories + sellable_standard) must equal total_collected')
  }

  return normalized
}

export async function getEggDailyCollections(date?: string) {
  const targetDate = date || getOsloDateString()
  const trendStart = new Date(`${targetDate}T00:00:00`)
  trendStart.setDate(trendStart.getDate() - 13)
  const trendStartDate = trendStart.toISOString().split('T')[0]

  const [breedsResult, dayRowsResult, trendRowsResult, forecastResult] = await Promise.all([
    supabaseAdmin
      .from('egg_breeds')
      .select('id, name, slug, accent_color')
      .eq('active', true)
      .order('display_order', { ascending: true }),
    supabaseAdmin
      .from('egg_daily_collections')
      .select('*')
      .eq('collection_date', targetDate),
    supabaseAdmin
      .from('egg_daily_collections')
      .select('collection_date, breed_id, sellable_standard')
      .gte('collection_date', trendStartDate)
      .lte('collection_date', targetDate),
    supabaseAdmin
      .from('egg_weekly_forecasts')
      .select('delivery_monday, forecast_eggs, low_stock')
      .gte('delivery_monday', targetDate)
      .order('delivery_monday', { ascending: true })
      .limit(80),
  ])

  if (breedsResult.error) throw breedsResult.error
  if (dayRowsResult.error) throw dayRowsResult.error
  if (trendRowsResult.error) throw trendRowsResult.error
  if (forecastResult.error) throw forecastResult.error

  let dayState: any = {
    collection_date: targetDate,
    status: 'open',
    closed_at: null,
    closed_by: null,
    reopened_at: null,
    reopened_by: null,
    reopen_reason: null,
  }

  const dayStateResult = await supabaseAdmin
    .from('egg_ops_day_states')
    .select('*')
    .eq('collection_date', targetDate)
    .maybeSingle()

  if (!dayStateResult.error) {
    dayState = dayStateResult.data || dayState
  } else if (!isMissingRelationError(dayStateResult.error)) {
    throw dayStateResult.error
  }

  const dailyMap = new Map((dayRowsResult.data || []).map((row) => [row.breed_id, row]))
  const trendMap = new Map<string, Array<{ date: string; sellable: number }>>()

  for (const row of trendRowsResult.data || []) {
    const list = trendMap.get(row.breed_id) || []
    list.push({
      date: row.collection_date,
      sellable: numberOrZero(row.sellable_standard),
    })
    trendMap.set(row.breed_id, list)
  }

  const rows = (breedsResult.data || []).map((breed) => {
    const existing = dailyMap.get(breed.id)
    const trend = trendMap.get(breed.id) || []

    return {
      id: existing?.id || null,
      collection_date: targetDate,
      breed_id: breed.id,
      breed_name: breed.name,
      breed_slug: breed.slug || null,
      accent_color: breed.accent_color || '#111111',
      total_collected: numberOrZero(existing?.total_collected),
      sellable_standard: numberOrZero(existing?.sellable_standard),
      too_small: numberOrZero(existing?.too_small),
      dirty: numberOrZero(existing?.dirty),
      cracked: numberOrZero(existing?.cracked),
      shell_defect: numberOrZero(existing?.shell_defect),
      other_unsellable: numberOrZero(existing?.other_unsellable),
      notes: existing?.notes || '',
      updated_at: existing?.updated_at || null,
      trend_14d: trend,
    }
  })

  const totals = rows.reduce(
    (acc, row) => {
      acc.total_collected += row.total_collected
      acc.total_sellable += row.sellable_standard
      return acc
    },
    { total_collected: 0, total_sellable: 0 }
  )

  const firstForecastDate = (forecastResult.data || [])[0]?.delivery_monday || null
  const nextWeekRows = (forecastResult.data || []).filter((row) => row.delivery_monday === firstForecastDate)
  const nextWeekEstimate = nextWeekRows.reduce((sum, row) => sum + numberOrZero(row.forecast_eggs), 0)
  const lowStockBreeds = nextWeekRows.filter((row) => Boolean(row.low_stock)).length

  return {
    date: targetDate,
    day_state: dayState,
    rows,
    kpi: {
      total_collected: totals.total_collected,
      total_sellable: totals.total_sellable,
      sellable_rate: totals.total_collected > 0 ? Math.round((totals.total_sellable / totals.total_collected) * 1000) / 10 : 0,
      next_week_estimate: nextWeekEstimate,
      low_stock_breeds: lowStockBreeds,
    },
  }
}

export async function upsertEggDailyCollection(input: EggDailyInput, session?: SessionData | null) {
  const normalized = validateDailyPayload(input)
  ensureWithinCorrectionWindow(session, input.collection_date, input.reason)
  await ensureDayWritable(session, input.collection_date, input.reason)
  await ensureAnomalyReasonIfNeeded(input)
  const actor = getActor(session)

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('egg_daily_collections')
    .select('*')
    .eq('collection_date', input.collection_date)
    .eq('breed_id', input.breed_id)
    .maybeSingle()

  if (existingError) throw existingError

  const payload = {
    collection_date: input.collection_date,
    breed_id: input.breed_id,
    ...normalized,
    notes: input.notes || null,
    updated_by: actor,
    created_by: existing?.created_by || actor,
  }

  const { data: upserted, error: upsertError } = await supabaseAdmin
    .from('egg_daily_collections')
    .upsert(payload, { onConflict: 'collection_date,breed_id' })
    .select('*')
    .single()

  if (upsertError || !upserted) throw upsertError

  const { error: auditError } = await supabaseAdmin
    .from('egg_daily_collection_audit')
    .insert({
      collection_id: upserted.id,
      before_payload: existing || {},
      after_payload: upserted,
      changed_by: actor,
      change_reason: input.reason || null,
    })

  if (auditError) {
    logError('egg-daily-audit-insert', auditError, { collectionId: upserted.id })
  }

  return upserted
}

export async function patchEggDailyCollectionById(
  id: string,
  patch: Partial<EggDailyInput>,
  session?: SessionData | null
) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('egg_daily_collections')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (existingError) throw existingError
  if (!existing) {
    throw new EggCollectionError('Collection row not found', 404)
  }

  const next: EggDailyInput = {
    collection_date: patch.collection_date || existing.collection_date,
    breed_id: patch.breed_id || existing.breed_id,
    total_collected: patch.total_collected ?? existing.total_collected,
    sellable_standard: patch.sellable_standard ?? existing.sellable_standard,
    too_small: patch.too_small ?? existing.too_small,
    dirty: patch.dirty ?? existing.dirty,
    cracked: patch.cracked ?? existing.cracked,
    shell_defect: patch.shell_defect ?? existing.shell_defect,
    other_unsellable: patch.other_unsellable ?? existing.other_unsellable,
    notes: patch.notes ?? existing.notes,
    reason: patch.reason || null,
  }

  const normalized = validateDailyPayload(next)
  ensureWithinCorrectionWindow(session, next.collection_date, next.reason)
  await ensureDayWritable(session, next.collection_date, next.reason)
  await ensureAnomalyReasonIfNeeded(next)
  const actor = getActor(session)

  const updatePayload = {
    collection_date: next.collection_date,
    breed_id: next.breed_id,
    ...normalized,
    notes: next.notes || null,
    updated_by: actor,
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('egg_daily_collections')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single()

  if (updateError || !updated) throw updateError

  const { error: auditError } = await supabaseAdmin
    .from('egg_daily_collection_audit')
    .insert({
      collection_id: id,
      before_payload: existing,
      after_payload: updated,
      changed_by: actor,
      change_reason: next.reason || null,
    })

  if (auditError) {
    logError('egg-daily-audit-insert', auditError, { collectionId: id })
  }

  return updated
}

export async function setEggOpsDayStatus(params: {
  collectionDate: string
  status: EggOpsDayStatus
  session?: SessionData | null
  reason?: string | null
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.collectionDate)) {
    throw new EggCollectionError('Invalid collection date', 400)
  }

  const actor = getActor(params.session)
  const existing = await getDayState(params.collectionDate)
  const nowIso = new Date().toISOString()
  const reason = params.reason?.trim() || null

  if (existing.status === 'closed' && params.status === 'open' && (!reason || reason.length < 3)) {
    throw new EggCollectionError('Reason is required when reopening a closed day', 400)
  }

  const payload: Record<string, unknown> = {
    collection_date: params.collectionDate,
    status: params.status,
  }

  if (params.status === 'closed') {
    payload.closed_at = nowIso
    payload.closed_by = actor
  }

  if (existing.status === 'closed' && params.status !== 'closed') {
    payload.reopened_at = nowIso
    payload.reopened_by = actor
    payload.reopen_reason = reason
  }

  if (params.status === 'in_progress' && existing.status === 'open') {
    payload.reopen_reason = null
  }

  const { data, error } = await supabaseAdmin
    .from('egg_ops_day_states')
    .upsert(payload, { onConflict: 'collection_date' })
    .select('*')
    .single()

  if (error || !data) throw error
  return data
}

export async function prefillEggDailyFromPreviousDay(
  collectionDate: string,
  session?: SessionData | null
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(collectionDate)) {
    throw new EggCollectionError('Invalid collection_date format')
  }

  await ensureDayWritable(session, collectionDate)

  const actor = getActor(session)

  const { data: previousDates, error: previousDateError } = await supabaseAdmin
    .from('egg_daily_collections')
    .select('collection_date')
    .lt('collection_date', collectionDate)
    .order('collection_date', { ascending: false })
    .limit(1)

  if (previousDateError) throw previousDateError
  const previousDate = previousDates?.[0]?.collection_date
  if (!previousDate) {
    return { inserted: 0, previousDate: null }
  }

  const [previousRowsResult, existingRowsResult] = await Promise.all([
    supabaseAdmin
      .from('egg_daily_collections')
      .select('*')
      .eq('collection_date', previousDate),
    supabaseAdmin
      .from('egg_daily_collections')
      .select('breed_id')
      .eq('collection_date', collectionDate),
  ])

  if (previousRowsResult.error) throw previousRowsResult.error
  if (existingRowsResult.error) throw existingRowsResult.error

  const existingBreedSet = new Set((existingRowsResult.data || []).map((row) => row.breed_id))
  const toInsert = (previousRowsResult.data || [])
    .filter((row) => !existingBreedSet.has(row.breed_id))
    .map((row) => ({
      collection_date: collectionDate,
      breed_id: row.breed_id,
      total_collected: numberOrZero(row.total_collected),
      sellable_standard: numberOrZero(row.sellable_standard),
      too_small: numberOrZero(row.too_small),
      dirty: numberOrZero(row.dirty),
      cracked: numberOrZero(row.cracked),
      shell_defect: numberOrZero(row.shell_defect),
      other_unsellable: numberOrZero(row.other_unsellable),
      notes: row.notes || null,
      created_by: actor,
      updated_by: actor,
    }))

  if (toInsert.length === 0) {
    return { inserted: 0, previousDate }
  }

  const { data: insertedRows, error: insertError } = await supabaseAdmin
    .from('egg_daily_collections')
    .insert(toInsert)
    .select('*')

  if (insertError) throw insertError

  const auditRows = (insertedRows || []).map((row) => ({
    collection_id: row.id,
    before_payload: {},
    after_payload: row,
    changed_by: actor,
    change_reason: `Prefilled from ${previousDate}`,
  }))

  const { error: auditError } = await supabaseAdmin
    .from('egg_daily_collection_audit')
    .insert(auditRows)

  if (auditError) {
    logError('egg-daily-prefill-audit', auditError, { collectionDate, previousDate })
  }

  await setEggOpsDayStatus({
    collectionDate,
    status: 'in_progress',
    session,
    reason: `Prefill from ${previousDate}`,
  })

  return {
    inserted: insertedRows?.length || 0,
    previousDate,
  }
}

export async function bulkUpsertEggDailyCollections(params: {
  rows: EggDailyInput[]
  session?: SessionData | null
  reason?: string | null
}) {
  const rows = params.rows || []
  if (rows.length === 0) {
    return { updated: 0, rows: [] as any[] }
  }

  const maxRows = 200
  if (rows.length > maxRows) {
    throw new EggCollectionError(`Too many rows in one bulk request (max ${maxRows})`, 400)
  }

  const output: any[] = []
  for (const row of rows) {
    const next = {
      ...row,
      reason: row.reason || params.reason || null,
    }
    const saved = await upsertEggDailyCollection(next, params.session)
    output.push(saved)
  }

  return { updated: output.length, rows: output }
}

export async function applyEggDailyBulkAction(params: {
  collectionDate: string
  breedIds: string[]
  action: EggOpsBulkAction
  value?: string | number | null
  session?: SessionData | null
  reason?: string | null
}) {
  const breedIds = Array.from(new Set(params.breedIds || []))
  if (breedIds.length === 0) {
    throw new EggCollectionError('No breeds selected', 400)
  }

  await ensureDayWritable(params.session, params.collectionDate, params.reason)
  ensureWithinCorrectionWindow(params.session, params.collectionDate, params.reason)

  const actor = getActor(params.session)
  const { data: rows, error: fetchError } = await supabaseAdmin
    .from('egg_daily_collections')
    .select('*')
    .eq('collection_date', params.collectionDate)
    .in('breed_id', breedIds)

  if (fetchError) throw fetchError

  const updates: any[] = []
  for (const row of rows || []) {
    const next = {
      ...row,
      updated_by: actor,
    }

    if (params.action === 'set_notes') {
      next.notes = typeof params.value === 'string' ? params.value : null
    } else if (params.action === 'clear_notes') {
      next.notes = null
    } else if (params.action === 'reset_unsellable') {
      next.too_small = 0
      next.dirty = 0
      next.cracked = 0
      next.shell_defect = 0
      next.other_unsellable = 0
      next.total_collected = next.sellable_standard
    } else if (params.action === 'set_same_totals') {
      const amount = Math.max(0, numberOrZero(params.value))
      next.total_collected = amount
      next.sellable_standard = amount
      next.too_small = 0
      next.dirty = 0
      next.cracked = 0
      next.shell_defect = 0
      next.other_unsellable = 0
    }

    updates.push(next)
  }

  if (updates.length === 0) {
    return { updated: 0, rows: [] as any[] }
  }

  const { data: savedRows, error: saveError } = await supabaseAdmin
    .from('egg_daily_collections')
    .upsert(updates, { onConflict: 'id' })
    .select('*')

  if (saveError) throw saveError

  const savedMap = new Map((savedRows || []).map((row) => [row.id, row]))
  const auditRows = (rows || []).map((beforeRow) => ({
    collection_id: beforeRow.id,
    before_payload: beforeRow,
    after_payload: savedMap.get(beforeRow.id) || beforeRow,
    changed_by: actor,
    change_reason: params.reason || `Bulk action: ${params.action}`,
  }))

  const { error: auditError } = await supabaseAdmin
    .from('egg_daily_collection_audit')
    .insert(auditRows)

  if (auditError) {
    logError('egg-daily-bulk-audit', auditError, {
      collectionDate: params.collectionDate,
      action: params.action,
    })
  }

  return {
    updated: savedRows?.length || 0,
    rows: savedRows || [],
  }
}

export async function getEggDailyAuditTrail(params?: {
  date?: string
  breedId?: string
  limit?: number
}) {
  const limit = Math.max(1, Math.min(200, params?.limit || 50))
  let query = supabaseAdmin
    .from('egg_daily_collection_audit')
    .select(
      'id, collection_id, changed_by, change_reason, changed_at, before_payload, after_payload, egg_daily_collections(collection_date, breed_id, egg_breeds(name, slug))'
    )
    .order('changed_at', { ascending: false })
    .limit(limit)

  if (params?.date) {
    query = query.eq('egg_daily_collections.collection_date', params.date)
  }
  if (params?.breedId) {
    query = query.eq('egg_daily_collections.breed_id', params.breedId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getEggOpsDashboardData(days = 30) {
  const clampedDays = Math.max(7, Math.min(60, days))
  const endDate = getOsloDateString()
  const startDateValue = new Date(`${endDate}T00:00:00`)
  startDateValue.setDate(startDateValue.getDate() - (clampedDays - 1))
  const startDate = startDateValue.toISOString().split('T')[0]

  const [breedsResult, rowsResult] = await Promise.all([
    supabaseAdmin
      .from('egg_breeds')
      .select('id, name, slug, accent_color')
      .eq('active', true)
      .order('display_order', { ascending: true }),
    supabaseAdmin
      .from('egg_daily_collections')
      .select('collection_date, breed_id, total_collected, sellable_standard')
      .gte('collection_date', startDate)
      .lte('collection_date', endDate),
  ])

  if (breedsResult.error) throw breedsResult.error
  if (rowsResult.error) throw rowsResult.error

  const rows = rowsResult.data || []
  const rowsByBreed = new Map<string, any[]>()
  for (const row of rows) {
    const list = rowsByBreed.get(row.breed_id) || []
    list.push(row)
    rowsByBreed.set(row.breed_id, list)
  }

  const summary = (breedsResult.data || []).map((breed) => {
    const list = rowsByBreed.get(breed.id) || []
    const totals = list.reduce(
      (acc, row) => {
        const total = numberOrZero(row.total_collected)
        const sellable = numberOrZero(row.sellable_standard)
        acc.totalCollected += total
        acc.totalSellable += sellable
        return acc
      },
      { totalCollected: 0, totalSellable: 0 }
    )

    const avgDailySellable = list.length > 0 ? Math.round((totals.totalSellable / list.length) * 10) / 10 : 0
    const sellableRate = totals.totalCollected > 0 ? Math.round((totals.totalSellable / totals.totalCollected) * 1000) / 10 : 0

    return {
      breed_id: breed.id,
      breed_name: breed.name,
      breed_slug: breed.slug,
      accent_color: breed.accent_color || '#111111',
      total_collected: totals.totalCollected,
      total_sellable: totals.totalSellable,
      avg_daily_sellable: avgDailySellable,
      sellable_rate: sellableRate,
    }
  })

  function buildWindowAverage(windowDays: number) {
    const cutoff = new Date(`${endDate}T00:00:00`)
    cutoff.setDate(cutoff.getDate() - (windowDays - 1))
    const cutoffDate = cutoff.toISOString().split('T')[0]

    return summary.map((breed) => {
      const list = rows.filter((row) => row.breed_id === breed.breed_id && row.collection_date >= cutoffDate)
      const totalSellable = list.reduce((sum, row) => sum + numberOrZero(row.sellable_standard), 0)
      const totalCollected = list.reduce((sum, row) => sum + numberOrZero(row.total_collected), 0)
      return {
        breed_id: breed.breed_id,
        avg_sellable: list.length > 0 ? Math.round((totalSellable / list.length) * 10) / 10 : 0,
        sellable_rate: totalCollected > 0 ? Math.round((totalSellable / totalCollected) * 1000) / 10 : 0,
      }
    })
  }

  const windows = {
    d7: buildWindowAverage(7),
    d14: buildWindowAverage(14),
    d30: buildWindowAverage(Math.min(30, clampedDays)),
  }

  const heatmap = rows.map((row) => {
    const total = numberOrZero(row.total_collected)
    const sellable = numberOrZero(row.sellable_standard)
    return {
      date: row.collection_date,
      breed_id: row.breed_id,
      sellable,
      total,
      sellable_rate: total > 0 ? Math.round((sellable / total) * 1000) / 10 : 0,
    }
  })

  return {
    start_date: startDate,
    end_date: endDate,
    days: clampedDays,
    summary,
    windows,
    heatmap,
  }
}

export async function getOpenEggOpsAlerts(limit = 200) {
  const maxLimit = Math.max(1, Math.min(1000, limit))
  let { data, error } = await supabaseAdmin
    .from('egg_ops_alerts')
    .select(
      'id, alert_type, severity, acknowledged_at, acknowledged_by, snoozed_until, breed_id, year, week_number, message, metadata, created_at, egg_breeds(name, slug)'
    )
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(maxLimit)

  if (error && isMissingColumnError(error)) {
    const legacy = await supabaseAdmin
      .from('egg_ops_alerts')
      .select('id, alert_type, breed_id, year, week_number, message, metadata, created_at, egg_breeds(name, slug)')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(maxLimit)

    data = (legacy.data || []).map((row: any) => ({
      ...row,
      severity:
        row.alert_type === 'deficit'
          ? 'critical'
          : row.alert_type === 'low_stock'
            ? 'warning'
            : 'info',
      acknowledged_at: null,
      acknowledged_by: null,
      snoozed_until: null,
    }))
    error = legacy.error
  }

  if (error) throw error

  const now = Date.now()
  const visible = (data || []).filter((row: any) => {
    if (!row.snoozed_until) return true
    return new Date(row.snoozed_until).getTime() <= now
  })

  const severityRank: Record<string, number> = {
    critical: 3,
    warning: 2,
    info: 1,
  }

  visible.sort((a: any, b: any) => {
    const severityDelta = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0)
    if (severityDelta !== 0) return severityDelta
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return visible
}

export async function updateEggOpsAlert(params: {
  alertId: string
  action: 'acknowledge' | 'snooze' | 'resolve'
  snoozeMinutes?: number
  session?: SessionData | null
}) {
  const actor = getActor(params.session)
  const patch: Record<string, unknown> = {}

  if (params.action === 'acknowledge') {
    patch.acknowledged_at = new Date().toISOString()
    patch.acknowledged_by = actor
  } else if (params.action === 'snooze') {
    const minutes = Math.max(5, Math.min(24 * 60, numberOrZero(params.snoozeMinutes) || 60))
    patch.snoozed_until = new Date(Date.now() + minutes * 60_000).toISOString()
    patch.acknowledged_at = new Date().toISOString()
    patch.acknowledged_by = actor
  } else if (params.action === 'resolve') {
    patch.resolved_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('egg_ops_alerts')
    .update(patch)
    .eq('id', params.alertId)
    .select('*')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new EggCollectionError('Alert not found', 404)
  return data
}

export async function buildEggDailyReport(date?: string) {
  const daily = await getEggDailyCollections(date)
  const reportDate = daily.date
  const rows = daily.rows.map((row) => {
    const total = numberOrZero(row.total_collected)
    const sellable = numberOrZero(row.sellable_standard)
    const rate = total > 0 ? Math.round((sellable / total) * 1000) / 10 : 0
    return {
      breed_name: row.breed_name,
      total_collected: total,
      sellable_standard: sellable,
      too_small: numberOrZero(row.too_small),
      dirty: numberOrZero(row.dirty),
      cracked: numberOrZero(row.cracked),
      shell_defect: numberOrZero(row.shell_defect),
      other_unsellable: numberOrZero(row.other_unsellable),
      sellable_rate_percent: rate,
      notes: row.notes || '',
    }
  })

  const header = [
    'date',
    'breed_name',
    'total_collected',
    'sellable_standard',
    'sellable_rate_percent',
    'too_small',
    'dirty',
    'cracked',
    'shell_defect',
    'other_unsellable',
    'notes',
  ]

  const csvLines = [
    header.join(','),
    ...rows.map((row) =>
      [
        reportDate,
        row.breed_name,
        row.total_collected,
        row.sellable_standard,
        row.sellable_rate_percent,
        row.too_small,
        row.dirty,
        row.cracked,
        row.shell_defect,
        row.other_unsellable,
        `"${String(row.notes || '').replace(/"/g, '""')}"`,
      ].join(',')
    ),
  ]

  return {
    date: reportDate,
    day_state: (daily as any).day_state,
    kpi: daily.kpi,
    rows,
    csv: csvLines.join('\n'),
  }
}
