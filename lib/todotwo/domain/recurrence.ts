import { addFarmDays, farmDateTimeToInstant, type FarmDate } from '@/lib/todotwo/time'

/**
 * Expanding a routine into the days it actually falls on.
 *
 * A deliberately small RRULE subset: FREQ=DAILY, FREQ=WEEKLY with BYDAY, and
 * FREQ=MONTHLY with a single ordinal BYDAY such as 1SA, plus BYHOUR/BYMINUTE.
 * A narrow expander that is right beats a general one that is subtly wrong
 * about daylight saving.
 *
 * The monthly form was added for "make Liam's food on the first Saturday of
 * the month" — batch cooking that follows the month rather than the week. It
 * is deliberately one ordinal weekday and no more: BYMONTHDAY, intervals and
 * multi-day monthly rules are not supported, and are rejected loudly rather
 * than half-understood.
 *
 * Everything iterates over farm-local calendar days and only then converts to
 * an instant. That is what keeps a 07:00 routine at 07:00 on both sides of a
 * clock change — expanding in UTC would drift it by an hour twice a year.
 */

export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

const WEEKDAY_ORDER: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

export interface ParsedRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  byDay: Weekday[]
  /**
   * Which occurrence of `byDay[0]` within the month, for FREQ=MONTHLY.
   * 1-5 counts forwards, -1 means the last one. Null for the other rules.
   */
  nth: number | null
  hour: number | null
  minute: number | null
}

/** e.g. "1SA" -> first Saturday, "-1FR" -> last Friday. */
const ORDINAL_DAY = /^(-?[1-5])(MO|TU|WE|TH|FR|SA|SU)$/

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
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY') {
    throw new RecurrenceError(`Unsupported FREQ: ${freq ?? '(none)'}`)
  }

  let nth: number | null = null
  let byDay: Weekday[] = []
  const rawByDay = parts.get('BYDAY')

  if (freq === 'MONTHLY') {
    if (!rawByDay) throw new RecurrenceError('FREQ=MONTHLY requires BYDAY, such as BYDAY=1SA')
    const match = ORDINAL_DAY.exec(rawByDay.trim())
    if (!match) {
      throw new RecurrenceError(
        `FREQ=MONTHLY supports one ordinal weekday such as 1SA or -1FR, not: ${rawByDay}`
      )
    }
    nth = Number(match[1])
    byDay = [match[2] as Weekday]
    const hourM = parts.has('BYHOUR') ? Number(parts.get('BYHOUR')) : null
    const minuteM = parts.has('BYMINUTE') ? Number(parts.get('BYMINUTE')) : null
    return { freq, byDay, nth, hour: hourM, minute: minuteM }
  }

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

  return { freq, byDay, nth, hour, minute }
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

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Is this date the nth given weekday of its own month?
 *
 * Counting forwards is just arithmetic on the day of the month: the 1st to the
 * 7th is the first of any weekday, the 8th to the 14th the second, and so on.
 * A negative n counts back from the end, so -1SA is the last Saturday — which
 * is the fifth in some months and the fourth in others, and must not be
 * confused with 5SA.
 */
function isNthWeekdayOfMonth(date: FarmDate, weekday: Weekday, nth: number): boolean {
  if (weekdayOfDate(date) !== weekday) return false

  const [year, month, day] = date.split('-').map(Number)

  if (nth > 0) return Math.floor((day - 1) / 7) + 1 === nth

  // Counting back: how many of this weekday remain after today.
  const fromEnd = Math.floor((daysInMonth(year, month) - day) / 7) + 1
  return fromEnd === -nth
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
    const matches =
      rule.freq === 'DAILY' ||
      (rule.freq === 'MONTHLY'
        ? isNthWeekdayOfMonth(cursor, rule.byDay[0], rule.nth ?? 1)
        : rule.byDay.includes(weekdayOfDate(cursor)))

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

  const dayNames: Record<Weekday, string> = {
    MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday',
    FR: 'Friday', SA: 'Saturday', SU: 'Sunday',
  }

  if (rule.freq === 'MONTHLY') {
    const ordinals: Record<number, string> = {
      1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth', 5: 'Fifth',
    }
    const which = (rule.nth ?? 1) < 0 ? 'Last' : (ordinals[rule.nth ?? 1] ?? 'First')
    return `${which} ${dayNames[rule.byDay[0]]} of the month${time}`
  }

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
