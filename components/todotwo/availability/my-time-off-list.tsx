import { Surface, EmptyState } from '@/components/todotwo/ui/states'
import type { TimeOffRequestRow } from '@/lib/todotwo/queries'
import { CalendarOff } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  declined: 'Declined',
}

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-[var(--tt-surface-2)] text-[var(--tt-ink-2)]',
  approved: 'bg-[var(--tt-accent-soft)] text-[var(--tt-accent)]',
  declined: 'bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]',
}

const KIND_LABEL: Record<string, string> = {
  day_off: 'Day off',
  appointment: 'Appointment',
  trip: 'Trip',
  illness: 'Illness',
  partial_day: 'Partial day',
}

function formatRange(start: string, end: string): string {
  return start === end ? start : `${start} – ${end}`
}

/** A person's own requests and their status, read-only. */
export function MyTimeOffList({ requests }: { requests: TimeOffRequestRow[] }) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="No requests yet"
        description="Anything you request shows up here, with its status."
      />
    )
  }

  return (
    <Surface className="px-4">
      <ul className="list-none">
        {requests.map((request) => (
          <li
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[var(--tt-rule)] py-3 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="text-[15px] tabular-nums">{formatRange(request.start_date, request.end_date)}</p>
              <p className="truncate text-[13px] text-[var(--tt-ink-3)]">
                {KIND_LABEL[request.kind] ?? request.kind}
                {request.reason ? ` — ${request.reason}` : ''}
              </p>
              {request.status !== 'pending' && request.decision_note ? (
                <p className="truncate text-[13px] text-[var(--tt-ink-3)]">Note: {request.decision_note}</p>
              ) : null}
            </div>

            <span
              className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[request.status] ?? ''}`}
            >
              {STATUS_LABEL[request.status] ?? request.status}
            </span>
          </li>
        ))}
      </ul>
    </Surface>
  )
}
