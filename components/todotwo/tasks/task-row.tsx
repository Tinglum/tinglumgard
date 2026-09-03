'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Clock, Repeat } from 'lucide-react'

import { cn } from '@/lib/utils'
import { copy } from '@/lib/todotwo/copy'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

export interface TaskRowData {
  id: string
  title: string
  description: string | null
  status: string
  priority: number
  due_at: string | null
  series_id: string | null
  estimated_minutes: number | null
}

const PRIORITY_COLOR: Record<number, string> = {
  1: 'var(--tt-danger)',
  2: 'var(--tt-warn)',
  3: 'var(--tt-accent)',
  4: 'var(--tt-rule-strong)',
}

const UNDO_WINDOW_MS = 8000

/**
 * One line of work.
 *
 * Completion is optimistic — the tick lands immediately, because standing in a
 * barn waiting for a round trip is the fastest way to stop using an app. If the
 * write fails the row comes back and says so. An eight-second undo follows,
 * which is also why completion goes through the RPC rather than a plain update:
 * uncomplete has to be available to the same person.
 */
export function TaskRow({
  task,
  timeLabel,
  onChanged,
}: {
  task: TaskRowData
  timeLabel: string | null
  onChanged?: () => void
}) {
  const router = useRouter()
  const [done, setDone] = React.useState(
    task.status === 'completed' || task.status === 'verified'
  )
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [undoUntil, setUndoUntil] = React.useState<number | null>(null)

  const showUndo = undoUntil !== null && Date.now() < undoUntil

  React.useEffect(() => {
    if (undoUntil === null) return
    const timer = setTimeout(() => setUndoUntil(null), UNDO_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [undoUntil])

  async function toggle() {
    if (pending) return
    const next = !done

    setDone(next)
    setPending(true)
    setError(null)

    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: rpcError } = await supabase.rpc(
        next ? 'complete_task' : 'uncomplete_task',
        { p_task_id: task.id }
      )

      if (rpcError) {
        setDone(!next) // roll back visibly rather than lying
        setError(rpcError.message)
        return
      }

      setUndoUntil(next ? Date.now() + UNDO_WINDOW_MS : null)
      onChanged?.()
      router.refresh()
    } catch (caught) {
      setDone(!next)
      setError(caught instanceof Error ? caught.message : 'Could not save')
    } finally {
      setPending(false)
    }
  }

  return (
    <li
      className={cn(
        'flex items-start gap-3 border-b border-[var(--tt-rule)] py-3 last:border-b-0',
        done && 'opacity-55'
      )}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={done}
        aria-label={done ? `Mark "${task.title}" as not done` : `Complete "${task.title}"`}
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          done
            ? 'border-[var(--tt-accent)] bg-[var(--tt-accent)] text-[var(--tt-on-accent)]'
            : 'border-[var(--tt-rule-strong)] hover:border-[var(--tt-accent)]'
        )}
        style={!done ? { borderColor: PRIORITY_COLOR[task.priority] } : undefined}
      >
        {done ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={cn('text-[15px] leading-snug', done && 'line-through')}>
            {task.title}
          </span>

          {task.series_id ? (
            <Repeat
              className="h-3 w-3 shrink-0 text-[var(--tt-ink-3)]"
              aria-label="Recurring routine"
            />
          ) : null}
        </div>

        {task.description ? (
          <p className="mt-0.5 line-clamp-2 text-[13px] text-[var(--tt-ink-2)]">
            {task.description}
          </p>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--tt-ink-3)]">
          {timeLabel ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {timeLabel}
            </span>
          ) : null}

          {task.estimated_minutes ? <span>{task.estimated_minutes} min</span> : null}

          {showUndo ? (
            <button
              type="button"
              onClick={toggle}
              className="font-medium text-[var(--tt-accent)] underline underline-offset-2"
            >
              {copy.common.undo}
            </button>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="mt-1 text-[12px] text-[var(--tt-danger)]">
            {error}
          </p>
        ) : null}
      </div>

      <ChevronRight
        className="mt-1 h-4 w-4 shrink-0 text-[var(--tt-rule-strong)]"
        aria-hidden="true"
      />
    </li>
  )
}
