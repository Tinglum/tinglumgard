import { describe, expect, it } from 'vitest'

import {
  type AssignableTask,
  type Constraint,
  buildAssignmentPlan,
  fairnessSpread,
} from '@/lib/todotwo/domain/assignment'
import { rulesToConstraints } from '@/lib/todotwo/domain/assignment-rules'

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

  it('supports a workload-derived limit for each date', () => {
    const monday = Array.from({ length: 5 }, (_, i) => ({ ...week(`M${i}`)[0], id: `m${i}` }))
    const tuesday = Array.from({ length: 2 }, (_, i) => ({ ...week(`T${i}`)[1], id: `t${i}` }))
    const plan = buildAssignmentPlan([...monday, ...tuesday], [{ id: 'solo', name: 'Solo' }], [
      { kind: 'max_per_day', personId: null, limit: 5, limitsByDate: { '2026-09-07': 3, '2026-09-08': 1 } },
    ])
    expect(plan.assignments.filter((a) => a.taskId.startsWith('m'))).toHaveLength(3)
    expect(plan.assignments.filter((a) => a.taskId.startsWith('t'))).toHaveLength(1)
  })

  it('counts a bundled morning and evening round as one daily responsibility', () => {
    const tasks = [
      { id: 'goats-am', title: 'Goats morning', groupLabel: 'Goats morning', date: '2026-09-07', weekday: 'MO' as const },
      { id: 'goats-pm', title: 'Goats evening', groupLabel: 'Goats evening', date: '2026-09-07', weekday: 'MO' as const },
      { id: 'dinner', title: 'Z dinner', groupLabel: 'Dinner', date: '2026-09-07', weekday: 'MO' as const },
    ]
    const plan = buildAssignmentPlan(tasks, [{ id: 'solo', name: 'Solo' }], [
      { kind: 'same_person', labels: ['Goats'] },
      { kind: 'max_per_day', personId: null, limit: 1 },
    ])
    expect(plan.assignments.map((a) => a.taskId)).toEqual(['goats-pm', 'goats-am'])
    expect(plan.unassignable.map((u) => u.taskId)).toEqual(['dinner'])
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

describe('work people already hold', () => {
  const day = { date: '2026-09-28', weekday: 'MO' as const }
  const people = [
    { id: 'theo', name: 'Theo' },
    { id: 'robbert', name: 'Robbert' },
  ]
  const livestockVsMeals = {
    kind: 'different_people' as const,
    labelsA: ['Goats', 'Rabbits'],
    labelsB: ['Dinner'],
  }
  const goatsAndRabbits = { kind: 'same_person' as const, labels: ['Goats', 'Rabbits'] }
  const released = [
    { id: 'g-am', title: 'Goats (Morning)', groupLabel: 'Goats (Morning)', ...day },
    { id: 'r-am', title: 'Rabbits (Morning)', groupLabel: 'Rabbits (Morning)', ...day },
  ]

  it('will not stack a livestock round on a dinner decided the night before', () => {
    // The production case: Theo got Monday's dinner on one night; Monday's
    // goats and rabbits were released and re-placed the next. Blind to the
    // dinner, the solver gave him both.
    // Stack the odds toward Theo — Robbert is busier and sorts first anyway —
    // so only knowing about the held dinner can steer the round away from him.
    const favourTheo = [
      { id: 'theo', name: 'Theo', existingLoad: 0 },
      { id: 'robbert', name: 'Robbert', existingLoad: 5 },
    ]
    const plan = buildAssignmentPlan(
      released,
      favourTheo,
      [goatsAndRabbits, livestockVsMeals],
      {},
      [{ personId: 'theo', date: day.date, title: 'Dinner', groupLabel: 'Dinner' }]
    )
    expect(plan.assignments.map((a) => a.personId)).toEqual(['robbert', 'robbert'])
  })

  it('counts a held bundle as one job toward the daily cap, not four', () => {
    const cap = { kind: 'max_per_day' as const, personId: null, limit: 2 }
    const kitchen = [{ id: 'k', title: 'Kitchen', groupLabel: 'Kitchen', ...day }]
    const heldRound = ['Goats (Morning)', 'Goats (Evening)', 'Rabbits (Morning)', 'Rabbits (Evening)'].map(
      (title) => ({ personId: 'theo', date: day.date, title, groupLabel: title })
    )
    // Theo holds one round (one job); a cap of two still leaves room for one more.
    const plan = buildAssignmentPlan(kitchen, [people[0]], [goatsAndRabbits, cap], {}, heldRound)
    expect(plan.assignments.map((a) => a.personId)).toEqual(['theo'])
  })
})

describe('rules against held work, end to end', () => {
  // The production case from 26 Sep: Kitchen was already handed to Miguel,
  // then dinner came round to be placed. Only Dinner was being placed, so the
  // "whoever cooks does not do the kitchen" rule had only one side among the
  // placements and rule resolution dropped it as unable to clash.
  const day = { date: '2026-09-27', weekday: 'SU' as const }
  const cookVsKitchen = {
    id: 'r1',
    label: 'Whoever cooks does not do the kitchen',
    kind: 'different_people' as const,
    payload: { labelsA: ['Breakfast', 'Dinner'], labelsB: ['Kitchen'] },
    enabled: true,
    sort_order: 1,
    source_text: null,
  }
  const dinner = [{ id: 'dinner', title: 'Dinner', groupLabel: 'Dinner', ...day }]
  const held = [{ personId: 'miguel', date: day.date, title: 'Kitchen', groupLabel: 'Kitchen' }]
  // Miguel is the easy pick — less loaded, and first alphabetically — so only
  // the rule can steer dinner away from him.
  const people = [
    { id: 'miguel', name: 'Miguel', existingLoad: 0 },
    { id: 'robbert', name: 'Robbert', existingLoad: 5 },
  ]

  it('drops the rule when resolved against placements alone (the bug)', () => {
    const { constraints } = rulesToConstraints([cookVsKitchen], dinner)
    const plan = buildAssignmentPlan(dinner, people, constraints, {}, held)
    expect(plan.assignments[0].personId).toBe('miguel')
  })

  it('keeps the cook off the kitchen when held work is part of resolution', () => {
    const { constraints } = rulesToConstraints([cookVsKitchen], [
      ...dinner,
      ...held.map((h, i) => ({ id: `held:${i}`, title: h.title, groupLabel: h.groupLabel })),
    ])
    const plan = buildAssignmentPlan(dinner, people, constraints, {}, held)
    expect(plan.assignments[0].personId).toBe('robbert')
  })
})

describe('a bundle somebody already holds part of', () => {
  it('sends the rest of it to them, not to whoever rotation prefers', () => {
    // 26 Sep: Aleksandra held Liam's morning; the evening came back to be
    // placed on its own and went to Miguel — one dog, two people, one day.
    const day = { date: '2026-09-26', weekday: 'SA' as const }
    const evening = [{ id: 'liam-pm', title: 'Liam (Evening)', groupLabel: 'Liam (Evening)', ...day }]
    const people = [
      { id: 'aleksandra', name: 'Aleksandra', existingLoad: 9 },
      { id: 'miguel', name: 'Miguel', existingLoad: 0 },
    ]
    const plan = buildAssignmentPlan(
      evening,
      people,
      [{ kind: 'same_person', labels: ['Liam'] }],
      { 'bundle:Liam': ['aleksandra'] },
      [{ personId: 'aleksandra', date: day.date, title: 'Liam (Morning)', groupLabel: 'Liam (Morning)' }]
    )
    expect(plan.assignments.map((a) => a.personId)).toEqual(['aleksandra'])
  })
})
