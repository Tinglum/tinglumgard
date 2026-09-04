'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Eraser } from 'lucide-react'

import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

/**
 * Wipe the slate from today onwards, before re-assigning from scratch.
 *
 * Two deliberate restraints. It unassigns rather than deletes — every task,
 * routine and completed record stays exactly where it was — and it starts at
 * today, so nothing already in the past changes. Both are stated on the button
 * itself rather than buried in a tooltip, because "clear" is a word people
 * reasonably read as "delete".
 *
 * The confirmation is a second click on the same control rather than a modal:
 * enough to stop a mis-tap, not enough to become a dialog nobody reads. The
 * real boundary is todotwo.clear_assignments_from's own is_staff() check —
 * this component being staff-only in the UI is convenience, not security.
 */
export function ClearAssignments({ fromDate }: { fromDate: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [cleared, setCleared] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function clear() {
    setPending(true)
    setError(null)

    try {
      const supabase = getTodoTwoBrowserClient()
      const { data, error: rpcError } = await supabase.rpc('clear_assignments_from', {
        p_from: fromDate,
      })

      if (rpcError) {
        setError(rpcError.message)
        return
      }

      setCleared(typeof data === 'number' ? data : 0)
      setConfirming(false)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <Button size="sm" variant="danger" onClick={clear} disabled={pending}>
              {pending ? 'Clearing …' : 'Yes — unassign everyone from today onward'}
            </Button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="text-[13px] text-[var(--tt-ink-2)] underline-offset-4 hover:underline"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCleared(null)
              setError(null)
              setConfirming(true)
            }}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[var(--tt-danger)] px-3 text-[13px] text-[var(--tt-danger)] hover:bg-[var(--tt-danger-soft)]"
          >
            <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
            Clear all assignments
          </button>
        )}

        {cleared !== null ? (
          <span className="inline-flex items-center gap-1 text-[13px] text-[var(--tt-accent)]">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {cleared === 0
              ? 'Nothing to clear — no assigned work from today onward.'
              : `${cleared} task${cleared === 1 ? '' : 's'} unassigned.`}
          </span>
        ) : null}
      </div>

      <p className="text-[12px] leading-relaxed text-[var(--tt-ink-3)]">
        Unassign everyone from today onward. Nothing is deleted — the tasks, the routines and
        everything already finished stay exactly as they are, and nothing before today is touched.
      </p>

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
