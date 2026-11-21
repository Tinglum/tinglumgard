'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

/**
 * Takes a task nobody is on. Optimistically shows "Taken ✓" immediately on
 * click and syncs with todotwo.claim_task in the background.
 */
export function ClaimTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter()
  const [claimed, setClaimed] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function claim() {
    if (pending || claimed) return
    setClaimed(true)
    setPending(true)
    setError(null)

    const supabase = getTodoTwoBrowserClient()
    const { error: rpcError } = await supabase.rpc('claim_task', { p_task_id: taskId })

    setPending(false)

    if (rpcError) {
      setClaimed(false)
      setError(
        /already has that task/i.test(rpcError.message)
          ? 'Someone got there first.'
          : 'Could not take that one. Try again.'
      )
      router.refresh()
      return
    }

    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={claimed ? 'primary' : 'soft'}
        onClick={claim}
        disabled={pending || claimed}
      >
        {claimed ? 'Taken ✓' : 'Take it'}
      </Button>
      {error ? <p className="text-[11px] text-[var(--tt-danger)]">{error}</p> : null}
    </div>
  )
}
