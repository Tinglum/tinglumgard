'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Clock, Repeat } from 'lucide-react'

import { cn } from '@/lib/utils'
import { copy } from '@/lib/todotwo/copy'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'
import { PRIORITY_COLOR, PriorityFlag } from '@/components/todotwo/ui/priority-flag'
import { Avatar } from '@/components/todotwo/ui/avatar'

export interface TaskRowAssignee {
  id: string
  fullName: string
  preferredName: string | null
  photoUrl: string | null
}

export interface TaskRowData {
  id: string
  title: string
  description: string | null
  status: string
  priority: number
  due_at: string | null
  series_id: string | null
  estimated_minutes: number | null
  requires_feed_check?: boolean
  assignee?: TaskRowAssignee | null
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
  // Evening animal routines: asked in place of the immediate optimistic tick.
  const [asking, setAsking] = React.useState(false)

  const showUndo = undoUntil !== null && Date.now() < undoUntil

  React.useEffect(() => {
    if (undoUntil === null) return
    const timer = setTimeout(() => setUndoUntil(null), UNDO_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [undoUntil])

  async function commit(next: boolean, hasEnoughFood: boolean | null) {
    setDone(next)
    setPending(true)
    setError(null)
    setAsking(false)

    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: rpcError } = await supabase.rpc(
        next ? 'complete_task' : 'uncomplete_task',
        next ? { p_task_id: task.id, p_has_enough_food: hasEnoughFood } : { p_task_id: task.id }
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

  function toggle() {
    if (pending) return
    const next = !done

    // Un-completing, or a task that carries no feed-check obligation, goes
    // straight through as before. Completing one that does requires the
    // question answered first — no optimistic tick until then.
    if (next && task.requires_feed_check) {
      setAsking(true)
      return
    }

    void commit(next, null)
  }

  const row = (
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

      <Link href={`${TODOTWO_BASE}/tasks/${task.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={cn('text-[15px] leading-snug', done && 'line-through')}>
            {task.title}
          </span>

          <PriorityFlag priority={task.priority} />

          {task.series_id ? (
            <Repeat
              className="h-3 w-3 shrink-0 text-[var(--tt-ink-3)]"
              aria-label="Recurring routine"
            />
          ) : null}

          {task.assignee ? (
            <span className="inline-flex items-center gap-1 text-[12px] text-[var(--tt-ink-3)]">
              <Avatar person={task.assignee} size={20} />
              {task.assignee.preferredName?.trim() || task.assignee.fullName}
            </span>
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
        </div>

        {error ? (
          <p role="alert" className="mt-1 text-[12px] text-[var(--tt-danger)]">
            {error}
          </p>
        ) : null}
      </Link>

      {/* Outside the Link: a button nested in an anchor is invalid, and tapping
          undo would navigate to the task instead of undoing it. */}
      {showUndo ? (
        <button
          type="button"
          onClick={toggle}
          className="mt-1 shrink-0 text-[12px] font-medium text-[var(--tt-accent)] underline underline-offset-2"
        >
          {copy.common.undo}
        </button>
      ) : null}

      <ChevronRight
        className="mt-1 h-4 w-4 shrink-0 text-[var(--tt-rule-strong)]"
        aria-hidden="true"
      />
    </li>
  )

  return asking ? (
    <React.Fragment>
      {row}
      <li className="flex flex-col gap-2 border-b border-[var(--tt-rule)] bg-[var(--tt-surface-2,transparent)] py-3 last:border-b-0">
        <p className="text-[13px] font-medium text-[var(--tt-ink)]">
          Enough feed for the next two days?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void commit(true, true)}
            disabled={pending}
            className="rounded-md bg-[var(--tt-accent)] px-3 py-1.5 text-[13px] font-medium text-[var(--tt-on-accent)] disabled:opacity-60"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => void commit(true, false)}
            disabled={pending}
            className="rounded-md border border-[var(--tt-rule-strong)] px-3 py-1.5 text-[13px] font-medium disabled:opacity-60"
          >
            No
          </button>
          <button
            type="button"
            onClick={() => setAsking(false)}
            disabled={pending}
            className="px-3 py-1.5 text-[13px] text-[var(--tt-ink-3)] hover:underline"
          >
            Cancel
          </button>
        </div>
      </li>
    </React.Fragment>
  ) : (
    row
  )
}
