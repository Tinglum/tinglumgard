/**
 * The onboarding ramp: what a new person should be doing on each of their
 * first days on the farm.
 *
 * Days 0-1 (their start date and the day after): pure shadowing, zero tasks.
 * Days 2-3 (the 3rd and 4th calendar day): they pick up at most TWO tasks
 * TOTAL across both days combined — not two per day. The brief's phrasing was
 * ambiguous ("days 2-3 ... at most 2 tasks"), and this file resolves it as a
 * combined cap, enforced by counting existing pending-or-accepted handoffs
 * across the whole window before offering more (see rampStatusForDay below).
 * Day 4 onward (5th calendar day): fully normal, no special treatment.
 *
 * Deliberately pure and framework-free so it can be unit tested without a
 * database: given a day-offset and a set of candidate occurrences, decide
 * whether more handoffs should be requested, and if so, which occurrence(s)
 * to offer.
 */

export const RAMP_COMBINED_TASK_CAP = 2

export type RampPhase = 'shadowing' | 'ramping' | 'normal'

/** Which phase a person is in, given how many whole calendar days they've been on the farm. */
export function rampPhaseForDayOffset(dayOffset: number): RampPhase {
  if (dayOffset < 0) return 'normal' // future start date shouldn't happen, but never block work
  if (dayOffset <= 1) return 'shadowing' // day 0-1
  if (dayOffset <= 3) return 'ramping' // day 2-3 (3rd/4th calendar day)
  return 'normal' // day 4+ (5th day onward)
}

export interface OccurrenceCandidate {
  taskId: string
  /** Person currently holding this occurrence. */
  holderPersonId: string
  /** How many active assignments that holder currently has in the ramp window — used to spread load. */
  holderLoadInWindow: number
  /** Farm-local date, YYYY-MM-DD; used only to prefer the soonest occurrence. */
  dueDate: string
}

/**
 * Picks which occurrence(s) to offer a ramping person, given the combined cap
 * and how many they already hold (pending or accepted).
 *
 * Heuristic: offer the next upcoming dated occurrence(s) currently held by
 * whoever has the most assignments in the window, so a handoff also spreads
 * load rather than only serving onboarding. Ties broken by soonest due date,
 * then by taskId for a stable, testable order.
 */
export function selectHandoffCandidates(
  candidates: OccurrenceCandidate[],
  alreadyHeldOrPending: number
): OccurrenceCandidate[] {
  const remaining = RAMP_COMBINED_TASK_CAP - alreadyHeldOrPending
  if (remaining <= 0) return []

  const sorted = [...candidates].sort((a, b) => {
    if (a.holderLoadInWindow !== b.holderLoadInWindow) return b.holderLoadInWindow - a.holderLoadInWindow
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    return a.taskId.localeCompare(b.taskId)
  })

  return sorted.slice(0, remaining)
}
