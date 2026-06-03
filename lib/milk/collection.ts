import { supabaseAdmin } from '@/lib/supabase/server'
import type { SessionData } from '@/lib/auth/session'
import type {
  MilkGoat,
  MilkDailySession,
  MilkSessionEntry,
  MilkOpsDayState,
  MilkDailyResponse,
  SessionType,
  HealthFlag,
} from './types'

// ─── Errors ─────────────────────────────────────────────────────────────────

export class MilkCollectionError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'MilkCollectionError'
    this.status = status
  }
}

// ─── Goats ──────────────────────────────────────────────────────────────────

export async function getGoats(): Promise<MilkGoat[]> {
  const { data, error } = await supabaseAdmin
    .from('milk_goats')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new MilkCollectionError(`Failed to fetch goats: ${error.message}`, 500)
  return data || []
}

export async function upsertGoat(
  body: Partial<MilkGoat> & { name: string },
  session: SessionData | null
): Promise<MilkGoat> {
  const { id, name, tag_number, breed, status, accent_color, display_order, notes } = body
  if (!name?.trim()) throw new MilkCollectionError('Name is required')

  const payload = {
    name: name.trim(),
    tag_number: tag_number?.trim() || null,
    breed: breed?.trim() || null,
    status: status || 'active',
    accent_color: accent_color || '#8B7355',
    display_order: display_order ?? 0,
    notes: notes?.trim() || null,
  }

  if (id) {
    const { data, error } = await supabaseAdmin
      .from('milk_goats')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new MilkCollectionError(`Failed to update goat: ${error.message}`, 500)
    return data
  }

  const { data, error } = await supabaseAdmin
    .from('milk_goats')
    .insert(payload)
    .select()
    .single()
  if (error) throw new MilkCollectionError(`Failed to create goat: ${error.message}`, 500)
  return data
}

// ─── Daily sessions ─────────────────────────────────────────────────────────

function todayDate(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' })
}

export async function getMilkDailyCollections(date?: string): Promise<MilkDailyResponse> {
  const targetDate = date || todayDate()

  const [sessionsResult, goatsResult, dayStateResult] = await Promise.all([
    supabaseAdmin
      .from('milk_daily_sessions')
      .select('*')
      .eq('milking_date', targetDate)
      .order('session_type', { ascending: true }),
    getGoats(),
    supabaseAdmin
      .from('milk_ops_day_states')
      .select('*')
      .eq('milking_date', targetDate)
      .maybeSingle(),
  ])

  if (sessionsResult.error) throw new MilkCollectionError(`Failed to fetch sessions: ${sessionsResult.error.message}`, 500)

  const sessions: MilkDailySession[] = sessionsResult.data || []
  const sessionIds = sessions.map((s) => s.id)

  let entries: (MilkSessionEntry & { goat_name?: string })[] = []
  if (sessionIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('milk_session_entries')
      .select('*')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true })
    if (error) throw new MilkCollectionError(`Failed to fetch entries: ${error.message}`, 500)

    const goatMap = new Map(goatsResult.map((g) => [g.id, g.name]))
    entries = (data || []).map((e) => ({ ...e, goat_name: goatMap.get(e.goat_id) || undefined }))
  }

  // KPIs
  const morningSession = sessions.find((s) => s.session_type === 'morning')
  const eveningSession = sessions.find((s) => s.session_type === 'evening')
  const totalLiters = sessions.reduce((sum, s) => sum + Number(s.total_liters || 0), 0)
  const uniqueGoats = new Set(entries.map((e) => e.goat_id))
  const healthFlags = entries.filter((e) => e.health_flag !== 'normal').length

  // 7d and 30d averages — computed from recent sessions
  let avg7d = 0
  let avg30d = 0
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: recentSessions } = await supabaseAdmin
      .from('milk_daily_sessions')
      .select('milking_date, total_liters')
      .gte('milking_date', thirtyDaysAgo.toISOString().slice(0, 10))
      .order('milking_date', { ascending: false })

    if (recentSessions && recentSessions.length > 0) {
      // Group by date, sum liters per day
      const dailyTotals = new Map<string, number>()
      for (const s of recentSessions) {
        const current = dailyTotals.get(s.milking_date) || 0
        dailyTotals.set(s.milking_date, current + Number(s.total_liters || 0))
      }
      const sorted = Array.from(dailyTotals.entries()).sort((a, b) => b[0].localeCompare(a[0]))
      const last7 = sorted.slice(0, 7)
      const last30 = sorted.slice(0, 30)
      if (last7.length > 0) avg7d = last7.reduce((s, [, v]) => s + v, 0) / last7.length
      if (last30.length > 0) avg30d = last30.reduce((s, [, v]) => s + v, 0) / last30.length
    }
  } catch {}

  return {
    date: targetDate,
    day_state: dayStateResult.data || null,
    sessions,
    entries,
    goats: goatsResult,
    kpi: {
      total_liters: totalLiters,
      morning_liters: Number(morningSession?.total_liters || 0),
      evening_liters: Number(eveningSession?.total_liters || 0),
      goats_milked: uniqueGoats.size,
      health_flags: healthFlags,
      avg_7d: Math.round(avg7d * 10) / 10,
      avg_30d: Math.round(avg30d * 10) / 10,
    },
  }
}

export async function upsertMilkSession(
  body: {
    milking_date?: string
    session_type?: SessionType
    total_liters?: number
    temperature_celsius?: number | null
    notes?: string | null
    id?: string
  },
  session: SessionData | null
): Promise<MilkDailySession> {
  const actor = session?.name || 'anonymous'
  const date = body.milking_date || todayDate()
  const sessionType = body.session_type || 'morning'

  if (body.id) {
    const { data, error } = await supabaseAdmin
      .from('milk_daily_sessions')
      .update({
        total_liters: body.total_liters ?? 0,
        temperature_celsius: body.temperature_celsius ?? null,
        notes: body.notes?.trim() || null,
        updated_by: actor,
      })
      .eq('id', body.id)
      .select()
      .single()
    if (error) throw new MilkCollectionError(`Failed to update session: ${error.message}`, 500)
    return data
  }

  const { data, error } = await supabaseAdmin
    .from('milk_daily_sessions')
    .upsert(
      {
        milking_date: date,
        session_type: sessionType,
        total_liters: body.total_liters ?? 0,
        temperature_celsius: body.temperature_celsius ?? null,
        notes: body.notes?.trim() || null,
        created_by: actor,
        updated_by: actor,
      },
      { onConflict: 'milking_date,session_type' }
    )
    .select()
    .single()
  if (error) throw new MilkCollectionError(`Failed to upsert session: ${error.message}`, 500)
  return data
}

// ─── Per-goat entries ───────────────────────────────────────────────────────

export async function upsertSessionEntry(
  body: {
    session_id: string
    goat_id: string
    liters?: number
    health_flag?: HealthFlag
    health_notes?: string | null
    id?: string
  },
  _session: SessionData | null
): Promise<MilkSessionEntry> {
  if (!body.session_id) throw new MilkCollectionError('session_id is required')
  if (!body.goat_id) throw new MilkCollectionError('goat_id is required')

  const payload = {
    session_id: body.session_id,
    goat_id: body.goat_id,
    liters: body.liters ?? 0,
    health_flag: body.health_flag || 'normal',
    health_notes: body.health_notes?.trim() || null,
  }

  if (body.id) {
    const { data, error } = await supabaseAdmin
      .from('milk_session_entries')
      .update(payload)
      .eq('id', body.id)
      .select()
      .single()
    if (error) throw new MilkCollectionError(`Failed to update entry: ${error.message}`, 500)
    return data
  }

  const { data, error } = await supabaseAdmin
    .from('milk_session_entries')
    .upsert(payload, { onConflict: 'session_id,goat_id' })
    .select()
    .single()
  if (error) throw new MilkCollectionError(`Failed to upsert entry: ${error.message}`, 500)
  return data
}

export async function deleteSessionEntry(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('milk_session_entries')
    .delete()
    .eq('id', id)
  if (error) throw new MilkCollectionError(`Failed to delete entry: ${error.message}`, 500)
}

// ─── Day state ──────────────────────────────────────────────────────────────

export async function updateDayStatus(
  body: {
    milking_date: string
    status: 'open' | 'in_progress' | 'closed'
    reopen_reason?: string
  },
  session: SessionData | null
): Promise<MilkOpsDayState> {
  const actor = session?.name || 'anonymous'
  const { milking_date, status, reopen_reason } = body

  const extra: Record<string, unknown> = {}
  if (status === 'closed') {
    extra.closed_at = new Date().toISOString()
    extra.closed_by = actor
  } else if (status === 'open') {
    extra.reopened_at = new Date().toISOString()
    extra.reopened_by = actor
    extra.reopen_reason = reopen_reason || null
  }

  // Compute totals from sessions
  const { data: sessions } = await supabaseAdmin
    .from('milk_daily_sessions')
    .select('session_type, total_liters')
    .eq('milking_date', milking_date)

  const morning = sessions?.find((s) => s.session_type === 'morning')
  const evening = sessions?.find((s) => s.session_type === 'evening')

  const { data, error } = await supabaseAdmin
    .from('milk_ops_day_states')
    .upsert(
      {
        milking_date,
        status,
        morning_liters: Number(morning?.total_liters || 0),
        evening_liters: Number(evening?.total_liters || 0),
        ...extra,
      },
      { onConflict: 'milking_date' }
    )
    .select()
    .single()

  if (error) throw new MilkCollectionError(`Failed to update day status: ${error.message}`, 500)
  return data
}

// ─── Prefill helper ─────────────────────────────────────────────────────────

export async function prefillDay(date: string, session: SessionData | null): Promise<MilkDailySession[]> {
  const results: MilkDailySession[] = []
  for (const type of ['morning', 'evening'] as SessionType[]) {
    const row = await upsertMilkSession({ milking_date: date, session_type: type }, session)
    results.push(row)
  }
  return results
}
