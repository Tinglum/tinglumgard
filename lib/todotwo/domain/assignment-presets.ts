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

/**
 * "Whoever does the goats does the rabbits too." Free text rather than task
 * ids: the labels match a task's group or title by substring, so "Goats"
 * covers both its morning and evening series, which is also how "morning and
 * evening are always the same person" gets expressed.
 */
export interface PairingPreset {
  id: string
  labels: string[]
}

/** "Whoever does breakfast does not do dinner." */
export interface SeparationPreset {
  id: string
  labelsA: string[]
  labelsB: string[]
}

export interface PresetState {
  daysOff: DayOffPreset[]
  taskExclusions: TaskExclusionPreset[]
  maxPerDay: MaxPerDayPreset | null
  pairings: PairingPreset[]
  separations: SeparationPreset[]
}

export const EMPTY_PRESETS: PresetState = {
  daysOff: [],
  taskExclusions: [],
  maxPerDay: null,
  pairings: [],
  separations: [],
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

  for (const pairing of state.pairings ?? []) {
    const labels = pairing.labels.map((l) => l.trim()).filter(Boolean)
    // One label bundles nothing with anything.
    if (labels.length < 2) continue

    // Warn about a label that matches no work in the window, the same way the
    // exclusion path does — a rule that binds nothing is nearly always a
    // misspelling rather than an intention.
    for (const label of labels) {
      const { taskIds, suggestion } = resolveTaskGroup(label, context.tasks)
      if (taskIds.length === 0) unresolved.push({ text: label, kind: 'task_group', suggestion })
    }

    constraints.push({ kind: 'same_person', labels })
  }

  for (const separation of state.separations ?? []) {
    const labelsA = separation.labelsA.map((l) => l.trim()).filter(Boolean)
    const labelsB = separation.labelsB.map((l) => l.trim()).filter(Boolean)
    if (labelsA.length === 0 || labelsB.length === 0) continue

    for (const label of [...labelsA, ...labelsB]) {
      const { taskIds, suggestion } = resolveTaskGroup(label, context.tasks)
      if (taskIds.length === 0) unresolved.push({ text: label, kind: 'task_group', suggestion })
    }

    constraints.push({ kind: 'different_people', labelsA, labelsB })
  }

  return { constraints, unresolved }
}

const WEEKDAY_ORDER: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

export { WEEKDAY_ORDER }
