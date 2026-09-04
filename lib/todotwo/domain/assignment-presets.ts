/**
 * The usual constraints, ticked rather than written.
 *
 * Most instructions a coordinator gives are the same four or five shapes, and
 * asking a language model to re-derive "Amber is off Thursday" every week is
 * both slower and less certain than a checkbox. These build Constraint objects
 * directly — no model call, no name matching to get wrong, and a person picker
 * that already carries real IDs.
 *
 * Pure and synchronous on purpose: this is the part that decides what the
 * solver is told, so it is unit tested rather than only exercised through the
 * UI. The free-text path is unchanged and still goes through Claude; the two
 * sets of constraints are concatenated, not chosen between.
 */

import type { Constraint, Weekday } from '@/lib/todotwo/domain/assignment'
import {
  resolveTaskGroup,
  type RosterPerson,
  type RosterTask,
  type UnresolvedReference,
} from '@/lib/todotwo/domain/assignment-ai'

/** "Amber is off Thursday and Friday." */
export interface DayOffPreset {
  /** Client-side row key, so a chip can be removed without index arithmetic. */
  id: string
  personId: string
  weekdays: Weekday[]
}

/** "Robert does no housekeeping." */
export interface TaskExclusionPreset {
  id: string
  personId: string
  /** A series or project name, matched the same way the free-text path matches it. */
  taskGroupLabel: string
}

/** "Nobody does more than three things a day." personId null means everyone. */
export interface MaxPerDayPreset {
  personId: string | null
  limit: number
}

export interface PresetState {
  daysOff: DayOffPreset[]
  taskExclusions: TaskExclusionPreset[]
  maxPerDay: MaxPerDayPreset | null
}

export const EMPTY_PRESETS: PresetState = {
  daysOff: [],
  taskExclusions: [],
  maxPerDay: null,
}

export interface PresetContext {
  people: RosterPerson[]
  tasks: RosterTask[]
}

export interface PresetResult {
  constraints: Constraint[]
  /** Reported the same shape as the AI path, so the preview screen needs no second code path. */
  unresolved: UnresolvedReference[]
}

/**
 * Turns ticked boxes into constraints.
 *
 * Nothing here is silently dropped. A preset naming a person who is not on the
 * roster, or a task group with nothing in the window, comes back as unresolved
 * rather than as an empty constraint the solver would ignore — an inert rule is
 * indistinguishable from a rule that was never asked for, which is exactly the
 * failure that makes a rota nobody trusts.
 *
 * "Spread evenly" is not represented here at all: it is what
 * buildAssignmentPlan already does with no constraints, and inventing a
 * constraint kind for it would mean shipping one the solver ignores.
 */
export function presetsToConstraints(state: PresetState, context: PresetContext): PresetResult {
  const constraints: Constraint[] = []
  const unresolved: UnresolvedReference[] = []

  const known = new Map(context.people.map((p) => [p.id, p]))

  const requirePerson = (personId: string): RosterPerson | null => {
    const person = known.get(personId)
    if (!person) {
      unresolved.push({ text: personId, kind: 'person', suggestion: null })
      return null
    }
    return person
  }

  for (const dayOff of state.daysOff) {
    if (dayOff.weekdays.length === 0) continue
    const person = requirePerson(dayOff.personId)
    if (!person) continue

    // De-duplicated and in week order, so two rows for the same person read the
    // same way as one row with both days ticked.
    const weekdays = WEEKDAY_ORDER.filter((day) => dayOff.weekdays.includes(day))
    constraints.push({ kind: 'unavailable_weekday', personId: person.id, weekdays })
  }

  for (const exclusion of state.taskExclusions) {
    const label = exclusion.taskGroupLabel.trim()
    if (!label) continue

    const person = requirePerson(exclusion.personId)
    if (!person) continue

    // The same resolver the free-text path uses, deliberately: one definition
    // of what "housekeeping" matches, not two that can disagree.
    const { taskIds, suggestion } = resolveTaskGroup(label, context.tasks)
    if (taskIds.length === 0) {
      unresolved.push({ text: label, kind: 'task_group', suggestion })
      continue
    }

    constraints.push({ kind: 'exclude_tasks', personId: person.id, taskIds })
  }

  if (state.maxPerDay && Number.isFinite(state.maxPerDay.limit) && state.maxPerDay.limit >= 1) {
    const limit = Math.floor(state.maxPerDay.limit)

    if (state.maxPerDay.personId === null) {
      constraints.push({ kind: 'max_per_day', personId: null, limit })
    } else {
      const person = requirePerson(state.maxPerDay.personId)
      if (person) constraints.push({ kind: 'max_per_day', personId: person.id, limit })
    }
  }

  return { constraints, unresolved }
}

const WEEKDAY_ORDER: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

export { WEEKDAY_ORDER }
