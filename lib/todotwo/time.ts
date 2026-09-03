import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'

/**
 * Time handling for TodoTwo.
 *
 * The farm runs on wall-clock time. A 07:00 morning animal routine happens at
 * 07:00 local whether or not the clocks moved last night, so recurrence is
 * always expanded in local time and only then converted to an instant.
 *
 * Rules:
 *   - an instant is timestamptz in the database and a Date here;
 *   - a calendar day is a `date` column and a 'YYYY-MM-DD' string here;
 *   - never construct farm-local times with `new Date(y, m, d)`, which uses the
 *     server's zone. Netlify runs in UTC; Kenneth does not.
 */

export const FARM_TZ = 'Europe/Oslo' as const

/** 'YYYY-MM-DD' */
export type FarmDate = string
/** 'HH:mm' in 24-hour farm-local time */
export type FarmTime = string

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isFarmDate(value: string): value is FarmDate {
  return DATE_PATTERN.test(value)
}

export function isFarmTime(value: string): value is FarmTime {
  return TIME_PATTERN.test(value)
}

/** The farm-local calendar day an instant falls on. */
export function toFarmDate(instant: Date): FarmDate {
  return formatInTimeZone(instant, FARM_TZ, 'yyyy-MM-dd')
}

/** The farm-local wall-clock time an instant falls on. */
export function toFarmTime(instant: Date): FarmTime {
  return formatInTimeZone(instant, FARM_TZ, 'HH:mm')
}

/**
 * A farm-local date and time as an instant.
 *
 * On the spring-forward day 02:00–02:59 does not exist locally; date-fns-tz
 * resolves those forward. On the autumn day 02:00–02:59 happens twice and the
 * first (summer-time) occurrence is chosen. Neither affects a farm routine, but
 * the behaviour is asserted in tests so a library change cannot alter it
 * silently.
 */
export function farmDateTimeToInstant(date: FarmDate, time: FarmTime = '00:00'): Date {
  if (!isFarmDate(date)) throw new Error(`Invalid farm date: ${date}`)
  if (!isFarmTime(time)) throw new Error(`Invalid farm time: ${time}`)
  return fromZonedTime(`${date}T${time}:00`, FARM_TZ)
}

/** Start of a farm-local day, as an instant. */
export function farmDayStart(date: FarmDate): Date {
  return farmDateTimeToInstant(date, '00:00')
}

/** Exclusive end of a farm-local day: the start of the next day. */
export function farmDayEnd(date: FarmDate): Date {
  return new Date(farmDayStart(addFarmDays(date, 1)).getTime())
}

/** Calendar arithmetic on farm-local days, unaffected by DST. */
export function addFarmDays(date: FarmDate, days: number): FarmDate {
  if (!isFarmDate(date)) throw new Error(`Invalid farm date: ${date}`)
  const [year, month, day] = date.split('-').map(Number)
  // UTC arithmetic keeps this a pure calendar operation.
  const utc = new Date(Date.UTC(year, month - 1, day))
  utc.setUTCDate(utc.getUTCDate() + days)
  return utc.toISOString().slice(0, 10)
}

/** Today on the farm, regardless of where the server is. */
export function farmToday(now: Date = new Date()): FarmDate {
  return toFarmDate(now)
}

/** Whole days between two farm dates. Negative when `to` precedes `from`. */
export function farmDaysBetween(from: FarmDate, to: FarmDate): number {
  const a = Date.parse(`${from}T00:00:00Z`)
  const b = Date.parse(`${to}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

/** Formatting helper for the UI. Norwegian locale is applied at the call site. */
export function formatFarm(instant: Date, pattern: string): string {
  return formatInTimeZone(instant, FARM_TZ, pattern)
}

/**
 * An instant shifted into farm-local wall time. Only for handing a Date to a
 * component that formats using the local zone; never store the result.
 */
export function asFarmWallClock(instant: Date): Date {
  return toZonedTime(instant, FARM_TZ)
}
