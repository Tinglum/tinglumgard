'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { copy } from '@/lib/todotwo/copy'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

export function CompleteTaskButton({ taskId, done }: { taskId: string; done: boolean }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function toggle() {
    setPending(true)
    setError(null)
    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: rpcError } = await supabase.rpc(
        done ? 'uncomplete_task' : 'complete_task',
        { p_task_id: taskId }
      )
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={toggle}
        disabled={pending}
        variant={done ? 'secondary' : 'primary'}
        size="lg"
        block
      >
        {pending ? copy.common.wait : done ? 'Mark as not done' : 'Complete task'}
      </Button>
      {error ? (
        <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
