'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Copy } from 'lucide-react'

import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

/**
 * Duplicates a task via todotwo.clone_task(), which does the copy
 * server-side in one transaction (title, description, project/section,
 * labels, steps). Defaults to the same due date and assignee; both are
 * optionally overridable here before confirming, styled after the small
 * inline-form pattern used by add-stay-form.
 */
export function DuplicateTaskButton({
  taskId,
  defaultDueDate,
}: {
  taskId: string
  defaultDueDate: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [dueDate, setDueDate] = React.useState(defaultDueDate ?? '')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      const supabase = getTodoTwoBrowserClient()
      const { data, error: rpcError } = await supabase.rpc('clone_task', {
        p_task_id: taskId,
        p_due_date: dueDate || null,
        p_assignee_id: null,
      })
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      setOpen(false)
      if (data) router.push(todoTwoRoutes.home() + `/tasks/${data}`)
      else router.refresh()
    } finally {
      setPending(false)
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Duplicate
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--tt-rule)] p-4">
      <p className="text-[13px] text-[var(--tt-ink-2)]">
        Creates a new task with the same title, description, labels and steps. Same assignee
        unless you pick a different date here.
      </p>
      <label className="flex flex-col gap-1 text-[13px]">
        Due date
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-md border border-[var(--tt-rule)] bg-transparent px-3 py-2 text-[14px]"
        />
      </label>
      {error ? (
        <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" disabled={pending} onClick={confirm}>
          Create duplicate
        </Button>
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
