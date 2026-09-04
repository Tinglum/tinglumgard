'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

/**
 * Takes a task nobody is on. Only ever writes the caller's own name — see
 * todotwo.claim_task, which is what enforces that.
 *
 * The refusals are worth showing rather than swallowing: "someone already has
 * that task" is the expected outcome when two people reach for the same job at
 * once, and it wants a plain answer and a refreshed list, not a silent no-op.
 */
export function ClaimTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function claim() {
    setPending(true)
    setError(null)

    const supabase = getTodoTwoBrowserClient()
    const { error: rpcError } = await supabase.rpc('claim_task', { p_task_id: taskId })

    if (rpcError) {
      setPending(false)
      setError(
        /already has that task/i.test(rpcError.message)
          ? 'Someone got there first.'
          : 'Could not take that one. Try again.'
      )
      // Either way the list is now stale — someone else's name is on it.
      router.refresh()
      return
    }

    router.refresh()
    setPending(false)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="secondary" onClick={claim} disabled={pending}>
        {pending ? 'Taking …' : "I'll take it"}
      </Button>
      {error ? <p className="text-[11px] text-[var(--tt-danger)]">{error}</p> : null}
    </div>
  )
}
