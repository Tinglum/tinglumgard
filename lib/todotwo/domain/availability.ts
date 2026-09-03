import type { FarmDate } from '@/lib/todotwo/time'

/**
 * Pure logic for time-off requests. No database access here — see
 * lib/todotwo/queries.ts for reads and the RPCs in
 * 20260905092100_todotwo_availability_skills_rls.sql for writes.
 */

export type TimeOffKind = 'day_off' | 'appointment' | 'trip' | 'illness' | 'partial_day'
export type TimeOffStatus = 'pending' | 'approved' | 'declined'

export const TIME_OFF_KINDS: TimeOffKind[] = ['day_off', 'appointment', 'trip', 'illness', 'partial_day']

export class TimeOffValidationError extends Error {}

export interface DateRange {
  start: FarmDate
  end: FarmDate
}

/**
 * Validates a request's own shape before it ever reaches the database:
 * well-formed dates, end not before start, and not absurdly far in the past.
 * The database has its own check constraint (end_date >= start_date) as the
 * final backstop — this exists so the UI can show a useful message instead of
 * a raw Postgres error.
 */
export function validateTimeOffRange(range: DateRange, today: FarmDate): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(range.start) || !/^\d{4}-\d{2}-\d{2}$/.test(range.end)) {
    throw new TimeOffValidationError('Dates must be in YYYY-MM-DD form')
  }
  if (range.end < range.start) {
    throw new TimeOffValidationError('The end date cannot be before the start date')
  }
  if (range.start < today) {
    throw new TimeOffValidationError('The start date cannot be in the past')
  }
}

/** Whether two inclusive date ranges overlap on at least one calendar day. */
export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.start <= b.end && b.start <= a.end
}

/**
 * True when `day` falls inside an inclusive date range.
 */
export function dateInRange(day: FarmDate, range: DateRange): boolean {
  return day >= range.start && day <= range.end
}
