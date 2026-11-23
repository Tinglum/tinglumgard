'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Clock, Repeat } from 'lucide-react'

import { cn } from '@/lib/utils'
import { copy } from '@/lib/todotwo/copy'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { canUntick, isFinished } from '@/lib/todotwo/domain/task-status'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'
import { PRIORITY_COLOR, PriorityFlag } from '@/components/todotwo/ui/priority-flag'
import { Avatar } from '@/components/todotwo/ui/avatar'
import { FenceReadingDialog } from '@/components/todotwo/tasks/fence-reading-dialog'
import { taskNeedsFenceReading } from '@/lib/todotwo/domain/fence'

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
export interface YesterdayResponsibleInfo {
  name: string | null
  completed: boolean
}

export function TaskRow({
  task,
  timeLabel,
  onChanged,
  onStatusChange,
  helpAction,
  hideAssignee = false,
  yesterdayInfo = null,
}: {
  task: TaskRowData
  timeLabel: string | null
  onChanged?: () => void
  /**
   * When provided by an interactive workspace (Today, Week Plan), status
   * updates flow directly into client state at 0 ms without triggering a
   * blocking full-page router.refresh().
   */
  onStatusChange?: (taskId: string, nextDone: boolean) => void
  helpAction?: React.ReactNode
  hideAssignee?: boolean
  yesterdayInfo?: YesterdayResponsibleInfo | null
}) {
  const router = useRouter()
  const [done, setDone] = React.useState(isFinished(task.status))
  React.useEffect(() => {
    setDone(isFinished(task.status))
  }, [task.status])
  const untickable = canUntick(task.status) || done
  const [pending, setPending] = React.useState(false)
  const [, startRefresh] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [undoUntil, setUndoUntil] = React.useState<number | null>(null)
  // Evening animal routines: asked in place of the immediate optimistic tick.
  const [asking, setAsking] = React.useState(false)
  const [askingFence, setAskingFence] = React.useState(false)

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
    onStatusChange?.(task.id, next)

    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: rpcError } = await supabase.rpc(
        next ? 'complete_task' : 'uncomplete_task',
        next ? { p_task_id: task.id, p_has_enough_food: hasEnoughFood } : { p_task_id: task.id }
      )

      if (rpcError) {
        setDone(!next)
        onStatusChange?.(task.id, !next)
        setError(rpcError.message)
        return
      }

      setUndoUntil(next ? Date.now() + UNDO_WINDOW_MS : null)
      onChanged?.()
      if (!onStatusChange) {
        startRefresh(() => router.refresh())
      }
    } catch (caught) {
      setDone(!next)
      onStatusChange?.(task.id, !next)
      setError(caught instanceof Error ? caught.message : 'Could not save')
    } finally {
      setPending(false)
    }
  }

  function toggle() {
    if (pending) return
    if (done && !untickable) return
    const next = !done

    if (next && task.requires_feed_check) {
      setAsking(true)
      return
    }

    if (next && taskNeedsFenceReading(task.title)) {
      setAskingFence(true)
      return
    }

    void commit(next, null)
  }

  const row = (
    <li
      className={cn(
        'group flex items-start gap-3 border-b border-[var(--tt-rule)] py-3.5 transition-opacity last:border-b-0',
        done && 'opacity-60'
      )}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={pending || (done && !untickable)}
        aria-pressed={done}
        aria-label={
          done
            ? untickable
              ? `Mark "${task.title}" as not done`
              : `"${task.title}" is done and cannot be reopened here`
            : `Complete "${task.title}"`
        }
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150 active:scale-90',
          done
            ? 'border-[var(--tt-accent)] bg-[var(--tt-accent)] text-[var(--tt-on-accent)]'
            : 'border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] hover:border-[var(--tt-accent)] hover:bg-[var(--tt-accent-soft)]'
        )}
        style={!done ? { borderColor: PRIORITY_COLOR[task.priority] } : undefined}
      >
        {done ? <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`${TODOTWO_BASE}/tasks/${task.id}`}
            className="text-[14.5px] font-medium leading-snug text-[var(--tt-ink)] transition-colors hover:text-[var(--tt-accent)]"
          >
            <span className={cn(done && 'text-[var(--tt-ink-3)] line-through')}>{task.title}</span>
          </Link>

          <PriorityFlag priority={task.priority} />

          {task.series_id ? (
            <Repeat
              className="h-3 w-3 shrink-0 text-[var(--tt-ink-3)]"
              aria-label="Recurring routine"
            />
          ) : null}

          {!hideAssignee && task.assignee ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tt-surface-2)] py-0.5 pl-0.5 pr-2 text-[11.5px] font-medium text-[var(--tt-ink-2)]">
              <Avatar person={task.assignee} size={18} />
              {task.assignee.preferredName?.trim() || task.assignee.fullName}
            </span>
          ) : null}
        </div>

        {task.description ? (
          <p className="mt-0.5 line-clamp-2 text-[13px] text-[var(--tt-ink-2)]">
            {task.description}
          </p>
        ) : null}

        {timeLabel || task.estimated_minutes || yesterdayInfo ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--tt-ink-3)]">
            {timeLabel ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--tt-surface-2)] px-1.5 py-0.5 font-medium tabular-nums text-[var(--tt-ink-2)]">
                <Clock className="h-3 w-3 text-[var(--tt-ink-3)]" aria-hidden="true" />
                {timeLabel}
              </span>
            ) : null}

            {task.estimated_minutes ? (
              <span className="tabular-nums">{task.estimated_minutes} min</span>
            ) : null}

            {yesterdayInfo ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium',
                  yesterdayInfo.completed
                    ? 'bg-[var(--tt-accent-soft)] text-[var(--tt-accent)]'
                    : 'bg-[var(--tt-warn-soft)] text-[var(--tt-warn)]'
                )}
              >
                Yesterday: {yesterdayInfo.name ?? 'Unclaimed'} ·{' '}
                {yesterdayInfo.completed ? 'Done ✓' : 'Not completed'}
              </span>
            ) : null}
          </div>
        ) : null}

        {helpAction ? <div className="mt-2">{helpAction}</div> : null}

        {error ? (
          <p role="alert" className="mt-1 text-[12px] text-[var(--tt-danger)]">
            {error}
          </p>
        ) : null}
      </div>

      {showUndo ? (
        <button
          type="button"
          onClick={toggle}
          className="mt-0.5 shrink-0 rounded-lg bg-[var(--tt-accent-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--tt-accent)] transition-colors hover:bg-[var(--tt-accent)] hover:text-[var(--tt-on-accent)]"
        >
          {copy.common.undo}
        </button>
      ) : null}

      <Link
        href={`${TODOTWO_BASE}/tasks/${task.id}`}
        aria-label={`Open ${task.title}`}
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[var(--tt-ink-3)] opacity-60 transition-all group-hover:bg-[var(--tt-surface-2)] group-hover:opacity-100"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </li>
  )

  // The dialog is a fixed overlay, so it sits over the whole screen rather than
  // in the list. Wrapped in a display:contents <li> only to keep the <ul> valid.
  if (askingFence) {
    return (
      <React.Fragment>
        {row}
        <li className="contents">
          <FenceReadingDialog
            taskId={task.id}
            onCancel={() => setAskingFence(false)}
            onSaved={async () => {
              setAskingFence(false)
              await commit(true, null)
            }}
          />
        </li>
      </React.Fragment>
    )
  }

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
            className="rounded-xl bg-[var(--tt-accent)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--tt-on-accent)] disabled:opacity-60"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => void commit(true, false)}
            disabled={pending}
            className="rounded-xl border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3.5 py-1.5 text-[13px] font-medium disabled:opacity-60"
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
