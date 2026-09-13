/**
 * The onboarding ramp: what a new person should be doing on each of their
 * first days on the farm.
 *
 * Days 0-1 (their start date and the day after): pure shadowing, zero tasks.
 * Day 2 (their 3rd calendar day): two household responsibilities.
 * Day 3 (their 4th calendar day): one complete animal shift.
 * Day 4 onward (their 5th calendar day): fully normal.
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
  if (dayOffset <= 1) return 'shadowing' // day 0-1
  if (dayOffset === 2) return 'household'
  if (dayOffset === 3) return 'animals'
  return 'normal' // day 4+ (5th calendar day onward)
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
