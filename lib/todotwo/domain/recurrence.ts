import { addFarmDays, farmDateTimeToInstant, type FarmDate } from '@/lib/todotwo/time'

/**
 * Expanding a routine into the days it actually falls on.
 *
 * A deliberately small RRULE subset: FREQ=DAILY and FREQ=WEEKLY with BYDAY,
 * plus BYHOUR/BYMINUTE. That is the entire vocabulary the importer emits, and a
 * narrow expander that is right beats a general one that is subtly wrong about
 * daylight saving.
 *
 * Everything iterates over farm-local calendar days and only then converts to
 * an instant. That is what keeps a 07:00 routine at 07:00 on both sides of a
 * clock change — expanding in UTC would drift it by an hour twice a year.
 */

export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

const WEEKDAY_ORDER: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

export interface ParsedRule {
  freq: 'DAILY' | 'WEEKLY'
  byDay: Weekday[]
  hour: number | null
  minute: number | null
}

export class RecurrenceError extends Error {}

export function parseRrule(input: string): ParsedRule {
  const body = input.replace(/^RRULE:/i, '').trim()
  if (!body) throw new RecurrenceError('Empty rule')

  const parts = new Map<string, string>()
  for (const chunk of body.split(';')) {
    const [key, value] = chunk.split('=')
    if (!key || value === undefined) continue
    parts.set(key.toUpperCase(), value.toUpperCase())
  }

  const freq = parts.get('FREQ')
  if (freq !== 'DAILY' && freq !== 'WEEKLY') {
    throw new RecurrenceError(`Unsupported FREQ: ${freq ?? '(none)'}`)
  }

  let byDay: Weekday[] = []
  const rawByDay = parts.get('BYDAY')
  if (rawByDay) {
    byDay = rawByDay.split(',').map((day) => {
      const trimmed = day.trim() as Weekday
      if (!WEEKDAY_ORDER.includes(trimmed)) {
        throw new RecurrenceError(`Unsupported BYDAY value: ${day}`)
      }
      return trimmed
    })
  }

  if (freq === 'WEEKLY' && byDay.length === 0) {
    throw new RecurrenceError('FREQ=WEEKLY requires BYDAY')
  }

  const hour = parts.has('BYHOUR') ? Number(parts.get('BYHOUR')) : null
  const minute = parts.has('BYMINUTE') ? Number(parts.get('BYMINUTE')) : null

  if (hour !== null && (!Number.isInteger(hour) || hour < 0 || hour > 23)) {
    throw new RecurrenceError(`Invalid BYHOUR: ${parts.get('BYHOUR')}`)
  }
  if (minute !== null && (!Number.isInteger(minute) || minute < 0 || minute > 59)) {
    throw new RecurrenceError(`Invalid BYMINUTE: ${parts.get('BYMINUTE')}`)
  }

  return { freq, byDay, hour, minute }
}

/** The weekday of a farm-local date, without going through a timezone. */
export function weekdayOfDate(date: FarmDate): Weekday {
  const [year, month, day] = date.split('-').map(Number)
  // Zeller-free: UTC arithmetic on a plain calendar date has no zone to get wrong.
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay() // 0 = Sunday
  return WEEKDAY_ORDER[(dow + 6) % 7]
}

export interface Occurrence {
  /** The farm-local calendar day this falls on. */
  date: FarmDate
  /** The instant, when the routine has a time of day. Null for all-day. */
  at: Date | null
}

export interface ExpandOptions {
  rrule: string
  /** Inclusive. */
  from: FarmDate
  /** Inclusive. */
  to: FarmDate
  /** Series start; occurrences before it are not produced. */
  startsOn: FarmDate
  /** Series end, inclusive. Null for open-ended. */
  endsOn?: FarmDate | null
  /** Local HH:MM. Overrides BYHOUR/BYMINUTE when given. */
  timeOfDay?: string | null
  /** Dates deliberately skipped. */
  exceptions?: Iterable<FarmDate>
  /** Guards against a runaway range. */
  limit?: number
}

export function expandSeries(options: ExpandOptions): Occurrence[] {
  const rule = parseRrule(options.rrule)
  const skip = new Set(options.exceptions ?? [])
  const limit = options.limit ?? 1000

  // Never produce anything before the series began.
  let cursor = options.from < options.startsOn ? options.startsOn : options.from
  const last = options.endsOn && options.endsOn < options.to ? options.endsOn : options.to

  const time =
    options.timeOfDay ??
    (rule.hour !== null
      ? `${String(rule.hour).padStart(2, '0')}:${String(rule.minute ?? 0).padStart(2, '0')}`
      : null)

  const out: Occurrence[] = []

  while (cursor <= last && out.length < limit) {
    const matches = rule.freq === 'DAILY' || rule.byDay.includes(weekdayOfDate(cursor))

    if (matches && !skip.has(cursor)) {
      out.push({
        date: cursor,
        // Built from the local wall time, so DST is handled by the conversion
        // rather than by arithmetic on instants.
        at: time ? farmDateTimeToInstant(cursor, time) : null,
      })
    }

    cursor = addFarmDays(cursor, 1)
  }

  return out
}

/** Human-readable summary of a rule, for the UI. */
export function describeRule(rrule: string): string {
  let rule: ParsedRule
  try {
    rule = parseRrule(rrule)
  } catch {
    return 'Custom schedule'
  }

  const time =
    rule.hour !== null
      ? ` at ${String(rule.hour).padStart(2, '0')}:${String(rule.minute ?? 0).padStart(2, '0')}`
      : ''

  if (rule.freq === 'DAILY') return `Every day${time}`

  const names: Record<Weekday, string> = {
    MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday',
    FR: 'Friday', SA: 'Saturday', SU: 'Sunday',
  }

  const ordered = WEEKDAY_ORDER.filter((d) => rule.byDay.includes(d))

  if (ordered.length === 5 && !ordered.includes('SA') && !ordered.includes('SU')) {
    return `Weekdays${time}`
  }
  if (ordered.length === 2 && ordered.includes('SA') && ordered.includes('SU')) {
    return `Weekends${time}`
  }

  const labels = ordered.map((d) => names[d])
  const list =
    labels.length <= 1
      ? labels.join('')
      : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`

  return `Every ${list}${time}`
}
