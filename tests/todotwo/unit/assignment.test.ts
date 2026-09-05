import { describe, expect, it } from 'vitest'

import {
  type AssignableTask,
  type Constraint,
  buildAssignmentPlan,
  fairnessSpread,
} from '@/lib/todotwo/domain/assignment'

const people = [
  { id: 'amber', name: 'Amber' },
  { id: 'robert', name: 'Robert' },
  { id: 'sam', name: 'Sam' },
]

/** Mon 2026-09-07 through Sun 2026-09-13. */
function week(title: string, group: string | null = null): AssignableTask[] {
  const days: [string, AssignableTask['weekday']][] = [
    ['2026-09-07', 'MO'],
    ['2026-09-08', 'TU'],
    ['2026-09-09', 'WE'],
    ['2026-09-10', 'TH'],
    ['2026-09-11', 'FR'],
    ['2026-09-12', 'SA'],
    ['2026-09-13', 'SU'],
  ]
  return days.map(([date, weekday]) => ({
    id: `${title}-${date}`,
    date,
    weekday,
    title,
    groupLabel: group,
  }))
}

describe('even distribution', () => {
  it('spreads work as evenly as it can', () => {
    const plan = buildAssignmentPlan(week('Kitchen'), people, [])
    expect(plan.assignments).toHaveLength(7)
    // 7 across 3 people: 3/2/2.
    expect(plan.load.map((l) => l.count)).toEqual([3, 2, 2])
    expect(fairnessSpread(plan)).toBe(1)
  })

  it('is deterministic — the same inputs give the same rota', () => {
    const first = buildAssignmentPlan(week('Kitchen'), people, [])
    const second = buildAssignmentPlan(week('Kitchen'), people, [])
    expect(first.assignments).toEqual(second.assignments)
  })

  it('starts from work people already have, but still takes turns', () => {
    const loaded = [
      { id: 'amber', name: 'Amber', existingLoad: 5 },
      { id: 'robert', name: 'Robert' },
      { id: 'sam', name: 'Sam' },
    ]
    const plan = buildAssignmentPlan(week('Kitchen'), loaded, [])
    const counts = ['amber', 'robert', 'sam'].map(
      (id) => plan.assignments.filter((a) => a.personId === id).length
    )
    const [amber] = counts

    // This assertion used to be "Amber takes at most one". It cannot be, now
    // that a job rotates: seven Kitchens across three people means everybody
    // takes a turn before anyone takes a second, so Amber's share is two
    // whatever she is already carrying. The deliberate trade is that nobody
    // does the same job twice while somebody else has not done it at all —
    // which was asked for explicitly — and a head start now buys the smallest
    // share rather than exemption.
    expect(amber).toBe(Math.min(...counts))
    expect(amber).toBeLessThan(Math.max(...counts))

    // The rotation itself: the first three Kitchens go to three people.
    const firstThree = plan.assignments
      .filter((a) => a.taskId.startsWith('Kitchen'))
      .slice(0, 3)
      .map((a) => a.personId)
    expect(new Set(firstThree).size).toBe(3)
  })
})

describe('"Amber is off Thursday and Friday"', () => {
  const constraints: Constraint[] = [
    { kind: 'unavailable_weekday', personId: 'amber', weekdays: ['TH', 'FR'] },
  ]

  it('never puts her on those days', () => {
    const plan = buildAssignmentPlan(week('Kitchen'), people, constraints)
    const hers = plan.assignments.filter((a) => a.personId === 'amber')
    const dates = new Set(hers.map((a) => a.taskId.split('-').slice(1).join('-')))
    expect(dates.has('2026-09-10')).toBe(false)
    expect(dates.has('2026-09-11')).toBe(false)
  })

  it('still assigns those days to someone', () => {
    const plan = buildAssignmentPlan(week('Kitchen'), people, constraints)
    expect(plan.assignments).toHaveLength(7)
    expect(plan.unassignable).toEqual([])
  })
})

describe('"Robert does no housekeeping tasks"', () => {
  it('keeps him off them but leaves him the rest', () => {
    const housekeeping = week('Kitchen', 'Daily Housekeeping')
    const animals = week('Goats', 'Daily Animals')

    const constraints: Constraint[] = [
      { kind: 'exclude_tasks', personId: 'robert', taskIds: housekeeping.map((t) => t.id) },
    ]

    const plan = buildAssignmentPlan([...housekeeping, ...animals], people, constraints)

    const robertsTasks = plan.assignments
      .filter((a) => a.personId === 'robert')
      .map((a) => a.taskId)

    expect(robertsTasks.every((id) => id.startsWith('Goats'))).toBe(true)
    expect(robertsTasks.length).toBeGreaterThan(0)
  })
})

describe('both instructions together', () => {
  it('honours them at once and still fills the week', () => {
    const housekeeping = week('Kitchen', 'Daily Housekeeping')
    const animals = week('Goats', 'Daily Animals')

    const plan = buildAssignmentPlan([...housekeeping, ...animals], people, [
      { kind: 'unavailable_weekday', personId: 'amber', weekdays: ['TH', 'FR'] },
      { kind: 'exclude_tasks', personId: 'robert', taskIds: housekeeping.map((t) => t.id) },
    ])

    expect(plan.assignments).toHaveLength(14)
    expect(plan.unassignable).toEqual([])

    for (const assignment of plan.assignments) {
      const task = [...housekeeping, ...animals].find((t) => t.id === assignment.taskId)!
      if (assignment.personId === 'amber') {
        expect(['TH', 'FR']).not.toContain(task.weekday)
      }
      if (assignment.personId === 'robert') {
        expect(task.groupLabel).not.toBe('Daily Housekeeping')
      }
    }
  })
})

describe('when nobody can do it', () => {
  it('says so rather than assigning anyway', () => {
    const tasks = week('Kitchen')
    const constraints: Constraint[] = people.map((person) => ({
      kind: 'unavailable_weekday' as const,
      personId: person.id,
      weekdays: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const as any,
    }))

    const plan = buildAssignmentPlan(tasks, people, constraints)

    expect(plan.assignments).toEqual([])
    expect(plan.unassignable).toHaveLength(7)
    expect(plan.unassignable[0].reason).toContain('off on')
  })

  it('reports the reason per task, not a bare failure', () => {
    const plan = buildAssignmentPlan(week('Kitchen'), people, [
      { kind: 'only_people', taskIds: ['Kitchen-2026-09-07'], personIds: ['nobody'] },
    ])

    const stuck = plan.unassignable.find((u) => u.taskId === 'Kitchen-2026-09-07')
    expect(stuck).toBeDefined()
    expect(stuck!.reason).toContain('restricted')
    // The rest of the week is unaffected.
    expect(plan.assignments).toHaveLength(6)
  })
})

describe('max per day', () => {
  it('stops one person taking everything on a single day', () => {
    const morning = { ...week('Kitchen')[0], id: 'a' }
    const noon = { ...week('Goats')[0], id: 'b' }
    const evening = { ...week('Pigs')[0], id: 'c' }

    const plan = buildAssignmentPlan([morning, noon, evening], [{ id: 'solo', name: 'Solo' }], [
      { kind: 'max_per_day', personId: null, limit: 2 },
    ])

    expect(plan.assignments).toHaveLength(2)
    expect(plan.unassignable).toHaveLength(1)
    expect(plan.unassignable[0].reason).toContain('already has 2')
  })
})

describe('constraints that bind nothing', () => {
  it('are reported, because they usually mean a misread instruction', () => {
    const plan = buildAssignmentPlan(week('Kitchen'), people, [
      { kind: 'unavailable_weekday', personId: 'someone-not-here', weekdays: ['MO'] },
    ])

    expect(plan.inertConstraints).toHaveLength(1)
  })

  it('does not report a constraint that actually bit', () => {
    const plan = buildAssignmentPlan(week('Kitchen'), people, [
      { kind: 'unavailable_weekday', personId: 'amber', weekdays: ['MO'] },
    ])

    expect(plan.inertConstraints).toEqual([])
  })
})
