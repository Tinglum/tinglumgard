'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { addFarmDays, farmToday } from '@/lib/todotwo/time'

/**
 * Push an unclaimed job to tomorrow.
 *
 * Sits next to the claim button, deliberately quieter than it: the useful
 * answer to "nobody has taken this" is usually somebody taking it, and moving
 * it should look like the lesser option rather than the easy one.
 *
 * Only ever offered on work nobody holds. defer_task enforces that too — a
 * task with somebody's name on it is theirs to move.
 */
export function SnoozeTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function snooze() {
    setPending(true)
    setError(null)

    const supabase = getTodoTwoBrowserClient()
    const { error: rpcError } = await supabase.rpc('defer_task', {
      p_task_id: taskId,
      p_new_date: addFarmDays(farmToday(), 1),
    })

    setPending(false)

    if (rpcError) {
      setError(
        /taken that one on/i.test(rpcError.message)
          ? 'Somebody has it now.'
          : /already finished/i.test(rpcError.message)
            ? 'Already done.'
            : 'Could not move it.'
      )
      return
    }

    router.refresh()
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={snooze}
        disabled={pending}
        className="min-h-9 whitespace-nowrap px-2 text-[12px] text-[var(--tt-ink-3)] hover:underline disabled:opacity-60"
      >
        {pending ? 'Moving …' : 'Tomorrow'}
      </button>
      {error ? <p className="text-[11px] text-[var(--tt-danger)]">{error}</p> : null}
    </div>
  )
}
