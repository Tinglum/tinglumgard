import { describe, expect, it } from 'vitest'

import {
  rulesToConstraints,
  describeRule,
  type AssignmentRule,
  type RuleTask,
} from '@/lib/todotwo/domain/assignment-rules'

/**
 * Stored rules have to survive to tomorrow. These pin down the two things
 * that makes hard: a rule may never hold a task id, and a rule that stops
 * matching must say so rather than disappear quietly.
 */

const tasks: RuleTask[] = [
  { id: 't1', title: 'Goats (Morning)', groupLabel: 'Goats (Morning)' },
  { id: 't2', title: 'Goats (Evening)', groupLabel: 'Goats (Evening)' },
  { id: 't3', title: 'Rabbits (Morning)', groupLabel: 'Rabbits (Morning)' },
  { id: 't4', title: 'Breakfast ready', groupLabel: 'Breakfast ready' },
  { id: 't5', title: 'Kitchen', groupLabel: 'Daily Housekeeping' },
]

function rule(partial: Partial<AssignmentRule> & Pick<AssignmentRule, 'kind' | 'payload'>): AssignmentRule {
  return {
    id: partial.id ?? 'r1',
    label: partial.label ?? 'a rule',
    enabled: partial.enabled ?? true,
    sort_order: partial.sort_order ?? 0,
    source_text: partial.source_text ?? null,
    kind: partial.kind,
    payload: partial.payload,
  }
}

describe('enabling and disabling', () => {
  it('ignores a rule that is switched off', () => {
    const { constraints } = rulesToConstraints(
      [rule({ kind: 'same_person', payload: { labels: ['Goats', 'Rabbits'] }, enabled: false })],
      tasks
    )
    expect(constraints).toEqual([])
  })

  it('applies one that is switched on', () => {
    const { constraints } = rulesToConstraints(
      [rule({ kind: 'same_person', payload: { labels: ['Goats', 'Rabbits'] } })],
      tasks
    )
    expect(constraints).toEqual([{ kind: 'same_person', labels: ['Goats', 'Rabbits'] }])
  })
})

describe('rules that cannot bite today', () => {
  it('reports a pairing whose names match nothing, rather than dropping it', () => {
    const { constraints, inert } = rulesToConstraints(
      [rule({ kind: 'same_person', label: 'Alpacas and llamas', payload: { labels: ['Alpacas', 'Llamas'] } })],
      tasks
    )
    expect(constraints).toEqual([])
    expect(inert).toHaveLength(1)
    expect(inert[0].reason).toMatch(/nothing today matches/i)
  })

  it('reports a pairing with only one match — there is nothing to bundle it with', () => {
    const { constraints, inert } = rulesToConstraints(
      [rule({ kind: 'same_person', payload: { labels: ['Breakfast', 'Alpacas'] } })],
      tasks
    )
    expect(constraints).toEqual([])
    expect(inert[0].reason).toMatch(/only one task/i)
  })

  it('reports a separation where only one side exists', () => {
    const { constraints, inert } = rulesToConstraints(
      [rule({ kind: 'different_people', payload: { labelsA: ['Breakfast'], labelsB: ['Dinner'] } })],
      tasks // no dinner today
    )
    expect(constraints).toEqual([])
    expect(inert[0].reason).toMatch(/only one side/i)
  })
})

describe('task-shaped rules are stored as labels, not ids', () => {
  it('resolves a task group to whatever matches on the day', () => {
    const { constraints } = rulesToConstraints(
      [
        rule({
          kind: 'exclude_task_group',
          payload: { personId: 'p1', label: 'Daily Housekeeping' },
        }),
      ],
      tasks
    )
    expect(constraints).toEqual([{ kind: 'exclude_tasks', personId: 'p1', taskIds: ['t5'] }])
  })

  it('resolves to a different set on a different day, which is the point', () => {
    const tomorrow: RuleTask[] = [
      { id: 'x9', title: 'Kitchen', groupLabel: 'Daily Housekeeping' },
      { id: 'x8', title: 'Mop the hall', groupLabel: 'Daily Housekeeping' },
    ]
    const { constraints } = rulesToConstraints(
      [rule({ kind: 'exclude_task_group', payload: { personId: 'p1', label: 'Daily Housekeeping' } })],
      tomorrow
    )
    expect(constraints).toEqual([
      { kind: 'exclude_tasks', personId: 'p1', taskIds: ['x9', 'x8'] },
    ])
  })
})

describe('malformed rules', () => {
  it('does not crash on a payload missing its fields', () => {
    const { constraints, inert } = rulesToConstraints(
      [
        rule({ kind: 'same_person', payload: {} }),
        rule({ id: 'r2', kind: 'max_per_day', payload: { limit: 0 } }),
        rule({ id: 'r3', kind: 'unavailable_weekday', payload: { personId: 'p1' } }),
      ],
      tasks
    )
    expect(constraints).toEqual([])
    expect(inert).toHaveLength(3)
  })

  it('keeps a farm-wide limit with no person', () => {
    const { constraints } = rulesToConstraints(
      [rule({ kind: 'max_per_day', payload: { personId: null, limit: 4 } })],
      tasks
    )
    expect(constraints).toEqual([{ kind: 'max_per_day', personId: null, limit: 4 }])
  })
})

describe('describeRule', () => {
  const nameOf = (id: string) => (id === 'p1' ? 'Amber' : 'Someone')

  it('reads as a sentence', () => {
    expect(
      describeRule(rule({ kind: 'same_person', payload: { labels: ['Goats', 'Rabbits'] } }), nameOf)
    ).toBe('Goats and Rabbits — the same person')

    expect(
      describeRule(
        rule({ kind: 'exclude_task_group', payload: { personId: 'p1', label: 'Kitchen' } }),
        nameOf
      )
    ).toBe('Amber does no Kitchen')

    expect(
      describeRule(rule({ kind: 'max_per_day', payload: { personId: null, limit: 3 } }), nameOf)
    ).toBe('Nobody does more than 3 a day')
  })
})
