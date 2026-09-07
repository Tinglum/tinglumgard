'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RotateCcw } from 'lucide-react'

import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

export function UndoCompletionButton({ taskId, taskTitle }: { taskId: string; taskTitle: string }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [reopened, setReopened] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function undo() {
    if (pending) return
    setPending(true)
    setError(null)

    try {
      const db = getTodoTwoBrowserClient()
      const { error: rpcError } = await db.rpc('uncomplete_task', { p_task_id: taskId })
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      setReopened(true)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not undo completion.')
    } finally {
      setPending(false)
    }
  }

  if (reopened) {
    return <span className="shrink-0 text-[12px] font-medium text-[var(--tt-accent)]">Reopened</span>
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void undo()}
        disabled={pending}
        aria-label={`Mark ${taskTitle} as not done`}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[var(--tt-rule-strong)] px-2.5 text-[12px] font-medium text-[var(--tt-ink-2)] disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
        {pending ? 'Undoing…' : 'Undo'}
      </button>
      {error ? <span className="max-w-48 text-right text-[11px] text-[var(--tt-danger)]" role="alert">{error}</span> : null}
    </div>
  )
}
