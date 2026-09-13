/**
 * The onboarding ramp: what a new person should be doing on each of their
 * first days on the farm.
 *
 * Arrival day plus their first two full days: pure shadowing, zero tasks.
 * Day offset 3: two household responsibilities.
 * Day offset 4: one complete animal shift.
 * Day offset 5 onward: fully normal.
 *
 * Deliberately pure and framework-free so it can be unit tested without a
 * database: given a day-offset and a set of candidate occurrences, decide
 * whether more handoffs should be requested, and if so, which occurrence(s)
 * to offer.
 */

export const RAMP_COMBINED_TASK_CAP = 2

export type RampPhase = 'shadowing' | 'household' | 'animals' | 'normal'

/** Which phase a person is in, given how many whole calendar days they've been on the farm. */
export function rampPhaseForDayOffset(dayOffset: number): RampPhase {
  if (dayOffset < 0) return 'normal' // future start date shouldn't happen, but never block work
  if (dayOffset <= 2) return 'shadowing'
  if (dayOffset === 3) return 'household'
  if (dayOffset === 4) return 'animals'
  return 'normal'
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
