/**
 * Turning constraints into an assignment.
 *
 * Deliberately deterministic and pure: the same inputs always produce the same
 * rota, and every choice can be explained. A language model may translate
 * "Robert does no housekeeping" into a rule, but it never decides who works
 * Tuesday — that has to be reproducible, reviewable, and defensible to the
 * person who ends up on dishes.
 */

export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

export type Constraint =
  /** "Amber is off Thursday and Friday" */
  | { kind: 'unavailable_weekday'; personId: string; weekdays: Weekday[] }
  /** "Sam is away 12–15 September" */
  | { kind: 'unavailable_dates'; personId: string; dates: string[] }
  /** "Robert does no housekeeping tasks" */
  | { kind: 'exclude_tasks'; personId: string; taskIds: string[] }
  /** "Only Anna milks the goats" */
  | { kind: 'only_people'; taskIds: string[]; personIds: string[] }
  /** "Nobody does more than three things a day" */
  | { kind: 'max_per_day'; personId: string | null; limit: number }

export interface AssignableTask {
  id: string
  /** Farm-local date, YYYY-MM-DD. */
  date: string
  weekday: Weekday
  title: string
  /** For explanations and for matching "housekeeping tasks". */
  groupLabel: string | null
}

export interface AssignablePerson {
  id: string
  name: string
  /** Work already on their plate in this window, so balancing starts honest. */
  existingLoad?: number
}

export interface Assignment {
  taskId: string
  personId: string
  /** Why this person, in words a human can check. */
  reason: string
}

export interface Unassignable {
  taskId: string
  title: string
  date: string
  /** Why nobody could take it. */
  reason: string
}

export interface AssignmentPlan {
  assignments: Assignment[]
  unassignable: Unassignable[]
  /** Final count per person, for the fairness summary. */
  load: { personId: string; name: string; count: number }[]
  /** Constraints that bound nothing — usually a sign of a misread instruction. */
  inertConstraints: Constraint[]
}

interface Blocker {
  personId: string
  reason: string
}

/** Every reason a person cannot take a particular task. */
function blockersFor(
  person: AssignablePerson,
  task: AssignableTask,
  constraints: Constraint[],
  assignedToday: Map<string, number>
): Blocker[] {
  const blockers: Blocker[] = []

  for (const constraint of constraints) {
    switch (constraint.kind) {
      case 'unavailable_weekday':
        if (constraint.personId === person.id && constraint.weekdays.includes(task.weekday)) {
          blockers.push({ personId: person.id, reason: `off on ${task.weekday}` })
        }
        break

      case 'unavailable_dates':
        if (constraint.personId === person.id && constraint.dates.includes(task.date)) {
          blockers.push({ personId: person.id, reason: `away on ${task.date}` })
        }
        break

      case 'exclude_tasks':
        if (constraint.personId === person.id && constraint.taskIds.includes(task.id)) {
          blockers.push({ personId: person.id, reason: `does not do ${task.groupLabel ?? task.title}` })
        }
        break

      case 'only_people':
        if (constraint.taskIds.includes(task.id) && !constraint.personIds.includes(person.id)) {
          blockers.push({ personId: person.id, reason: 'this is restricted to specific people' })
        }
        break

      case 'max_per_day': {
        if (constraint.personId !== null && constraint.personId !== person.id) break
        const key = `${person.id}:${task.date}`
        if ((assignedToday.get(key) ?? 0) >= constraint.limit) {
          blockers.push({ personId: person.id, reason: `already has ${constraint.limit} on ${task.date}` })
        }
        break
      }
    }
  }

  return blockers
}

/**
 * Builds a plan.
 *
 * Greedy, in date order, always giving the next task to the eligible person
 * carrying the least so far. Ties break on name, so the result is stable rather
 * than dependent on map ordering — two runs over the same data produce the same
 * rota, which matters when someone asks why they got Saturday again.
 */
export function buildAssignmentPlan(
  tasks: AssignableTask[],
  people: AssignablePerson[],
  constraints: Constraint[]
): AssignmentPlan {
  const load = new Map<string, number>()
  const assignedToday = new Map<string, number>()

  for (const person of people) {
    load.set(person.id, person.existingLoad ?? 0)
  }

  const assignments: Assignment[] = []
  const unassignable: Unassignable[] = []
  const usedConstraints = new Set<Constraint>()

  const ordered = [...tasks].sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
  )

  for (const task of ordered) {
    const eligible: AssignablePerson[] = []
    const rejected: Blocker[] = []

    for (const person of people) {
      const blockers = blockersFor(person, task, constraints, assignedToday)
      if (blockers.length === 0) {
        eligible.push(person)
      } else {
        rejected.push(blockers[0])
        for (const constraint of constraints) {
          if (blockersFor(person, task, [constraint], assignedToday).length > 0) {
            usedConstraints.add(constraint)
          }
        }
      }
    }

    if (eligible.length === 0) {
      unassignable.push({
        taskId: task.id,
        title: task.title,
        date: task.date,
        reason:
          rejected.length > 0
            ? `Nobody available — ${rejected.map((r) => r.reason).join('; ')}`
            : 'Nobody available',
      })
      continue
    }

    const chosen = [...eligible].sort((a, b) => {
      const diff = (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0)
      return diff !== 0 ? diff : a.name.localeCompare(b.name)
    })[0]

    const before = load.get(chosen.id) ?? 0
    load.set(chosen.id, before + 1)

    const dayKey = `${chosen.id}:${task.date}`
    assignedToday.set(dayKey, (assignedToday.get(dayKey) ?? 0) + 1)

    assignments.push({
      taskId: task.id,
      personId: chosen.id,
      reason:
        eligible.length === people.length
          ? `fewest assigned so far (${before})`
          : `fewest assigned so far (${before}) among the ${eligible.length} available`,
    })
  }

  return {
    assignments,
    unassignable,
    load: people
      .map((person) => ({
        personId: person.id,
        name: person.name,
        count: load.get(person.id) ?? 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    inertConstraints: constraints.filter((c) => !usedConstraints.has(c)),
  }
}

/** How lopsided a plan is: the gap between the busiest and the least busy. */
export function fairnessSpread(plan: AssignmentPlan): number {
  if (plan.load.length === 0) return 0
  const counts = plan.load.map((entry) => entry.count)
  return Math.max(...counts) - Math.min(...counts)
}
