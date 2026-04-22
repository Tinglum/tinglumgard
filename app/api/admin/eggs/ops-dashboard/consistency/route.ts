import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceEggOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const searchParams = request.nextUrl.searchParams
    const weeksParam = searchParams.get('weeks')
    let weeks = weeksParam ? Number.parseInt(weeksParam, 10) : 8
    weeks = Math.max(2, Math.min(52, weeks))

    const since = new Date()
    since.setUTCDate(since.getUTCDate() - weeks * 7)
    const sinceStr = since.toISOString().slice(0, 10)

    // Query day states
    const { data: dayStates, error: dayStatesError } = await supabaseAdmin
      .from('egg_ops_day_states')
      .select('collection_date, status, closed_at, closed_by, reopened_at')
      .gte('collection_date', sinceStr)
      .order('collection_date', { ascending: true })

    if (dayStatesError) throw dayStatesError

    // Query audit log joined with egg_daily_collections — don't throw if it fails
    let auditData: Array<{ id: string; changed_at: string; change_reason: string | null; changed_by: string | null; collection_date: string; breed_id: string }> = []
    try {
      const { data: auditRaw, error: auditError } = await supabaseAdmin
        .from('egg_audit_log')
        .select(`
          id,
          changed_at,
          change_reason,
          changed_by,
          egg_daily_collections!inner(collection_date, breed_id)
        `)
        .gte('changed_at', since.toISOString())

      if (!auditError && auditRaw) {
        for (const row of auditRaw) {
          const collRel = row.egg_daily_collections as { collection_date: string; breed_id: string } | { collection_date: string; breed_id: string }[] | null
          const collDate = Array.isArray(collRel) ? collRel[0]?.collection_date : collRel?.collection_date
          const breedId = Array.isArray(collRel) ? collRel[0]?.breed_id : collRel?.breed_id
          if (collDate && breedId) {
            auditData.push({
              id: row.id as string,
              changed_at: row.changed_at as string,
              change_reason: row.change_reason as string | null,
              changed_by: row.changed_by as string | null,
              collection_date: collDate,
              breed_id: breedId,
            })
          }
        }
      }
    } catch {
      // Silently ignore — audit log query failure is non-fatal
    }

    // Build correction count per date
    const correctionsByDate: Record<string, number> = {}
    const correctionsByBreed: Record<string, number> = {}

    for (const a of auditData) {
      correctionsByDate[a.collection_date] = (correctionsByDate[a.collection_date] ?? 0) + 1
      correctionsByBreed[a.breed_id] = (correctionsByBreed[a.breed_id] ?? 0) + 1
    }

    type DayResult = {
      collection_date: string
      status: string
      hours_to_close: number | null
      closed_late: boolean
      was_reopened: boolean
      corrections: number
    }

    const days: DayResult[] = []

    let total_days = 0
    let closed_days = 0
    let late_closings = 0
    let reopened_days = 0
    let hours_sum = 0
    let hours_count = 0
    let total_corrections = 0
    let days_with_corrections = 0

    for (const state of dayStates ?? []) {
      total_days++
      const collDate = state.collection_date as string
      const status = state.status as string
      const closedAt = state.closed_at as string | null
      const reopenedAt = state.reopened_at as string | null

      let hours_to_close: number | null = null
      let closed_late = false

      if (closedAt) {
        closed_days++
        // Midnight UTC of collection_date
        const midnight = new Date(collDate + 'T00:00:00.000Z')
        const closedTs = new Date(closedAt)
        hours_to_close = Math.round(((closedTs.getTime() - midnight.getTime()) / 3600000) * 10) / 10
        if (hours_to_close > 20) {
          closed_late = true
          late_closings++
        }
        hours_sum += hours_to_close
        hours_count++
      }

      const was_reopened = reopenedAt !== null && reopenedAt !== undefined
      if (was_reopened) reopened_days++

      const corrections = correctionsByDate[collDate] ?? 0
      total_corrections += corrections
      if (corrections > 0) days_with_corrections++

      days.push({
        collection_date: collDate,
        status,
        hours_to_close,
        closed_late,
        was_reopened,
        corrections,
      })
    }

    const avg_hours_to_close =
      hours_count > 0 ? Math.round((hours_sum / hours_count) * 10) / 10 : null

    const breed_corrections = Object.entries(correctionsByBreed)
      .map(([breed_id, count]) => ({ breed_id, count }))
      .sort((a, b) => b.count - a.count)

    const summary = {
      total_days,
      closed_days,
      late_closings,
      reopened_days,
      avg_hours_to_close,
      total_corrections,
      days_with_corrections,
    }

    return NextResponse.json({ days, summary, breed_corrections, weeks })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch consistency data' }, { status: 500 })
  }
}
