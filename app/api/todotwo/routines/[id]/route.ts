import { NextRequest, NextResponse } from 'next/server'

import { requireApiRole } from '@/lib/todotwo/auth'
import { getTodoTwoClient } from '@/lib/todotwo/db'
import { RecurrenceError, expandSeries, parseRrule } from '@/lib/todotwo/domain/recurrence'
import { addFarmDays, farmToday } from '@/lib/todotwo/time'

export const dynamic = 'force-dynamic'

/**
 * Editing a recurring routine: its text, its schedule, and its steps.
 *
 * Until now none of this existed anywhere in the app. The Routines page said
 * "the instructions live here once — change them and every future day shows
 * the change", which described the data model accurately and the software not
 * at all: nothing wrote to task_series or task_series_steps, so the only way
 * to reword a routine was to open the database.
 *
 * Goes through the caller's own session, so RLS is still the boundary — staff
 * may write these tables, everybody else may not, and this handler does not
 * widen that by a single row. The service-role client is deliberately absent.
 *
 * The awkward part is the schedule. Occurrences are generated ahead, so a rule
 * change leaves days already on the calendar that the new rule would never
 * have produced. Changing "Tuesdays and Thursdays" to "Wednesdays" and walking
 * away leaves every Tuesday still sitting there, and somebody does the job on
 * the wrong day. So a rule change reconciles the horizon: days the new rule
 * does not want are withdrawn, days it does want are created or revived.
 */

interface StepInput {
  id?: string
  title?: unknown
  description?: unknown
}

interface Body {
  title?: unknown
  description?: unknown
  rrule?: unknown
  steps?: unknown
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(['super_admin', 'farm_admin', 'coordinator'])
  if (!auth.ok) return auth.response

  const body = (await request.json().catch(() => null)) as Body | null
  if (!body) return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 })

  const title = cleanText(body.title)
  if (!title) return NextResponse.json({ error: 'A routine needs a name.' }, { status: 400 })

  const description = cleanText(body.description)

  const rrule = cleanText(body.rrule)
  if (!rrule) return NextResponse.json({ error: 'A routine needs a schedule.' }, { status: 400 })

  // Reject an unusable rule here rather than letting the generator fail nightly
  // and quietly stop producing the routine.
  try {
    parseRrule(rrule)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof RecurrenceError ? error.message : 'That schedule is not valid.' },
      { status: 400 }
    )
  }

  const rawSteps = Array.isArray(body.steps) ? (body.steps as StepInput[]) : []
  const steps = rawSteps
    .map((step) => ({
      id: typeof step.id === 'string' && step.id ? step.id : null,
      title: cleanText(step.title),
      description: cleanText(step.description),
    }))
    // A step with no title is a blank row somebody left behind, not a step.
    .filter((step): step is { id: string | null; title: string; description: string | null } =>
      step.title !== null
    )

  const db = getTodoTwoClient()

  const { data: existing, error: readError } = await db
    .from('task_series')
    .select('id, rrule, starts_on, ends_on, time_of_day, horizon_days, project_id, section_id, priority')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'No such routine.' }, { status: 404 })

  const scheduleChanged = (existing.rrule as string) !== rrule

  const { error: updateError } = await db
    .from('task_series')
    .update({ title, description, rrule })
    .eq('id', params.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // ---------------------------------------------------------------------
  // Steps
  // ---------------------------------------------------------------------

  const { data: currentSteps } = await db
    .from('task_series_steps')
    .select('id')
    .eq('series_id', params.id)
    .is('deleted_at', null)

  const keptIds = new Set(steps.flatMap((step) => (step.id ? [step.id] : [])))
  const removed = ((currentSteps ?? []) as { id: string }[])
    .map((row) => row.id)
    .filter((id) => !keptIds.has(id))

  // Soft delete, because task_step_completions point at these rows. Hard
  // deleting a step would take the record of somebody having done it with it.
  if (removed.length > 0) {
    const { error } = await db
      .from('task_series_steps')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', removed)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // sort_order in tens, matching how the importer wrote them, so a future
  // insert between two steps has somewhere to go.
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]
    const sort_order = (index + 1) * 10
    const { error } = step.id
      ? await db
          .from('task_series_steps')
          .update({ title: step.title, description: step.description, sort_order })
          .eq('id', step.id)
      : await db
          .from('task_series_steps')
          .insert({
            series_id: params.id,
            title: step.title,
            description: step.description,
            sort_order,
          })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!scheduleChanged) {
    return NextResponse.json({ ok: true, rescheduled: false })
  }

  // ---------------------------------------------------------------------
  // Reconciling the days already on the calendar
  // ---------------------------------------------------------------------

  const from = farmToday()
  const horizon = (existing.horizon_days as number | null) ?? 28
  const to = addFarmDays(from, horizon)

  let wanted: { date: string; at: Date | null }[]
  try {
    wanted = expandSeries({
      rrule,
      from,
      to,
      startsOn: existing.starts_on as string,
      endsOn: (existing.ends_on as string | null) ?? null,
      timeOfDay: (existing.time_of_day as string | null) ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof RecurrenceError ? error.message : 'Could not expand that schedule.' },
      { status: 400 }
    )
  }

  const wantedByDate = new Map(wanted.map((occurrence) => [occurrence.date, occurrence]))

  // Everything from today forward, including rows withdrawn by an earlier
  // edit — those are why this reads deleted ones too. Flipping a routine back
  // to a schedule it had last month must bring its days back rather than
  // silently skip them: the unique index on (series_id, occurrence_date) would
  // block a fresh insert.
  const { data: onCalendar, error: calendarError } = await db
    .from('tasks')
    .select('id, occurrence_date, status, deleted_at')
    .eq('series_id', params.id)
    .gte('occurrence_date', from)

  if (calendarError) return NextResponse.json({ error: calendarError.message }, { status: 500 })

  const rows = (onCalendar ?? []) as {
    id: string
    occurrence_date: string
    status: string
    deleted_at: string | null
  }[]

  const FINISHED = ['completed', 'verified', 'cancelled']
  const now = new Date().toISOString()

  const toWithdraw = rows
    .filter((row) => !row.deleted_at && !FINISHED.includes(row.status))
    .filter((row) => !wantedByDate.has(row.occurrence_date))
    .map((row) => row.id)

  const toRevive = rows
    .filter((row) => row.deleted_at && wantedByDate.has(row.occurrence_date))
    .map((row) => row.id)

  if (toWithdraw.length > 0) {
    const { error } = await db
      .from('tasks')
      .update({ deleted_at: now })
      .in('id', toWithdraw)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (toRevive.length > 0) {
    const { error } = await db.from('tasks').update({ deleted_at: null }).in('id', toRevive)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const known = new Set(rows.map((row) => row.occurrence_date))
  const missing = wanted.filter((occurrence) => !known.has(occurrence.date))

  if (missing.length > 0) {
    // Title stays null so the occurrence keeps inheriting the series text —
    // the same contract generateOccurrences relies on.
    const { error } = await db.from('tasks').insert(
      missing.map((occurrence) => ({
        series_id: params.id,
        occurrence_date: occurrence.date,
        project_id: existing.project_id,
        section_id: existing.section_id,
        due_date: occurrence.date,
        due_at: occurrence.at ? occurrence.at.toISOString() : null,
        all_day: occurrence.at === null,
        priority: existing.priority,
        status: 'unassigned' as const,
        sort_order: 0,
      }))
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    rescheduled: true,
    withdrawn: toWithdraw.length,
    revived: toRevive.length,
    created: missing.length,
  })
}
