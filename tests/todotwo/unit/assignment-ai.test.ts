import { describe, expect, it } from 'vitest'

import {
  resolveConstraints,
  resolvePerson,
  resolveTaskGroup,
  type ParseContext,
} from '@/lib/todotwo/domain/assignment-ai'

/**
 * These test the resolution layer only — matching names and task-group labels
 * from a (stubbed) model output against a roster. The real Claude call is
 * never made here; `resolveConstraints` is the pure function `parseConstraints`
 * delegates to once it has a response, so exercising it directly gives full
 * coverage of "does Robert map to the real Robert" without an API key or a
 * network call.
 */

const context: ParseContext = {
  people: [
    { id: 'amber-id', name: 'Amber' },
    { id: 'robert-id', name: 'Robert' },
    { id: 'sam-id', name: 'Sam' },
  ],
  tasks: [
    { id: 'kitchen-1', title: 'Wash dishes', groupLabel: 'Daily Housekeeping' },
    { id: 'kitchen-2', title: 'Sweep floor', groupLabel: 'Daily Housekeeping' },
    { id: 'goats-1', title: 'Feed goats', groupLabel: 'Daily Animals' },
  ],
}

describe('resolvePerson', () => {
  it('matches exactly, case-insensitively', () => {
    const { person } = resolvePerson('robert', context.people)
    expect(person?.id).toBe('robert-id')
  })

  it('matches a unique prefix', () => {
    const { person } = resolvePerson('Rob', context.people)
    expect(person?.id).toBe('robert-id')
  })

  it('fails a misspelling and offers a suggestion', () => {
    const { person, suggestion } = resolvePerson('Robrt', context.people)
    expect(person).toBeNull()
    expect(suggestion).toBe('Robert')
  })

  it('fails a name nobody on the roster resembles, with no suggestion', () => {
    const { person, suggestion } = resolvePerson('Zzyzx Quorlax', context.people)
    expect(person).toBeNull()
    expect(suggestion).toBeNull()
  })
})

describe('resolveTaskGroup', () => {
  it('matches a group label by substring', () => {
    const { taskIds } = resolveTaskGroup('housekeeping', context.tasks)
    expect(taskIds.sort()).toEqual(['kitchen-1', 'kitchen-2'])
  })

  it('matches the full label case-insensitively', () => {
    const { taskIds } = resolveTaskGroup('daily housekeeping', context.tasks)
    expect(taskIds.sort()).toEqual(['kitchen-1', 'kitchen-2'])
  })

  it('reports no match and no wild suggestion for something unrelated', () => {
    const { taskIds, suggestion } = resolveTaskGroup('rocket maintenance', context.tasks)
    expect(taskIds).toEqual([])
    expect(suggestion).toBeNull()
  })
})

describe('resolveConstraints', () => {
  it('resolves a clean "Amber is off Thursday and Friday" instruction', () => {
    const { constraints, unresolved } = resolveConstraints(
      [{ kind: 'unavailable_weekday', personName: 'Amber', weekdays: ['TH', 'FR'] }],
      [],
      context
    )

    expect(unresolved).toEqual([])
    expect(constraints).toEqual([
      { kind: 'unavailable_weekday', personId: 'amber-id', weekdays: ['TH', 'FR'] },
    ])
  })

  it('resolves "Robert does no housekeeping tasks" to real task IDs', () => {
    const { constraints, unresolved } = resolveConstraints(
      [{ kind: 'exclude_tasks', personName: 'Robert', taskGroupLabel: 'housekeeping' }],
      [],
      context
    )

    expect(unresolved).toEqual([])
    expect(constraints).toHaveLength(1)
    const c = constraints[0]
    expect(c.kind).toBe('exclude_tasks')
    if (c.kind === 'exclude_tasks') {
      expect(c.personId).toBe('robert-id')
      expect(c.taskIds.sort()).toEqual(['kitchen-1', 'kitchen-2'])
    }
  })

  it('flags an unresolved person and drops the constraint rather than guessing', () => {
    const { constraints, unresolved } = resolveConstraints(
      [{ kind: 'unavailable_weekday', personName: 'Robrt', weekdays: ['MO'] }],
      [],
      context
    )

    expect(constraints).toEqual([])
    expect(unresolved).toEqual([{ text: 'Robrt', kind: 'person', suggestion: 'Robert' }])
  })

  it('flags an unresolved task group', () => {
    const { constraints, unresolved } = resolveConstraints(
      [{ kind: 'exclude_tasks', personName: 'Robert', taskGroupLabel: 'rocket maintenance' }],
      [],
      context
    )

    expect(constraints).toEqual([])
    expect(unresolved).toEqual([{ text: 'rocket maintenance', kind: 'task_group', suggestion: null }])
  })

  it('drops an only_people constraint entirely if any named person is ambiguous', () => {
    const { constraints, unresolved } = resolveConstraints(
      [{ kind: 'only_people', taskGroupLabel: 'Animals', personNames: ['Sam', 'Robrt'] }],
      [],
      context
    )

    expect(constraints).toEqual([])
    expect(unresolved).toEqual([{ text: 'Robrt', kind: 'person', suggestion: 'Robert' }])
  })

  it('accepts a max_per_day with no named person as applying to everyone', () => {
    const { constraints, unresolved } = resolveConstraints(
      [{ kind: 'max_per_day', personName: null, limit: 3 }],
      [],
      context
    )

    expect(unresolved).toEqual([])
    expect(constraints).toEqual([{ kind: 'max_per_day', personId: null, limit: 3 }])
  })

  it('carries through extra mentions the model flagged itself as unresolved', () => {
    const { unresolved } = resolveConstraints(
      [],
      [{ text: 'the new volunteer', kind: 'person' }],
      context
    )

    expect(unresolved).toEqual([{ text: 'the new volunteer', kind: 'person', suggestion: null }])
  })

  it('handles "divide evenly" with no constraints at all', () => {
    const { constraints, unresolved } = resolveConstraints([], [], context)
    expect(constraints).toEqual([])
    expect(unresolved).toEqual([])
  })
})
