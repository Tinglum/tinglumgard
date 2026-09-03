import { CalendarClock } from 'lucide-react'

import { EmptyState, Surface } from '@/components/todotwo/ui/states'
import { DATE_CERTAINTY_LABEL, type DateCertainty } from '@/lib/todotwo/domain/stays'
import type { StayRow } from '@/lib/todotwo/queries'

function DateWithCertainty({
  date,
  certainty,
}: {
  date: string | null
  certainty: string | null
}) {
  if (!date) return <span className="text-[var(--tt-ink-3)]">Open-ended</span>
  const label = certainty ? DATE_CERTAINTY_LABEL[certainty as DateCertainty] : null
  return (
    <span>
      {date}
      {label ? <span className="text-[var(--tt-ink-3)]"> · {label.toLowerCase()}</span> : null}
    </span>
  )
}

export function StaysList({
  title,
  stays,
  emptyDescription,
}: {
  title: string
  stays: StayRow[]
  emptyDescription: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
        {title}
      </h2>

      {stays.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Nothing here" description={emptyDescription} />
      ) : (
        <Surface className="px-4">
          <ul className="list-none">
            {stays.map((stay) => (
              <li
                key={stay.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[var(--tt-rule)] py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-[15px]">{stay.preferred_name || stay.full_name}</p>
                  <p className="text-[13px] text-[var(--tt-ink-2)]">
                    <DateWithCertainty date={stay.arrival_date} certainty={stay.arrival_certainty} />
                    {' – '}
                    <DateWithCertainty
                      date={stay.departure_date}
                      certainty={stay.departure_certainty}
                    />
                  </p>
                </div>
                <span className="shrink-0 rounded bg-[var(--tt-surface-2)] px-2 py-0.5 text-[11px] text-[var(--tt-ink-3)]">
                  {stay.status}
                </span>
              </li>
            ))}
          </ul>
        </Surface>
      )}
    </div>
  )
}
