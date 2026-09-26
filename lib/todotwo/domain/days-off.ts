import type { Weekday } from '@/lib/todotwo/domain/recurrence'
import { addFarmDays, farmDaysBetween, type FarmDate } from '@/lib/todotwo/time'
import {
  stayConstraints,
  timeOffConstraints,
  type ApprovedTimeOff,
  type StayWindow,
} from '@/lib/todotwo/domain/assignment-inputs'

/**
 * Days off, decided by headcount.
 *
 * The farm used to give everybody a fixed weekly pair ("Saturday and
 * Sunday"), stored as a two-weekday unavailable_weekday rule. With fewer
 * people that no longer works: on a day where three of six are off by their
 * weekly pair, nobody is left to cook. The owner's rule replaces it:
 *
 *   * 5 or more people available on a date -> exactly one of them is off.
 *   * 4 or fewer                            -> nobody is off.
 *
 * Four is the floor because the two animal rounds and the two meals are kept
 * on four different people by the separation rules; a fifth person is the
 * first one the farm can spare.
 *
 * The weekly pair rules are therefore no longer honoured by the automatic
 * rota (see isWeeklyDaysOffPair) — leaving them in force would stack a second
 * set of days off on top of this one. They stay in the database untouched.
 */

/** Available people needed to cover both animal rounds and both meals. */
export const MINIMUM_CREW = 4

/**
 * Day zero of the rotation. Fixed, never "today", so the schedule for a given
 * date is the same on every run: somebody booking a cabin for the 10th needs
 * the 10th to still be theirs tomorrow. A Monday, so blocks start Mon/Wed/...
 * in the first week; there is nothing deeper to it than that.
 */
export const ROTATION_ANCHOR: FarmDate = '2026-09-28'

/** Each person's break is this many consecutive days, where headcount allows. */
export const BLOCK_DAYS = 2

/**
 * A newcomer is on the onboarding ramp (shadowing, then handoffs) for their
 * first five days and the automatic rota does not use them. They cannot be
 * given a day off from a rota they are not on, nor counted as cover.
 */
export const RAMP_DAYS_OUTSIDE_ROTA = 5

export const WEEKDAYS: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

/** The two weekdays covered by a weekly break starting on `start`. Sunday wraps. */
export function daysOffPair(start: Weekday): [Weekday, Weekday] {
  const index = WEEKDAYS.indexOf(start)
  return [start, WEEKDAYS[(index + 1) % 7]]
}

/**
 * True for the legacy "two consecutive weekdays off" rule shape. Those rules
 * are superseded by dayOffSchedule and must be dropped before solving, or a
 * person would be off on their old weekly pair AND their rotation block.
 * Any other weekday rule (one day, or all seven for a nonparticipant) is a
 * different intention and is left alone.
 */
export function isWeeklyDaysOffPair(weekdays: readonly string[]): boolean {
  if (weekdays.length !== 2) return false
  const start = weekdays[0] as Weekday
  if (!WEEKDAYS.includes(start)) return false
  return daysOffPair(start).every((day) => weekdays.includes(day))
}

// ---------------------------------------------------------------------------
// Who is in the rotation, and when they are available
// ---------------------------------------------------------------------------

export interface RotaPersonFacts {
  id: string
  name: string
  farmStartDate: FarmDate | null
  /**
   * Excluded from automatic assignment altogether (an enabled
   * unavailable_weekday rule covering all seven days — e.g. the owner).
   * Not cover, and never "given" a day off from work they do not do.
   */
  nonparticipant: boolean
  /** Dates they are away: approved time off, or firmly outside their stay. */
  awayDates: FarmDate[]
}

/**
 * Away dates per person, from the same readers the solver uses. Reusing
 * timeOffConstraints/stayConstraints (rather than re-deriving) means a stay
 * with a merely provisional end is treated identically here and in the rota:
 * a warning, not an absence.
 */
export function awayDatesByPerson(
  timeOff: Pick<ApprovedTimeOff, 'personId' | 'startDate' | 'endDate'>[],
  stays: StayWindow[],
  window: { from: FarmDate; to: FarmDate },
  peopleIds: string[]
): Map<string, FarmDate[]> {
  const nameOf = () => ''
  const away = new Map<string, Set<FarmDate>>()
  const parts = [
    timeOffConstraints(timeOff.map((row, i) => ({ ...row, id: String(i), kind: 'time_off' })), window, nameOf),
    stayConstraints(stays, window, peopleIds, nameOf),
  ]
  for (const { constraint } of parts.flatMap((part) => part.sourced)) {
    if (constraint.kind !== 'unavailable_dates') continue
    const set = away.get(constraint.personId) ?? new Set<FarmDate>()
    constraint.dates.forEach((date) => set.add(date))
    away.set(constraint.personId, set)
  }
  return new Map(Array.from(away, ([id, dates]) => [id, Array.from(dates).sort()]))
}

export interface RotaParticipant {
  id: string
  name: string
  /** Dates this person cannot work, so neither counts as cover nor takes the day off. */
  unavailableDates: FarmDate[]
}

/**
 * The people the rotation cycles through, with every date they cannot work.
 *
 * Available on a date = active and not deleted (the caller's query), not a
 * nonparticipant, past the onboarding ramp, and not away. Kept in one place
 * so the cron and the Upcoming panel cannot disagree about who is off.
 */
export function rotaParticipants(people: RotaPersonFacts[], from: FarmDate, days: number): RotaParticipant[] {
  return people
    .filter((person) => !person.nonparticipant)
    .map((person) => {
      const unavailable = new Set(person.awayDates)
      if (person.farmStartDate) {
        for (let offset = 0; offset < days; offset += 1) {
          const date = addFarmDays(from, offset)
          const sinceStart = farmDaysBetween(person.farmStartDate, date)
          if (sinceStart >= 0 && sinceStart < RAMP_DAYS_OUTSIDE_ROTA) unavailable.add(date)
        }
      }
      return { id: person.id, name: person.name, unavailableDates: Array.from(unavailable).sort() }
    })
}

// ---------------------------------------------------------------------------
// The schedule
// ---------------------------------------------------------------------------

export interface DayOffEntry {
  date: FarmDate
  /** How many people could work that date, the off person included. */
  available: number
  /** The one person off, or null when the farm cannot spare anybody. */
  off: { id: string; name: string } | null
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/**
 * Who is off on each of the `days` dates starting at `from`.
 *
 * Participants are ordered by id — stable, and unaffected by renames. Dates
 * are cut into two-day blocks counted from ROTATION_ANCHOR; block k belongs to
 * participant k mod N. With N people everybody gets two consecutive days
 * every 2N days, and the whole thing is a function of the date alone, so it
 * never reshuffles between nightly runs.
 *
 * On each date:
 *   * fewer than MINIMUM_CREW + 1 available -> nobody off;
 *   * the block's owner is available        -> they are off;
 *   * the owner is away (holiday, ramp)     -> the next available person in
 *     rotation order is off instead. The owner is resting anyway; the rule is
 *     "exactly one person off when five can work", and the stand-in is the
 *     person whose own block is soonest, so the substitution is predictable
 *     and costs them nothing they were not about to get.
 *
 * Known limit: N is part of the arithmetic, so somebody joining or leaving
 * the rotation re-deals the blocks from then on. Already-published days are
 * not remembered anywhere; see the report for the trade-off.
 */
export function dayOffSchedule(participants: RotaParticipant[], from: FarmDate, days = 14): DayOffEntry[] {
  const order = [...participants].sort((a, b) => a.id.localeCompare(b.id))
  const unavailable = new Map(order.map((person) => [person.id, new Set(person.unavailableDates)]))
  const isAvailable = (person: RotaParticipant, date: FarmDate) => !unavailable.get(person.id)!.has(date)
  const out: DayOffEntry[] = []

  for (let offset = 0; offset < days; offset += 1) {
    const date = addFarmDays(from, offset)
    const available = order.filter((person) => isAvailable(person, date)).length

    let off: DayOffEntry['off'] = null
    if (available > MINIMUM_CREW) {
      const block = Math.floor(farmDaysBetween(ROTATION_ANCHOR, date) / BLOCK_DAYS)
      const ownerIndex = mod(block, order.length)
      for (let step = 0; step < order.length; step += 1) {
        const candidate = order[(ownerIndex + step) % order.length]
        if (isAvailable(candidate, date)) {
          off = { id: candidate.id, name: candidate.name }
          break
        }
      }
    }

    out.push({ date, available, off })
  }

  return out
}

/**
 * One person's days off as date ranges, consecutive days merged. Dates rather
 * than weekday names because the point is planning: "20-21 October" is
 * something you can book a cabin against.
 */
export function breaksFor(schedule: DayOffEntry[], personId: string): { from: FarmDate; to: FarmDate }[] {
  const breaks: { from: FarmDate; to: FarmDate }[] = []
  for (const entry of schedule) {
    if (entry.off?.id !== personId) continue
    const last = breaks[breaks.length - 1]
    if (last && addFarmDays(last.to, 1) === entry.date) last.to = entry.date
    else breaks.push({ from: entry.date, to: entry.date })
  }
  return breaks
}

// ---------------------------------------------------------------------------
// Releasing work already held on a day off
// ---------------------------------------------------------------------------

/** Statuses where the work is over; nothing to hand back. */
const FINISHED_STATUSES = new Set(['completed', 'verified', 'cancelled'])

export interface HeldAssignment {
  assignmentId: string
  taskId: string
  personId: string
  /** Who created the row. Equal to personId when the person took it themselves. */
  assignedByPersonId: string | null
  role: string
  unassignedAt: string | null
  dueDate: FarmDate
  taskStatus: string
}

/**
 * Assignments to take back because their holder turned out to be off that day.
 *
 * The nightly round only places unassigned work, so a task assigned before a
 * day off was known — the day was not in the schedule yet, or headcount
 * changed — would otherwise stay with the person on their day off forever.
 *
 * Kept, deliberately:
 *   * today — a day already under way. Pulling the morning round off
 *     somebody at 04:00 and hoping the solver finds a taker is how animals go
 *     unfed; today's rota stands and is fixed by people, not the cron;
 *   * anything the person took themselves (claim_task / "I'll take charge",
 *     or a task they created for themselves): assigned_by_person_id equals
 *     person_id. Volunteering on your day off is allowed;
 *   * finished work, ended rows, and non-assignee roles.
 */
export function assignmentsToRelease(
  held: HeldAssignment[],
  schedule: DayOffEntry[],
  today: FarmDate
): HeldAssignment[] {
  const offOn = new Map(schedule.flatMap((day) => (day.off ? [[day.date, day.off.id] as const] : [])))
  return held.filter((row) =>
    row.dueDate > today &&
    offOn.get(row.dueDate) === row.personId &&
    row.role === 'assignee' &&
    row.unassignedAt === null &&
    row.assignedByPersonId !== row.personId &&
    !FINISHED_STATUSES.has(row.taskStatus))
}
