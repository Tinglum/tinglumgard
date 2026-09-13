import { format, parseISO } from 'date-fns'
import { daysOffCalendar, nextBreaksFor, type PersonDaysOff } from '@/lib/todotwo/domain/days-off'
import type { FarmDate } from '@/lib/todotwo/time'
import { Surface } from '@/components/todotwo/ui/states'

export function DaysOffCalendar({ people, personId, from }: { people: PersonDaysOff[]; personId: string; from: FarmDate }) {
  const me = people.find((person) => person.id === personId)
  const myBreaks = me?.daysOffStart ? nextBreaksFor(me.daysOffStart, from, 14) : []
  const calendar = daysOffCalendar(people, from, 14).filter((day) => day.people.length > 0)
  const date = (value: string) => format(parseISO(value), 'EEE d MMM')

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-accent)]">Days off · next 14 days</h2>
        <p className="mt-1 text-sm text-[var(--tt-ink-2)]">
          {myBreaks.length ? `Yours: ${myBreaks.map((b) => `${date(b.from)}–${date(b.to)}`).join(', ')}` : 'Your days off have not been set yet.'}
        </p>
      </div>
      <Surface className="px-4">
        <ul className="list-none divide-y divide-[var(--tt-rule)]">
          {calendar.map((day) => (
            <li key={day.date} className="flex justify-between gap-4 py-2 text-sm">
              <span className="shrink-0 font-medium">{date(day.date)}</span>
              <span className="text-right text-[var(--tt-ink-2)]">{day.people.map((p) => p.name).join(', ')}</span>
            </li>
          ))}
        </ul>
      </Surface>
    </section>
  )
}
