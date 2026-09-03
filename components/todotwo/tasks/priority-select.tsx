'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { PRIORITY_COLOR, PRIORITY_LABEL } from '@/components/todotwo/ui/priority-flag'

const PRIORITIES = [1, 2, 3, 4] as const

/**
 * Segmented P1–P4 control on the task detail page. Calls
 * todotwo.set_task_priority(), the narrow RPC that is the only writable path
 * to this column — staff or the task's own assignee, same gate as
 * complete_task.
 */
export function PrioritySelect({
  taskId,
  priority,
}: {
  taskId: string
  priority: number
}) {
  const router = useRouter()
  const [value, setValue] = React.useState(priority)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function choose(next: number) {
    if (next === value || pending) return
    const previous = value
    setValue(next)
    setPending(true)
    setError(null)

    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: rpcError } = await supabase.rpc('set_task_priority', {
        p_task_id: taskId,
        p_priority: next,
      })
      if (rpcError) {
        setValue(previous)
        setError(rpcError.message)
        return
      }
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] uppercase tracking-[0.1em] text-[var(--tt-ink-3)]">
        Priority
      </span>
      <div
        role="radiogroup"
        aria-label="Priority"
        className="inline-flex overflow-hidden rounded-md border border-[var(--tt-rule-strong)]"
      >
        {PRIORITIES.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={value === p}
            disabled={pending}
            onClick={() => choose(p)}
            title={PRIORITY_LABEL[p]}
            className={cn(
              'min-h-[40px] min-w-[44px] px-2 text-[13px] font-medium transition-colors disabled:opacity-50',
              value === p
                ? 'text-[var(--tt-on-accent)]'
                : 'bg-[var(--tt-surface)] text-[var(--tt-ink-2)] hover:bg-[var(--tt-surface-2)]',
              p !== 4 && 'border-r border-[var(--tt-rule-strong)]'
            )}
            style={value === p ? { backgroundColor: PRIORITY_COLOR[p] } : undefined}
          >
            P{p}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-[12px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
