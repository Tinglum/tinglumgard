import { describe, expect, it } from 'vitest'

import { buildAssignmentPlan, type AssignableTask } from '@/lib/todotwo/domain/assignment'
import {
  EMPTY_PRESETS,
  presetsToConstraints,
  type PresetState,
} from '@/lib/todotwo/domain/assignment-presets'

/**
 * The tick-box path, tested where it actually decides things: the mapping from
 * checkbox state to Constraint[]. Everything downstream of this is the solver,
 * which has its own tests and is not touched here.
 */

const people = [
  { id: 'amber', name: 'Amber' },
  { id: 'robert', name: 'Robert' },
  { id: 'sam', name: 'Sam' },
]

const tasks = [
  { id: 'k1', title: 'Wash up', groupLabel: 'Daily Housekeeping' },
  { id: 'k2', title: 'Sweep the hall', groupLabel: 'Daily Housekeeping' },
  { id: 'g1', title: 'Milk the goats', groupLabel: 'Goats' },
]

const context = { people, tasks }

function presets(partial: Partial<PresetState>): PresetState {
  return { ...EMPTY_PRESETS, ...partial }
}

describe('nothing ticked', () => {
  it('produces no constraints — an even split is the solver default', () => {
    const result = presetsToConstraints(EMPTY_PRESETS, context)
    expect(result.constraints).toEqual([])
    expect(result.unresolved).toEqual([])
  })

  it('leaves the plan identical to an unconstrained run', () => {
    const week: AssignableTask[] = [
      { id: 'a', date: '2026-09-07', weekday: 'MO', title: 'Kitchen', groupLabel: null },
      { id: 'b', date: '2026-09-08', weekday: 'TU', title: 'Kitchen', groupLabel: null },
      { id: 'c', date: '2026-09-09', weekday: 'WE', title: 'Kitchen', groupLabel: null },
    ]
    const { constraints } = presetsToConstraints(EMPTY_PRESETS, context)
    expect(buildAssignmentPlan(week, people, constraints)).toEqual(
      buildAssignmentPlan(week, people, [])
    )
  })
})

describe('days off', () => {
  it('maps a person and weekdays to unavailable_weekday', () => {
    const result = presetsToConstraints(
      presets({ daysOff: [{ id: 'r1', personId: 'amber', weekdays: ['TH', 'FR'] }] }),
      context
    )

    expect(result.constraints).toEqual([
      { kind: 'unavailable_weekday', personId: 'amber', weekdays: ['TH', 'FR'] },
    ])
    expect(result.unresolved).toEqual([])
  })

  it('puts the weekdays in week order however they were ticked', () => {
    const result = presetsToConstraints(
      presets({ daysOff: [{ id: 'r1', personId: 'amber', weekdays: ['SU', 'TU', 'MO'] }] }),
      context
    )

    expect(result.constraints[0]).toMatchObject({ weekdays: ['MO', 'TU', 'SU'] })
  })

  it('ignores a row with no weekday ticked rather than shipping an inert rule', () => {
    const result = presetsToConstraints(
      presets({ daysOff: [{ id: 'r1', personId: 'amber', weekdays: [] }] }),
      context
    )

    expect(result.constraints).toEqual([])
    expect(result.unresolved).toEqual([])
  })

  it('keeps two rows for two people separate', () => {
    const result = presetsToConstraints(
      presets({
        daysOff: [
          { id: 'r1', personId: 'amber', weekdays: ['TH'] },
          { id: 'r2', personId: 'sam', weekdays: ['SA', 'SU'] },
        ],
      }),
      context
    )

    expect(result.constraints).toHaveLength(2)
    expect(result.constraints.map((c) => (c as { personId: string }).personId)).toEqual([
      'amber',
      'sam',
    ])
  })

  it('reports a person who is not on the roster instead of dropping the rule', () => {
    const result = presetsToConstraints(
      presets({ daysOff: [{ id: 'r1', personId: 'ghost', weekdays: ['MO'] }] }),
      context
    )

    expect(result.constraints).toEqual([])
    expect(result.unresolved).toEqual([{ text: 'ghost', kind: 'person', suggestion: null }])
  })
})

describe('work someone never does', () => {
  it('expands a task group to every matching task id', () => {
    const result = presetsToConstraints(
      presets({
        taskExclusions: [{ id: 'x1', personId: 'robert', taskGroupLabel: 'Daily Housekeeping' }],
      }),
      context
    )

    expect(result.constraints).toEqual([
      { kind: 'exclude_tasks', personId: 'robert', taskIds: ['k1', 'k2'] },
    ])
  })

  it('matches a partial label the same way the free-text path does', () => {
    const result = presetsToConstraints(
      presets({ taskExclusions: [{ id: 'x1', personId: 'robert', taskGroupLabel: 'housekeeping' }] }),
      context
    )

    expect(result.constraints[0]).toMatchObject({ taskIds: ['k1', 'k2'] })
  })

  it('reports a group with nothing in the window rather than an empty constraint', () => {
    const result = presetsToConstraints(
      presets({ taskExclusions: [{ id: 'x1', personId: 'robert', taskGroupLabel: 'Beekeeping' }] }),
      context
    )

    expect(result.constraints).toEqual([])
    expect(result.unresolved).toHaveLength(1)
    expect(result.unresolved[0]).toMatchObject({ text: 'Beekeeping', kind: 'task_group' })
  })

  it('skips a blank label without complaining', () => {
    const result = presetsToConstraints(
      presets({ taskExclusions: [{ id: 'x1', personId: 'robert', taskGroupLabel: '  ' }] }),
      context
    )

    expect(result.constraints).toEqual([])
    expect(result.unresolved).toEqual([])
  })
})

describe('a daily cap', () => {
  it('maps "everyone" to a null personId', () => {
    const result = presetsToConstraints(
      presets({ maxPerDay: { personId: null, limit: 3 } }),
      context
    )

    expect(result.constraints).toEqual([{ kind: 'max_per_day', personId: null, limit: 3 }])
  })

  it('maps a named person', () => {
    const result = presetsToConstraints(
      presets({ maxPerDay: { personId: 'sam', limit: 1 } }),
      context
    )

    expect(result.constraints).toEqual([{ kind: 'max_per_day', personId: 'sam', limit: 1 }])
  })

  it('rejects a limit below one', () => {
    const result = presetsToConstraints(
      presets({ maxPerDay: { personId: null, limit: 0 } }),
      context
    )

    expect(result.constraints).toEqual([])
  })

  it('floors a fractional limit rather than passing it to the solver', () => {
    const result = presetsToConstraints(
      presets({ maxPerDay: { personId: null, limit: 2.7 } }),
      context
    )

    expect(result.constraints).toEqual([{ kind: 'max_per_day', personId: null, limit: 2 }])
  })
})

describe('everything at once', () => {
  it('emits one constraint per ticked rule, in a stable order', () => {
    const result = presetsToConstraints(
      presets({
        daysOff: [{ id: 'r1', personId: 'amber', weekdays: ['TH'] }],
        taskExclusions: [{ id: 'x1', personId: 'robert', taskGroupLabel: 'Goats' }],
        maxPerDay: { personId: null, limit: 2 },
      }),
      context
    )

    expect(result.constraints.map((c) => c.kind)).toEqual([
      'unavailable_weekday',
      'exclude_tasks',
      'max_per_day',
    ])
    expect(result.unresolved).toEqual([])
  })

  it('produces constraints the solver actually enforces', () => {
    const thursday: AssignableTask[] = [
      { id: 'k1', date: '2026-09-10', weekday: 'TH', title: 'Wash up', groupLabel: 'Daily Housekeeping' },
    ]
    const { constraints } = presetsToConstraints(
      presets({ daysOff: [{ id: 'r1', personId: 'amber', weekdays: ['TH'] }] }),
      context
    )

    const plan = buildAssignmentPlan(thursday, people, constraints)
    expect(plan.assignments[0].personId).not.toBe('amber')
    expect(plan.inertConstraints).toEqual([])
  })
})
