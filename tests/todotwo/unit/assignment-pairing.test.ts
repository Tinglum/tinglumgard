import { describe, expect, it } from 'vitest'

import {
  type AssignableTask,
  type Constraint,
  buildAssignmentPlan,
} from '@/lib/todotwo/domain/assignment'

/**
 * The rules the farm actually runs on, in the owner's own words:
 *
 *   same person for goats+rabbits, another for chickens+ducks+pigs, separate
 *   people for breakfast and dinner, morning/evening always the same person.
 *   Whoever does the animals does not do breakfast or dinner. Whoever does
 *   breakfast does not do dinner. Whoever does breakfast or dinner does not
 *   do kitchen.
 *
 * None of it was expressible before — the parser was dropping these on the
 * floor and saying so.
 */

const people = [
  { id: 'amber', name: 'Amber' },
  { id: 'robert', name: 'Robert' },
  { id: 'sam', name: 'Sam' },
  { id: 'tina', name: 'Tina' },
]

/** One day of the farm's real shape, morning and evening. */
function day(date: string): AssignableTask[] {
  const of = (title: string): AssignableTask => ({
    id: `${title}-${date}`,
    date,
    weekday: 'MO',
    title,
    groupLabel: title,
  })
  return [
    of('Goats (Morning)'),
    of('Goats (Evening)'),
    of('Rabbits (Morning)'),
    of('Rabbits (Evening)'),
    of('Chickens + Ducks (Morning)'),
    of('Chickens + Ducks (Evening)'),
    of('Pigs (Morning)'),
    of('Pigs (Evening)'),
    of('Breakfast ready'),
    of('Dinner'),
    of('Kitchen'),
  ]
}

const FARM_RULES: Constraint[] = [
  { kind: 'same_person', labels: ['Goats', 'Rabbits'] },
  { kind: 'same_person', labels: ['Chickens + Ducks', 'Pigs'] },
  { kind: 'different_people', labelsA: ['Breakfast'], labelsB: ['Dinner'] },
  {
    kind: 'different_people',
    labelsA: ['Goats', 'Rabbits', 'Chickens + Ducks', 'Pigs'],
    labelsB: ['Breakfast', 'Dinner'],
  },
  { kind: 'different_people', labelsA: ['Breakfast', 'Dinner'], labelsB: ['Kitchen'] },
]

function personFor(plan: ReturnType<typeof buildAssignmentPlan>, title: string, date = '2026-09-07') {
  return plan.assignments.find((a) => a.taskId === `${title}-${date}`)?.personId
}

describe('the pairing rules the farm actually uses', () => {
  const plan = buildAssignmentPlan(day('2026-09-07'), people, FARM_RULES)

  it('assigns everything', () => {
    expect(plan.unassignable).toEqual([])
    expect(plan.assignments).toHaveLength(11)
  })

  it('gives goats and rabbits to one person', () => {
    const goats = personFor(plan, 'Goats (Morning)')
    expect(personFor(plan, 'Rabbits (Morning)')).toBe(goats)
    expect(personFor(plan, 'Rabbits (Evening)')).toBe(goats)
  })

  it('gives chickens, ducks and pigs to one person', () => {
    const chickens = personFor(plan, 'Chickens + Ducks (Morning)')
    expect(personFor(plan, 'Pigs (Morning)')).toBe(chickens)
    expect(personFor(plan, 'Pigs (Evening)')).toBe(chickens)
  })

  it('keeps morning and evening with the same person', () => {
    expect(personFor(plan, 'Goats (Evening)')).toBe(personFor(plan, 'Goats (Morning)'))
    expect(personFor(plan, 'Pigs (Evening)')).toBe(personFor(plan, 'Pigs (Morning)'))
  })

  it('keeps the two animal rounds on different people', () => {
    expect(personFor(plan, 'Goats (Morning)')).not.toBe(
      personFor(plan, 'Chickens + Ducks (Morning)')
    )
  })

  it('puts breakfast and dinner on different people', () => {
    expect(personFor(plan, 'Breakfast ready')).not.toBe(personFor(plan, 'Dinner'))
  })

  it('keeps the animal people off breakfast and dinner', () => {
    const animals = [
      personFor(plan, 'Goats (Morning)'),
      personFor(plan, 'Chickens + Ducks (Morning)'),
    ]
    expect(animals).not.toContain(personFor(plan, 'Breakfast ready'))
    expect(animals).not.toContain(personFor(plan, 'Dinner'))
  })

  it('keeps the breakfast and dinner people off the kitchen', () => {
    const meals = [personFor(plan, 'Breakfast ready'), personFor(plan, 'Dinner')]
    expect(meals).not.toContain(personFor(plan, 'Kitchen'))
  })

  it('is deterministic — the same day twice gives the same rota', () => {
    const again = buildAssignmentPlan(day('2026-09-07'), people, FARM_RULES)
    expect(again.assignments).toEqual(plan.assignments)
  })
})

describe('bundles across days', () => {
  it('can rotate: the goat person tomorrow need not be the goat person today', () => {
    const two = [...day('2026-09-07'), ...day('2026-09-08')]
    const plan = buildAssignmentPlan(two, people, FARM_RULES)

    // Whoever it is, each day is internally consistent.
    for (const date of ['2026-09-07', '2026-09-08']) {
      const goats = personFor(plan, 'Goats (Morning)', date)
      expect(personFor(plan, 'Rabbits (Evening)', date)).toBe(goats)
      expect(personFor(plan, 'Breakfast ready', date)).not.toBe(goats)
    }
  })
})

describe('when the rules cannot all hold', () => {
  it('says so rather than quietly breaking one', () => {
    // Two people, but the rules need at least four distinct roles in a day.
    const plan = buildAssignmentPlan(day('2026-09-07'), people.slice(0, 2), FARM_RULES)
    expect(plan.unassignable.length).toBeGreaterThan(0)
    expect(plan.unassignable[0].reason).toMatch(/nobody available/i)
  })
})
