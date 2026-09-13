import { format, parseISO } from 'date-fns'
import { nextBreaksFor, type PersonDaysOff } from '@/lib/todotwo/domain/days-off'
import type { FarmDate } from '@/lib/todotwo/time'
import { Surface } from '@/components/todotwo/ui/states'

export function DaysOffCalendar({ people, personId, from }: { people: PersonDaysOff[]; personId: string; from: FarmDate }) {
  const me = people.find((person) => person.id === personId)
  const myBreaks = me?.daysOffStart ? nextBreaksFor(me.daysOffStart, from, 14) : []
  const date = (value: string) => format(parseISO(value), 'EEE d MMM')

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-accent)]">
          Days without assigned animal or household tasks
        </h2>
        <p className="mt-1 text-sm text-[var(--tt-ink-2)]">Perfect for a cabin trip.</p>
      </div>
      <Surface className="px-4">
        <ul className="list-none divide-y divide-[var(--tt-rule)]">
          {myBreaks.map((period) => (
            <li key={period.from} className="py-3 text-sm font-medium">
              {date(period.from)}–{date(period.to)}
            </li>
          ))}
          {myBreaks.length === 0 ? (
            <li className="py-3 text-sm text-[var(--tt-ink-2)]">Your task-free days have not been set yet.</li>
          ) : null}
        </ul>
      </Surface>
    </section>
  )
}
