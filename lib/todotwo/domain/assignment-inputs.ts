/**
 * Farm data → Constraint[].
 *
 * The solver in assignment.ts has always been able to express "Sam is away on
 * these dates" and "Robert does not do these tasks". What was missing is that
 * nothing ever told it. Three tables already hold the answers and were never
 * consulted:
 *
 *   time_off_requests  — an approved day off that the rota happily booked over
 *   stays              — someone whose visit ended last week, assigned tomorrow
 *   person_skills      — authorized_unsupervised, recorded and never read
 *
 * This module is the missing translation, and it is deliberately pure: no
 * database, no clock, no network. Everything it needs is passed in, so the
 * rules that decide whether an approved holiday is honoured can be tested
 * directly rather than only through a route that needs a live Postgres.
 *
 * Two design commitments run through it:
 *
 * 1. These constraints are NOT user constraints. A coordinator can untick a box
 *    they ticked and can rewrite a sentence they wrote; they cannot untick an
 *    approved holiday. Everything here comes back tagged with its source so the
 *    preview can show it as a separate, non-removable category rather than
 *    mixing it in with the removable chips.
 *
 * 2. Where the underlying data is uncertain, this warns rather than excludes.
 *    stays.date_certainty exists precisely because "sometime mid-June" and
 *    "arrives Tuesday the 16th" are different facts; treating a provisional
 *    departure as a hard wall would silently refuse to schedule someone who is
 *    very probably still here. See stayVerdictFor() for exactly which
 *    certainties are hard and which only warn.
 */

import type { Constraint } from '@/lib/todotwo/domain/assignment'

// ---------------------------------------------------------------------------
// Inputs — the shapes the loaders in lib/todotwo/queries-assignment.ts produce.
// Kept structural rather than importing row types, so this file stays free of
// anything that reaches a database.
// ---------------------------------------------------------------------------

/** How solid a stay boundary is. Mirrors todotwo.date_certainty. */
export type DateCertainty = 'preferred' | 'earliest' | 'latest' | 'provisional' | 'confirmed'

/** An approved row from time_off_requests, already filtered to the window. */
export interface ApprovedTimeOff {
  id: string
  personId: string
  /** Inclusive farm-local calendar days, YYYY-MM-DD. */
  startDate: string
  endDate: string
  kind: string
}

/** One visit, from stays. departureDate null means open-ended. */
export interface StayWindow {
  id: string
  personId: string
  arrivalDate: string
  arrivalCertainty: DateCertainty
  departureDate: string | null
  departureCertainty: DateCertainty | null
  status: string
}

/** One row of person_skills, reduced to the only question that matters here. */
export interface SkillAuthorization {
  personId: string
  skillId: string
  authorizedUnsupervised: boolean
}

/** A task in the window that requires a skill, from tasks_resolved. */
export interface TaskSkillRequirement {
  taskId: string
  title: string
  date: string
  skillId: string
  /** For the preview text. Null if the catalogue row could not be read. */
  skillName: string | null
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

/**
 * Where a constraint came from. The preview labels each group differently, so
 * a coordinator reading "why was Amber skipped" gets an answer rather than an
 * undifferentiated list.
 */
export type FarmConstraintSource = 'time_off' | 'stay' | 'skill'

export interface SourcedConstraint {
  source: FarmConstraintSource
  constraint: Constraint
  /** One line of plain English, already resolved to names. */
  detail: string
}

/**
 * Something the data says but cannot say firmly enough to act on. Shown, never
 * enforced — the whole point of date_certainty is that a provisional date is
 * not a decision.
 */
export interface FarmWarning {
  source: FarmConstraintSource
  personId: string | null
  taskId: string | null
  message: string
}

export interface FarmConstraintResult {
  sourced: SourcedConstraint[]
  warnings: FarmWarning[]
}

// ---------------------------------------------------------------------------
// Calendar arithmetic
// ---------------------------------------------------------------------------

/**
 * Every YYYY-MM-DD from `from` to `to` inclusive.
 *
 * UTC throughout and never converted to local time: a farm-local YYYY-MM-DD is
 * already the day it names, and running it through a local Date is how a
 * holiday ends up one day out for half the year.
 */
export function datesBetween(from: string, to: string): string[] {
  if (from > to) return []
  const out: string[] = []
  const [y, m, d] = from.split('-').map(Number)
  const cursor = new Date(Date.UTC(y, m - 1, d))
  // A guard rather than a while(true): a window this long is a bug in the
  // caller, and looping forever on it would take the request down with it.
  for (let i = 0; i < 3660; i += 1) {
    const iso = cursor.toISOString().slice(0, 10)
    if (iso > to) break
    out.push(iso)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}

/** The overlap of a row's own span with the assignment window, as dates. */
function overlapDates(
  startDate: string,
  endDate: string,
  window: { from: string; to: string }
): string[] {
  const from = startDate > window.from ? startDate : window.from
  const to = endDate < window.to ? endDate : window.to
  return datesBetween(from, to)
}

// ---------------------------------------------------------------------------
// 1. Approved time off
// ---------------------------------------------------------------------------

const TIME_OFF_LABEL: Record<string, string> = {
  day_off: 'a day off',
  appointment: 'an appointment',
  trip: 'a trip',
  illness: 'illness',
  partial_day: 'part of a day off',
}

/**
 * Approved time off, as unavailable_dates.
 *
 * Only approved rows reach here — pending and declined are the caller's job to
 * filter, and doing it in the query rather than here keeps a pending request
 * from ever being one boolean away from blocking a rota.
 *
 * partial_day is treated as a whole day. The schema stores partial days as
 * whole days with the detail in free-text notes, so there is nothing finer to
 * act on; blocking the day is the conservative reading, and it is called out in
 * the detail line so a coordinator can override by hand if half a day was meant.
 */
export function timeOffConstraints(
  timeOff: ApprovedTimeOff[],
  window: { from: string; to: string },
  nameOf: (personId: string) => string
): FarmConstraintResult {
  const sourced: SourcedConstraint[] = []
  const warnings: FarmWarning[] = []

  // One constraint per person, not per request: two adjacent approved requests
  // are one absence as far as the solver is concerned, and two constraints for
  // the same person would report as two rules in the preview.
  const byPerson = new Map<string, { dates: Set<string>; kinds: Set<string> }>()

  for (const row of timeOff) {
    const dates = overlapDates(row.startDate, row.endDate, window)
    if (dates.length === 0) continue

    let entry = byPerson.get(row.personId)
    if (!entry) {
      entry = { dates: new Set(), kinds: new Set() }
      byPerson.set(row.personId, entry)
    }
    for (const date of dates) entry.dates.add(date)
    entry.kinds.add(row.kind)

    if (row.kind === 'partial_day') {
      warnings.push({
        source: 'time_off',
        personId: row.personId,
        taskId: null,
        message: `${nameOf(row.personId)} has an approved partial day on ${dates.join(
          ', '
        )}. The whole day is blocked, because only whole days are recorded — assign by hand if part of the day was meant to be workable.`,
      })
    }
  }

  for (const [personId, entry] of Array.from(byPerson).sort((a, b) => a[0].localeCompare(b[0]))) {
    const dates = Array.from(entry.dates).sort()
    const kinds = Array.from(entry.kinds)
      .map((kind) => TIME_OFF_LABEL[kind] ?? kind)
      .sort()
      .join(' and ')

    sourced.push({
      source: 'time_off',
      constraint: { kind: 'unavailable_dates', personId, dates },
      detail: `${nameOf(personId)} has approved time off (${kinds}) on ${dates.join(', ')}.`,
    })
  }

  return { sourced, warnings }
}

// ---------------------------------------------------------------------------
// 2. Stays
// ---------------------------------------------------------------------------

/**
 * Which certainties are firm enough to exclude on.
 *
 * The asymmetry is not an oversight — it follows from what each value means:
 *
 *   arrival, 'earliest'   → "not before this date". Dates before it are
 *                           genuinely impossible, so excluding is correct.
 *   arrival, 'latest'     → "here by this date at the latest", so they may
 *                           already be here earlier. Excluding would be wrong.
 *   departure, 'latest'   → "gone by this date at the latest". Dates after it
 *                           are genuinely impossible.
 *   departure, 'earliest' → "here at least until this date", so they may still
 *                           be here after it.
 *   'confirmed'           → firm on either side.
 *   'provisional'         → a single date not yet locked. Warn only.
 *   'preferred'           → still being negotiated. Warn only.
 */
function isFirmArrival(certainty: DateCertainty): boolean {
  return certainty === 'confirmed' || certainty === 'earliest'
}

function isFirmDeparture(certainty: DateCertainty | null): boolean {
  return certainty === 'confirmed' || certainty === 'latest'
}

type StayVerdict = 'in' | 'out_firm' | 'out_uncertain'

/** Whether one stay puts a person on the farm on one date. */
export function stayVerdictFor(stay: StayWindow, date: string): StayVerdict {
  if (date < stay.arrivalDate) {
    return isFirmArrival(stay.arrivalCertainty) ? 'out_firm' : 'out_uncertain'
  }
  // An open-ended stay has no upper bound at all; it is not an uncertain one.
  if (stay.departureDate === null) return 'in'
  if (date > stay.departureDate) {
    return isFirmDeparture(stay.departureCertainty) ? 'out_firm' : 'out_uncertain'
  }
  return 'in'
}

/**
 * Stay windows, as unavailable_dates.
 *
 * A person with no stay row at all is left entirely alone. Staff, family and
 * neighbours are not Workawayers and have no visit to be inside or outside of;
 * excluding them for a missing stay would empty the rota, and warning about
 * every one of them every week would train coordinators to ignore warnings.
 *
 * Cancelled stays are dropped before this is called; a cancelled visit is not
 * evidence of presence.
 *
 * A date is a hard exclusion only when EVERY one of the person's stays places
 * it firmly outside. If any stay could cover it — because a boundary is
 * provisional or merely preferred — it becomes a warning instead, and the
 * solver is told nothing.
 */
export function stayConstraints(
  stays: StayWindow[],
  window: { from: string; to: string },
  peopleIds: string[],
  nameOf: (personId: string) => string
): FarmConstraintResult {
  const sourced: SourcedConstraint[] = []
  const warnings: FarmWarning[] = []
  const dates = datesBetween(window.from, window.to)

  const byPerson = new Map<string, StayWindow[]>()
  for (const stay of stays) {
    const list = byPerson.get(stay.personId)
    if (list) list.push(stay)
    else byPerson.set(stay.personId, [stay])
  }

  for (const personId of peopleIds) {
    const personStays = byPerson.get(personId)
    if (!personStays || personStays.length === 0) continue

    const firmlyAway: string[] = []
    const possiblyAway: string[] = []

    for (const date of dates) {
      const verdicts = personStays.map((stay) => stayVerdictFor(stay, date))
      if (verdicts.includes('in')) continue
      if (verdicts.every((v) => v === 'out_firm')) firmlyAway.push(date)
      else possiblyAway.push(date)
    }

    if (firmlyAway.length > 0) {
      sourced.push({
        source: 'stay',
        constraint: { kind: 'unavailable_dates', personId, dates: firmlyAway },
        detail: `${nameOf(personId)} is not on the farm on ${firmlyAway.join(
          ', '
        )} — outside a stay with confirmed dates.`,
      })
    }

    if (possiblyAway.length > 0) {
      warnings.push({
        source: 'stay',
        personId,
        taskId: null,
        message: `${nameOf(personId)} may not be on the farm on ${possiblyAway.join(
          ', '
        )} — the stay boundary is provisional, so they have NOT been excluded. Confirm the dates before relying on this rota.`,
      })
    }
  }

  return { sourced, warnings }
}

// ---------------------------------------------------------------------------
// 3. Skills
// ---------------------------------------------------------------------------

/**
 * Skill requirements, as exclude_tasks.
 *
 * The gate is authorized_unsupervised, not claimed_level and not
 * admin_verified_level. person_skills keeps those separate deliberately: a
 * claim is what someone says about themselves, a verified level is what staff
 * checked, and authorisation to work unsupervised is a third, narrower
 * decision. Assignment puts someone on a task alone, so the third is the one
 * that applies — an "expert" self-claim buys nothing here.
 *
 * Everyone unauthorized is excluded from every task carrying that requirement.
 * When that empties the field, no constraint is dropped to make the task fit:
 * the solver reports it in `unassignable` with the reasons, which is the whole
 * point. A task nobody is qualified for must show up as a task nobody is
 * qualified for, not as a quietly reassigned one.
 */
export function skillConstraints(
  requirements: TaskSkillRequirement[],
  authorizations: SkillAuthorization[],
  peopleIds: string[],
  nameOf: (personId: string) => string
): FarmConstraintResult {
  const sourced: SourcedConstraint[] = []
  const warnings: FarmWarning[] = []
  if (requirements.length === 0) return { sourced, warnings }

  const authorized = new Set(
    authorizations.filter((a) => a.authorizedUnsupervised).map((a) => `${a.personId}:${a.skillId}`)
  )

  // Grouped by skill so one person gets one constraint per skill rather than
  // one per task — the same absence stated once.
  const tasksBySkill = new Map<string, TaskSkillRequirement[]>()
  for (const req of requirements) {
    const list = tasksBySkill.get(req.skillId)
    if (list) list.push(req)
    else tasksBySkill.set(req.skillId, [req])
  }

  for (const [skillId, tasks] of Array.from(tasksBySkill).sort((a, b) => a[0].localeCompare(b[0]))) {
    const skillName = tasks.find((t: TaskSkillRequirement) => t.skillName)?.skillName ?? 'a required skill'
    const taskIds = tasks.map((t: TaskSkillRequirement) => t.taskId).sort()

    const qualified = peopleIds.filter((personId) => authorized.has(`${personId}:${skillId}`))
    const unqualified = peopleIds.filter((personId) => !authorized.has(`${personId}:${skillId}`))

    for (const personId of unqualified) {
      sourced.push({
        source: 'skill',
        constraint: { kind: 'exclude_tasks', personId, taskIds },
        detail: `${nameOf(personId)} is not signed off to work unsupervised on ${skillName}.`,
      })
    }

    if (qualified.length === 0) {
      // Said out loud as well as left to the unassignable list, because the
      // unassignable reason is per task and this is the one fact behind all of
      // them: nobody on the roster has been signed off at all.
      warnings.push({
        source: 'skill',
        personId: null,
        taskId: tasks[0]?.taskId ?? null,
        message: `Nobody on the roster is signed off to work unsupervised on ${skillName}, so ${
          tasks.length
        } task${tasks.length === 1 ? '' : 's'} cannot be assigned to anyone. Verify someone in that skill first.`,
      })
    }
  }

  return { sourced, warnings }
}

// ---------------------------------------------------------------------------
// Everything at once
// ---------------------------------------------------------------------------

export interface FarmDataInputs {
  window: { from: string; to: string }
  peopleIds: string[]
  nameOf: (personId: string) => string
  timeOff: ApprovedTimeOff[]
  stays: StayWindow[]
  skillRequirements: TaskSkillRequirement[]
  skillAuthorizations: SkillAuthorization[]
}

/**
 * All three sources, in a fixed order: time off, then stays, then skills.
 *
 * The order is what the preview shows and, more importantly, it is ahead of
 * every ticked box and every AI-parsed sentence at the call site. That is not
 * cosmetic. The solver treats constraints as a set and does not care, but a
 * coordinator reading the list should see the facts that were never up for
 * negotiation before the ones they chose this morning.
 */
export function farmConstraints(inputs: FarmDataInputs): FarmConstraintResult {
  const parts = [
    timeOffConstraints(inputs.timeOff, inputs.window, inputs.nameOf),
    stayConstraints(inputs.stays, inputs.window, inputs.peopleIds, inputs.nameOf),
    skillConstraints(
      inputs.skillRequirements,
      inputs.skillAuthorizations,
      inputs.peopleIds,
      inputs.nameOf
    ),
  ]

  return {
    sourced: parts.flatMap((p) => p.sourced),
    warnings: parts.flatMap((p) => p.warnings),
  }
}

// ---------------------------------------------------------------------------
// Fairness, weighted by time where time is known
// ---------------------------------------------------------------------------

/**
 * The solver balances by count, and this does not change that.
 *
 * buildAssignmentPlan tracks load as a number it increments by exactly one per
 * task; `existingLoad` is the only per-person number it accepts and it is a
 * starting offset, not a weight. There is no input through which "this task is
 * worth 90 minutes and that one is worth 5" can be expressed, so weighting the
 * solver itself would mean editing assignment.ts, which is frozen. This is
 * therefore a report on the plan, not a change to it: it says how lopsided the
 * result actually is once estimates are counted, so a coordinator can see that
 * an even seven-and-seven split is really 45 minutes against four hours.
 *
 * Missing estimates are never invented. tasks.estimated_minutes is populated
 * for some work and not for others, and filling the gaps with an average would
 * produce a confident number built on a guess. Instead each person's minutes
 * cover only their estimated tasks, the unestimated ones are counted and
 * reported separately, and `basis` says plainly which of the two the numbers
 * rest on.
 */
export type FairnessBasis = 'estimates' | 'counts' | 'mixed'

export interface FairnessRow {
  personId: string
  name: string
  /** Tasks assigned, the number the solver actually balanced on. */
  count: number
  /** Summed estimated_minutes across the assigned tasks that carry an estimate. */
  estimatedMinutes: number
  /** Assigned tasks with no estimate, so `estimatedMinutes` is read honestly. */
  tasksWithoutEstimate: number
}

export interface FairnessReport {
  basis: FairnessBasis
  rows: FairnessRow[]
  /** Busiest minus least busy, in minutes. Meaningless when basis is 'counts'. */
  spreadMinutes: number
  /** Busiest minus least busy, in tasks — what the solver balanced. */
  spreadCount: number
  /** How many assigned tasks carried an estimate, out of how many. */
  estimatedTaskCount: number
  assignedTaskCount: number
  /** One sentence for the preview, saying which basis the numbers used. */
  note: string
}

export function fairnessReport(
  assignments: { taskId: string; personId: string }[],
  load: { personId: string; name: string; count: number }[],
  estimates: Map<string, number | null>
): FairnessReport {
  const rows = new Map<string, FairnessRow>(
    load.map((entry) => [
      entry.personId,
      {
        personId: entry.personId,
        name: entry.name,
        count: entry.count,
        estimatedMinutes: 0,
        tasksWithoutEstimate: 0,
      },
    ])
  )

  let estimatedTaskCount = 0

  for (const assignment of assignments) {
    const row = rows.get(assignment.personId)
    if (!row) continue
    const minutes = estimates.get(assignment.taskId)
    if (typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0) {
      row.estimatedMinutes += minutes
      estimatedTaskCount += 1
    } else {
      row.tasksWithoutEstimate += 1
    }
  }

  const assignedTaskCount = assignments.length
  const basis: FairnessBasis =
    assignedTaskCount === 0 || estimatedTaskCount === 0
      ? 'counts'
      : estimatedTaskCount === assignedTaskCount
        ? 'estimates'
        : 'mixed'

  const ordered = Array.from(rows.values()).sort(
    (a, b) => b.estimatedMinutes - a.estimatedMinutes || b.count - a.count || a.name.localeCompare(b.name)
  )

  const minutes = ordered.map((r) => r.estimatedMinutes)
  const counts = ordered.map((r) => r.count)

  const spreadMinutes = minutes.length === 0 ? 0 : Math.max(...minutes) - Math.min(...minutes)
  const spreadCount = counts.length === 0 ? 0 : Math.max(...counts) - Math.min(...counts)

  const note =
    basis === 'counts'
      ? 'Balanced by number of tasks. None of the assigned tasks records an estimated duration, so there is no time to weigh.'
      : basis === 'estimates'
        ? `Balanced by number of tasks; every assigned task records an estimate, so the minutes below are complete. The busiest person has ${spreadMinutes} more minutes of work than the least busy.`
        : `Balanced by number of tasks. ${estimatedTaskCount} of ${assignedTaskCount} assigned tasks record an estimate, so the minutes below cover only those — the rest are counted, not timed.`

  return {
    basis,
    rows: ordered,
    spreadMinutes,
    spreadCount,
    estimatedTaskCount,
    assignedTaskCount,
    note,
  }
}
