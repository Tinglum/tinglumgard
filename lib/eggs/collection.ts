import type { SessionData } from '@/lib/auth/session'
import { getSessionRole } from '@/lib/auth/roles'
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

function getActor(session: SessionData): string {
  return session.email || session.name || session.userId || 'unknown'
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

function ensureWithinCorrectionWindow(session: SessionData, dateString: string, reason?: string | null) {
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

export async function upsertEggDailyCollection(input: EggDailyInput, session: SessionData) {
  const normalized = validateDailyPayload(input)
  ensureWithinCorrectionWindow(session, input.collection_date, input.reason)
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
  session: SessionData
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

export async function getOpenEggOpsAlerts(limit = 200) {
  const { data, error } = await supabaseAdmin
    .from('egg_ops_alerts')
    .select('id, alert_type, breed_id, year, week_number, message, metadata, created_at, egg_breeds(name, slug)')
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(1000, limit)))

  if (error) throw error
  return data || []
}
