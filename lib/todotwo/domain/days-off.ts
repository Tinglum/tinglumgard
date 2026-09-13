import type { Weekday } from '@/lib/todotwo/domain/recurrence'
import { addFarmDays, type FarmDate } from '@/lib/todotwo/time'
import { weekdayOfDate } from '@/lib/todotwo/domain/recurrence'

/**
 * Two consecutive days off a week.
 *
 * One value is stored — the day the break starts — and the second day is
 * derived. Storing a pair would allow "Monday and Thursday", which is not two
 * days off in a row and would be impossible to police once somebody had saved
 * it. Deriving it means the shape cannot be wrong.
 */

export const WEEKDAYS: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  MO: 'Monday',
  TU: 'Tuesday',
  WE: 'Wednesday',
  TH: 'Thursday',
  FR: 'Friday',
  SA: 'Saturday',
  SU: 'Sunday',
}

/** The two weekdays covered by a break starting on `start`. Sunday wraps. */
export function daysOffPair(start: Weekday): [Weekday, Weekday] {
  const index = WEEKDAYS.indexOf(start)
  return [start, WEEKDAYS[(index + 1) % 7]]
}

export function describeDaysOff(start: Weekday | null | undefined): string | null {
  if (!start || !WEEKDAYS.includes(start)) return null
  const [first, second] = daysOffPair(start)
  return `${WEEKDAY_NAMES[first]} and ${WEEKDAY_NAMES[second]}`
}

export interface PersonDaysOff {
  id: string
  name: string
  daysOffStart: Weekday | null
}

export interface DayOffEntry {
  date: FarmDate
  weekday: Weekday
  /** Everybody whose break covers this date. */
  people: { id: string; name: string }[]
}

/**
 * Who is off on each of the next `days` days.
 *
 * Returned as real dates rather than weekday names because the whole point is
 * planning: "Saturday and Sunday" is not something you can book a cabin
 * against, and "20-21 September" is.
 */
export function daysOffCalendar(
  people: PersonDaysOff[],
  from: FarmDate,
  days = 14
): DayOffEntry[] {
  const out: DayOffEntry[] = []

  for (let offset = 0; offset < days; offset += 1) {
    const date = addFarmDays(from, offset)
    const weekday = weekdayOfDate(date)

    const off = people.filter((person) => {
      if (!person.daysOffStart) return false
      return daysOffPair(person.daysOffStart).includes(weekday)
    })

    out.push({
      date,
      weekday,
      people: off.map((person) => ({ id: person.id, name: person.name })),
    })
  }

  return out
}

/**
 * The next stretch of days off for one person, as a date range.
 *
 * Scans forward rather than doing modular arithmetic on weekday indexes,
 * because the wrap at Sunday and the wrap at the end of a month are two
 * different problems and only one of them is interesting.
 */
export function nextBreaksFor(
  start: Weekday,
  from: FarmDate,
  days = 14
): { from: FarmDate; to: FarmDate }[] {
  const pair = daysOffPair(start)
  const breaks: { from: FarmDate; to: FarmDate }[] = []

  for (let offset = 0; offset < days; offset += 1) {
    const date = addFarmDays(from, offset)
    if (weekdayOfDate(date) !== pair[0]) continue
    breaks.push({ from: date, to: addFarmDays(date, 1) })
  }

  // A break already under way on the first day: its second half still counts,
  // and somebody looking at this on their day off should see it.
  if (weekdayOfDate(from) === pair[1]) {
    breaks.unshift({ from: addFarmDays(from, -1), to: from })
  }

  return breaks
}
