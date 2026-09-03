/**
 * Pure business rules for stays and accommodation.
 *
 * Nothing here touches the database or a component — see R11 in
 * phases/STANDING-RULES.md. Route handlers and Server Components call these
 * with plain data and act on the result.
 */

export type DateCertainty = 'preferred' | 'earliest' | 'latest' | 'provisional' | 'confirmed'
export type StayStatus = 'upcoming' | 'current' | 'completed' | 'cancelled'

export interface StayLike {
  arrivalDate: string
  departureDate: string | null
}

/**
 * The status a stay should carry given today's farm-local date, if nobody has
 * cancelled it. `cancelled` is never derived — only ever set explicitly by a
 * person, so this function is not asked to reproduce it.
 */
export function deriveStayStatus(
  stay: StayLike,
  today: string,
  currentStatus: StayStatus
): StayStatus {
  if (currentStatus === 'cancelled') return 'cancelled'
  if (stay.departureDate && stay.departureDate < today) return 'completed'
  if (stay.arrivalDate > today) return 'upcoming'
  return 'current'
}

/** A stay's date range as an inclusive [start, end] pair for overlap checks. */
export function stayRange(stay: StayLike): { start: string; end: string | null } {
  return { start: stay.arrivalDate, end: stay.departureDate }
}

/**
 * True when two inclusive date ranges overlap. `end === null` means open-ended
 * (still going). Mirrors the semantics of the database's `daterange(..., '[]')`
 * EXCLUDE constraint, so the same rule can be checked client-side before a
 * round trip, without being the thing that actually enforces it.
 */
export function rangesOverlap(
  a: { start: string; end: string | null },
  b: { start: string; end: string | null }
): boolean {
  const aEnd = a.end ?? '9999-12-31'
  const bEnd = b.end ?? '9999-12-31'
  return a.start <= bEnd && b.start <= aEnd
}

export interface AssignmentDraft {
  startDate: string
  endDate: string | null
}

/**
 * Client-side pre-check for a new accommodation assignment against the ones
 * already booked for that accommodation. This is advisory only — a friendly
 * error before the round trip. The actual guarantee is the EXCLUDE constraint
 * in `todotwo.accommodation_assignments`; a race between two coordinators is
 * settled by Postgres, not by this function.
 */
export function findConflictingAssignment(
  draft: AssignmentDraft,
  existing: AssignmentDraft[]
): AssignmentDraft | null {
  const range = { start: draft.startDate, end: draft.endDate }
  return (
    existing.find((other) =>
      rangesOverlap(range, { start: other.startDate, end: other.endDate })
    ) ?? null
  )
}

export const DATE_CERTAINTY_LABEL: Record<DateCertainty, string> = {
  preferred: 'Preferred',
  earliest: 'Earliest',
  latest: 'Latest',
  provisional: 'Provisional',
  confirmed: 'Confirmed',
}

export const STAY_STATUS_LABEL: Record<StayStatus, string> = {
  upcoming: 'Upcoming',
  current: 'Current',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
