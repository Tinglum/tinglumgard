import type { Constraint } from '@/lib/todotwo/domain/assignment'

/**
 * How Tinglumgård divides a day, in one place.
 *
 * These were hard-coded in the assignment console as a button. They are now
 * shared, because the nightly auto-assignment has to apply exactly the same
 * arrangement — two definitions of "who pairs with what" would drift, and the
 * first anyone would know of it is a person doing the goats in the morning
 * and somebody else doing them at night.
 *
 * In the owner's words: same person for goats and rabbits, another for
 * chickens, ducks and pigs, Liam on his own; morning and evening always the
 * same person; separate people for breakfast and dinner; whoever does a
 * livestock round does neither meal; whoever cooks does not do the kitchen.
 * Liam is deliberately outside the meals rule — feeding and walking the dog
 * is lighter than a livestock round, so his person may still cook.
 *
 * Labels are matched loosely against a task's group and title, so "Goats"
 * covers both "Goats (Morning)" and "Goats (Evening)" without naming either.
 */
export const FARM_PAIRINGS: { id: string; labels: string[] }[] = [
  { id: 'farm-goats-rabbits', labels: ['Goats', 'Rabbits'] },
  { id: 'farm-chickens-pigs', labels: ['Chickens + Ducks', 'Pigs'] },
  // A single label still bundles: it ties Liam (Morning) to Liam (Evening).
  { id: 'farm-liam', labels: ['Liam'] },
]

export const FARM_SEPARATIONS: { id: string; labelsA: string[]; labelsB: string[] }[] = [
  { id: 'farm-meals-apart', labelsA: ['Breakfast'], labelsB: ['Dinner'] },
  {
    id: 'farm-animals-not-meals',
    labelsA: ['Goats', 'Rabbits', 'Chickens + Ducks', 'Pigs'],
    labelsB: ['Breakfast', 'Dinner'],
  },
  { id: 'farm-meals-not-kitchen', labelsA: ['Breakfast', 'Dinner'], labelsB: ['Kitchen'] },
]

/** The same arrangement as solver constraints, for anything assigning directly. */
export function farmRuleConstraints(): Constraint[] {
  return [
    ...FARM_PAIRINGS.map((p) => ({ kind: 'same_person' as const, labels: p.labels })),
    ...FARM_SEPARATIONS.map((s) => ({
      kind: 'different_people' as const,
      labelsA: s.labelsA,
      labelsB: s.labelsB,
    })),
  ]
}
