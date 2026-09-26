import { format, parseISO } from 'date-fns'
import { breaksFor, type DayOffEntry } from '@/lib/todotwo/domain/days-off'
import { Surface } from '@/components/todotwo/ui/states'

/**
 * The viewer's own days off for the next two weeks, as dates.
 *
 * Staff also get the full roll — who is off each day, and the days nobody
 * can be spared — because they are the ones fielding "can I swap my days?".
 */
export function DaysOffCalendar({
  schedule,
  personId,
  showEveryone = false,
}: {
  schedule: DayOffEntry[]
  personId: string
  showEveryone?: boolean
}) {
  const myBreaks = breaksFor(schedule, personId)
  const date = (value: string) => format(parseISO(value), 'EEE d MMM')

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-accent)]">
          Days without assigned animal or household tasks
        </h2>
        <p className="mt-1 text-sm text-[var(--tt-ink-2)]">
          Perfect for a cabin trip. One person is off each day when five or more can work.
        </p>
      </div>
      <Surface className="px-4">
        <ul className="list-none divide-y divide-[var(--tt-rule)]">
          {myBreaks.map((period) => (
            <li key={period.from} className="py-3 text-sm font-medium">
              {period.from === period.to ? date(period.from) : `${date(period.from)}–${date(period.to)}`}
            </li>
          ))}
          {myBreaks.length === 0 ? (
            <li className="py-3 text-sm text-[var(--tt-ink-2)]">
              No days off for you in the next two weeks — the farm needs everyone on those days.
            </li>
          ) : null}
        </ul>
      </Surface>
      {showEveryone ? (
        <details className="text-sm">
          <summary className="cursor-pointer py-1 text-[var(--tt-ink-2)]">Who is off each day</summary>
          <Surface className="mt-2 px-4">
            <ul className="list-none divide-y divide-[var(--tt-rule)]">
              {schedule.map((day) => (
                <li key={day.date} className="flex justify-between gap-3 py-2">
                  <span>{date(day.date)}</span>
                  <span className={day.off ? 'font-medium' : 'text-[var(--tt-ink-3)]'}>
                    {day.off ? day.off.name : `Nobody (${day.available} available)`}
                  </span>
                </li>
              ))}
            </ul>
          </Surface>
        </details>
      ) : null}
    </section>
  )
}
