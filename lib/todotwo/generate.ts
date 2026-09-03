import { expandSeries, RecurrenceError } from '@/lib/todotwo/domain/recurrence'
import { addFarmDays, farmToday, type FarmDate } from '@/lib/todotwo/time'

/**
 * Materialises recurring routines into dated occurrences.
 *
 * Idempotent by construction: a unique index on (series_id, occurrence_date)
 * means running this twice, or having two runs overlap, cannot produce two
 * copies of Tuesday's goat milking. Occurrences are inserted with
 * ignoreDuplicates so a re-run is a no-op rather than an error, and — crucially
 * — never overwrites an occurrence someone has already worked on.
 *
 * Shared by the cron handler and the CLI script so both behave identically.
 */

export interface GenerateResult {
  seriesProcessed: number
  occurrencesCreated: number
  occurrencesSkipped: number
  errors: { series: string; message: string }[]
  from: FarmDate
  to: FarmDate
}

interface SeriesRow {
  id: string
  title: string
  rrule: string
  starts_on: string
  ends_on: string | null
  time_of_day: string | null
  horizon_days: number
  project_id: string | null
  section_id: string | null
  priority: number
}

/** Minimal shape so this works with any Supabase client, privileged or not. */
type Db = {
  from: (table: string) => any
}

export async function generateOccurrences(
  db: Db,
  options: { horizonDaysOverride?: number; today?: FarmDate } = {}
): Promise<GenerateResult> {
  const from = options.today ?? farmToday()

  const { data: seriesRows, error: seriesError } = await db
    .from('task_series')
    .select('id, title, rrule, starts_on, ends_on, time_of_day, horizon_days, project_id, section_id, priority')
    .eq('is_active', true)
    .is('deleted_at', null)

  if (seriesError) throw new Error(`Could not read task_series: ${seriesError.message}`)

  const series = (seriesRows ?? []) as SeriesRow[]

  const { data: exceptionRows } = await db
    .from('task_exceptions')
    .select('series_id, occurrence_date')

  const exceptionsBySeries = new Map<string, Set<string>>()
  for (const row of (exceptionRows ?? []) as { series_id: string; occurrence_date: string }[]) {
    if (!exceptionsBySeries.has(row.series_id)) exceptionsBySeries.set(row.series_id, new Set())
    exceptionsBySeries.get(row.series_id)!.add(row.occurrence_date)
  }

  const result: GenerateResult = {
    seriesProcessed: 0,
    occurrencesCreated: 0,
    occurrencesSkipped: 0,
    errors: [],
    from,
    to: from,
  }

  for (const s of series) {
    const horizon = options.horizonDaysOverride ?? s.horizon_days
    const to = addFarmDays(from, horizon)
    if (to > result.to) result.to = to

    let occurrences
    try {
      occurrences = expandSeries({
        rrule: s.rrule,
        from,
        to,
        startsOn: s.starts_on,
        endsOn: s.ends_on,
        timeOfDay: s.time_of_day,
        exceptions: exceptionsBySeries.get(s.id),
      })
    } catch (error) {
      // A rule we cannot expand must not stop the others. It is reported and
      // the routine simply produces nothing until the rule is corrected.
      result.errors.push({
        series: s.title,
        message: error instanceof RecurrenceError ? error.message : String(error),
      })
      continue
    }

    result.seriesProcessed += 1
    if (occurrences.length === 0) continue

    // Title stays null: the occurrence inherits from the series, which is what
    // makes editing the series text propagate to every future day.
    const rows = occurrences.map((occurrence) => ({
      series_id: s.id,
      occurrence_date: occurrence.date,
      project_id: s.project_id,
      section_id: s.section_id,
      due_date: occurrence.date,
      due_at: occurrence.at ? occurrence.at.toISOString() : null,
      all_day: occurrence.at === null,
      priority: s.priority,
      status: 'unassigned' as const,
      sort_order: 0,
    }))

    const { data: inserted, error: insertError } = await db
      .from('tasks')
      .upsert(rows, { onConflict: 'series_id,occurrence_date', ignoreDuplicates: true })
      .select('id')

    if (insertError) {
      result.errors.push({ series: s.title, message: insertError.message })
      continue
    }

    const created = inserted?.length ?? 0
    result.occurrencesCreated += created
    result.occurrencesSkipped += rows.length - created
  }

  return result
}
