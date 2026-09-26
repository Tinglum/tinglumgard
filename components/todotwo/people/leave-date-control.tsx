'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

/**
 * Sets the day somebody leaves the farm.
 *
 * Sits beside "First day" in the people list because it is the other end of
 * the same thing, and because leaving used to be handled only after the fact —
 * somebody would go, and their name would stay on the next few days of work.
 *
 * Goes through set_person_leave_date rather than a plain update so that
 * setting the date and releasing the work they were already given cannot
 * happen one without the other. From the leave day on they are never
 * scheduled; clearing the date reassigns nothing, it just lets the nightly
 * round consider them again.
 */
export function LeaveDateControl({
  personId,
  value,
  canEdit,
}: {
  personId: string
  value: string | null
  canEdit: boolean
}) {
  const router = useRouter()
  const [date, setDate] = React.useState(value ?? '')
  const [pending, setPending] = React.useState(false)
  const [note, setNote] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  if (!canEdit) {
    return value ? (
      <span className="text-[12px] text-[var(--tt-ink-3)]">Leaves {value}</span>
    ) : null
  }

  async function save(next: string) {
    setPending(true)
    setError(null)
    setNote(null)

    const supabase = getTodoTwoBrowserClient()
    const { data, error: rpcError } = await supabase.rpc('set_person_leave_date', {
      p_person_id: personId,
      p_leave_date: next || null,
    })

    setPending(false)

    if (rpcError) {
      setError('Could not save that.')
      setDate(value ?? '')
      return
    }

    const released = typeof data === 'number' ? data : 0
    setNote(
      !next
        ? 'Leave date cleared.'
        : released > 0
          ? `Released ${released} task${released === 1 ? '' : 's'} from that day — up for grabs now.`
          : 'Saved. Nothing was assigned from that day.'
    )
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <label className="flex items-center gap-1.5 text-[12px] text-[var(--tt-ink-3)]">
        Leaves
        <input
          type="date"
          value={date}
          disabled={pending}
          onChange={(event) => {
            setDate(event.target.value)
            void save(event.target.value)
          }}
          className="min-h-[32px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[13px] text-[var(--tt-ink)]"
        />
      </label>
      {note ? <span className="text-[11px] text-[var(--tt-ink-2)]">{note}</span> : null}
      {error ? <span className="text-[11px] text-[var(--tt-danger)]">{error}</span> : null}
    </div>
  )
}
