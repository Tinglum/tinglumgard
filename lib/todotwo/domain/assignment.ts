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
  /**
   * "Whoever does the goats does the rabbits too", and by the same token
   * "morning and evening are the same person" — bundle Goats (Morning) with
   * Goats (Evening) and it falls out.
   *
   * Labels match a task's group (or its title) case-insensitively by
   * substring, so ticking "Goats" catches both its morning and evening
   * series without anyone having to name them exactly.
   */
  | { kind: 'same_person'; labels: string[] }
  /**
   * "Whoever does breakfast does not do dinner." Two sides that must land on
   * different people on any given day.
   */
  | { kind: 'different_people'; labelsA: string[]; labelsB: string[] }

export interface AssignableTask {
  id: string
  /** Farm-local date, YYYY-MM-DD. */
  date: string
  weekday: Weekday
  title: string
  /** For explanations and for matching "housekeeping tasks". */
  groupLabel: string | null
}

/**
 * Who has done a given piece of work recently, most recent first, keyed by
 * the same label the rotation is grouped under.
 *
 * Without this the solver has no memory. Balancing by total load looks like
 * rotation when everyone starts level, but the nightly round plans one fresh
 * day at a time with every load at zero, so the tie-break decides — and the
 * tie-break is alphabetical. Left alone it gives the same person dinner every
 * night, indefinitely.
 */
export type RotationHistory = Record<string, string[]>

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
/**
 * Does this task belong to a named group? Substring, case-insensitive, against
 * the group label first and the title second — someone ticking "Goats" means
 * the goat work, whether the series is called "Goats (Morning)" or the task is
 * simply titled "Goats".
 */
export function taskMatchesLabel(
  // Only the two fields it actually reads, so a stored rule can be matched
  // against a task shape that has no date attached yet.
  task: { title: string; groupLabel: string | null },
  label: string
): boolean {
  const needle = label.trim().toLowerCase()
  if (!needle) return false
  return (
    (task.groupLabel ?? '').toLowerCase().includes(needle) ||
    task.title.toLowerCase().includes(needle)
  )
}

function matchesAny(task: AssignableTask, labels: string[]): boolean {
  return labels.some((label) => taskMatchesLabel(task, label))
}

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
  constraints: Constraint[],
  history: RotationHistory = {}
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

  // Work is handed out in bundles, not single tasks. A bundle is normally one
  // task; a same_person rule makes it every task on that day matching the
  // bundled labels, so "whoever does the goats does the rabbits" and "morning
  // and evening are the same person" are the same mechanism.
  const bundles = constraints.filter(
    (c): c is Extract<Constraint, { kind: 'same_person' }> => c.kind === 'same_person'
  )
  const separations = constraints.filter(
    (c): c is Extract<Constraint, { kind: 'different_people' }> => c.kind === 'different_people'
  )

  /**
   * What this unit rotates against. Bundled work rotates as a bundle — the
   * goats-and-rabbits round is one turn, not four — and everything else
   * rotates on its own group name so "Dinner" is the same job every day
   * regardless of which occurrence row it is.
   */
  function rotationKeyFor(task: AssignableTask): string {
    const index = bundles.findIndex((bundle) => matchesAny(task, bundle.labels))
    if (index !== -1) return `bundle:${bundles[index].labels.join('+')}`
    return task.groupLabel ?? task.title
  }

  function bundleKeyFor(task: AssignableTask): string {
    const index = bundles.findIndex((bundle) => matchesAny(task, bundle.labels))
    // Bundled work is keyed per day: the same person all day, a fresh choice
    // tomorrow, which is what keeps the rota rotating.
    return index === -1 ? `task:${task.id}` : `bundle:${index}:${task.date}`
  }

  const units = new Map<string, AssignableTask[]>()
  for (const task of ordered) {
    const key = bundleKeyFor(task)
    const list = units.get(key)
    if (list) list.push(task)
    else units.set(key, [task])
  }

  // Which side of each separation rule a person is already on, per day.
  const sideHeld = new Map<string, 'A' | 'B'>()
  const sideKey = (personId: string, date: string, index: number) =>
    `${personId}:${date}:${index}`

  for (const [, group] of Array.from(units)) {
    const date = group[0].date
    const eligible: AssignablePerson[] = []
    const rejected: Blocker[] = []

    for (const person of people) {
      // A bundle only works if one person can take all of it.
      const blockers = group.flatMap((task) =>
        blockersFor(person, task, constraints, assignedToday)
      )

      // ...and if it does not put them on both sides of a separation rule.
      separations.forEach((rule, index) => {
        const wantsA = group.some((task) => matchesAny(task, rule.labelsA))
        const wantsB = group.some((task) => matchesAny(task, rule.labelsB))
        const held = sideHeld.get(sideKey(person.id, date, index))

        if (wantsA && wantsB) {
          blockers.push({
            personId: person.id,
            reason: 'these are meant to be different people',
          })
          usedConstraints.add(rule)
        } else if ((wantsA && held === 'B') || (wantsB && held === 'A')) {
          blockers.push({
            personId: person.id,
            reason: 'already on the other side of that pairing today',
          })
          usedConstraints.add(rule)
        }
      })

      if (blockers.length === 0) {
        eligible.push(person)
      } else {
        rejected.push(blockers[0])
        for (const constraint of constraints) {
          const hit = group.some(
            (task) => blockersFor(person, task, [constraint], assignedToday).length > 0
          )
          if (hit) usedConstraints.add(constraint)
        }
      }
    }

    if (eligible.length === 0) {
      for (const task of group) {
        unassignable.push({
          taskId: task.id,
          title: task.title,
          date: task.date,
          reason:
            rejected.length > 0
              ? `Nobody available — ${rejected.map((r) => r.reason).join('; ')}`
              : 'Nobody available',
        })
      }
      continue
    }

    // Turn-taking first, then load, then name.
    //
    // "Nobody does the same job again until everyone else has had a turn"
    // cannot come out of load balancing: somebody excluded from other work is
    // permanently the least loaded, and a single-day window starts everyone at
    // zero. So whoever did this particular job longest ago goes first, and
    // whoever has never done it goes before all of them.
    const rotationKey = rotationKeyFor(group[0])

    // History arrives keyed by group label, because that is what a caller can
    // read out of past assignments. A bundle has no such label of its own, so
    // the first time one comes up its turns are gathered from the labels it
    // contains — otherwise the goats-and-rabbits round would look like work
    // nobody had ever done, every single run.
    if (history[rotationKey] === undefined) {
      const memberLabels = Array.from(
        new Set(group.map((t) => t.groupLabel ?? t.title))
      )
      const merged: string[] = []
      for (const label of memberLabels) {
        for (const personId of history[label] ?? []) {
          if (!merged.includes(personId)) merged.push(personId)
        }
      }
      history[rotationKey] = merged
    }

    const recent = history[rotationKey] ?? []

    // One cycle is everyone but the person about to take a turn. Anybody
    // inside that window has had this job since the last time it came round
    // to them, so they stand aside — which is precisely "nobody does it again
    // until everyone else has".
    //
    // Rotation only decides WHO IS DUE. Among those who are, load still
    // chooses, so a turn does not land on somebody already carrying twice
    // what anybody else is.
    const cycle = Math.max(0, eligible.length - 1)
    const hadRecentTurn = new Set(recent.slice(0, cycle))
    const due = eligible.filter((p) => !hadRecentTurn.has(p.id))
    const pool = due.length > 0 ? due : eligible

    const chosen = [...pool].sort((a, b) => {
      const diff = (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0)
      if (diff !== 0) return diff
      // Longest since their last turn, then name, so it is never arbitrary.
      const aSince = recent.indexOf(a.id)
      const bSince = recent.indexOf(b.id)
      const aRank = aSince === -1 ? Number.POSITIVE_INFINITY : aSince
      const bRank = bSince === -1 ? Number.POSITIVE_INFINITY : bSince
      if (aRank !== bRank) return bRank - aRank
      return a.name.localeCompare(b.name)
    })[0]

    const before = load.get(chosen.id) ?? 0

    // Remember this turn for the rest of the run, so a week planned in one go
    // rotates the same way a week planned a day at a time does.
    history[rotationKey] = [chosen.id, ...recent.filter((id) => id !== chosen.id)]

    // Record which side of each separation this bundle put them on, so the
    // rest of the day respects it.
    separations.forEach((rule, index) => {
      if (group.some((task) => matchesAny(task, rule.labelsA))) {
        sideHeld.set(sideKey(chosen.id, date, index), 'A')
      } else if (group.some((task) => matchesAny(task, rule.labelsB))) {
        sideHeld.set(sideKey(chosen.id, date, index), 'B')
      }
    })

    group.forEach((task, i) => {
      load.set(chosen.id, (load.get(chosen.id) ?? 0) + 1)

      const dayKey = `${chosen.id}:${task.date}`
      assignedToday.set(dayKey, (assignedToday.get(dayKey) ?? 0) + 1)

      assignments.push({
        taskId: task.id,
        personId: chosen.id,
        reason:
          group.length > 1
            ? `bundled with ${group.length - 1} other${group.length > 2 ? 's' : ''} that day`
            : eligible.length === people.length
              ? `fewest assigned so far (${before + i})`
              : `fewest assigned so far (${before + i}) among the ${eligible.length} available`,
      })
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
