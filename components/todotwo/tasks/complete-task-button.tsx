'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { copy } from '@/lib/todotwo/copy'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { FenceReadingDialog } from '@/components/todotwo/tasks/fence-reading-dialog'

export function CompleteTaskButton({
  taskId,
  done,
  requiresFeedCheck = false,
  requiresFenceReading = false,
}: {
  taskId: string
  done: boolean
  /** Evening animal routines: must answer the feed-sufficiency question before completing. */
  requiresFeedCheck?: boolean
  requiresFenceReading?: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [refreshing, startRefresh] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  // Only asked when completing (not un-completing) a task that requires it.
  const [asking, setAsking] = React.useState(false)
  const [askingFence, setAskingFence] = React.useState(false)

  async function complete(hasEnoughFood: boolean | null) {
    setPending(true)
    setError(null)
    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: rpcError } = await supabase.rpc('complete_task', {
        p_task_id: taskId,
        p_has_enough_food: hasEnoughFood,
      })
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      setAsking(false)
      startRefresh(() => router.refresh())
    } finally {
      setPending(false)
    }
  }

  async function uncomplete() {
    setPending(true)
    setError(null)
    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: rpcError } = await supabase.rpc('uncomplete_task', { p_task_id: taskId })
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      startRefresh(() => router.refresh())
    } finally {
      setPending(false)
    }
  }

  function toggle() {
    if (done) {
      void uncomplete()
      return
    }
    if (requiresFeedCheck) {
      setAsking(true)
      return
    }
    if (requiresFenceReading) {
      setAskingFence(true)
      return
    }
    void complete(null)
  }

  if (askingFence) return <FenceReadingDialog taskId={taskId} onCancel={() => setAskingFence(false)} onSaved={async () => { setAskingFence(false); await complete(null) }} />

  if (asking) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-[var(--tt-ink)]">
          Enough feed for the next two days?
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => void complete(true)}
            disabled={pending}
            variant="primary"
            size="lg"
          >
            Yes
          </Button>
          <Button
            onClick={() => void complete(false)}
            disabled={pending}
            variant="secondary"
            size="lg"
          >
            No
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setAsking(false)}
          disabled={pending}
          className="self-start text-[12px] text-[var(--tt-ink-3)] hover:underline"
        >
          Cancel
        </button>
        {error ? (
          <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={toggle}
        disabled={pending || refreshing}
        variant={done ? 'secondary' : 'primary'}
        size="lg"
        block
      >
        {pending || refreshing ? copy.common.wait : done ? 'Mark as not done' : 'Complete task'}
      </Button>
      {error ? (
        <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
