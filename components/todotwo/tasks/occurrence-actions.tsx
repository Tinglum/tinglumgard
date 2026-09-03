'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, SkipForward } from 'lucide-react'

import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

type Mode = 'closed' | 'reschedule' | 'skip'

/**
 * "Reschedule" and "Skip this one" for a single occurrence of a recurring
 * series. Only rendered for occurrences (task.series_id is not null) — a
 * one-off task's due date changes some other way, and skip_occurrence /
 * reschedule_occurrence both reject a one-off task server-side anyway.
 *
 * Styled after duplicate-task-button.tsx's inline-form pattern. Staff/assignee
 * gating happens in the RPCs themselves (set_task_priority's siblings); the
 * button is shown to everyone who can see the task and the server answers
 * with an error for anyone not entitled.
 */
export function OccurrenceActions({
  taskId,
  defaultDueDate,
}: {
  taskId: string
  defaultDueDate: string | null
}) {
  const router = useRouter()
  const [mode, setMode] = React.useState<Mode>('closed')
  const [newDate, setNewDate] = React.useState(defaultDueDate ?? '')
  const [reason, setReason] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function confirmReschedule() {
    if (!newDate) {
      setError('Pick a date')
      return
    }
    setPending(true)
    setError(null)
    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: rpcError } = await supabase.rpc('reschedule_occurrence', {
        p_task_id: taskId,
        p_new_date: newDate,
      })
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      setMode('closed')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  async function confirmSkip() {
    setPending(true)
    setError(null)
    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: rpcError } = await supabase.rpc('skip_occurrence', {
        p_task_id: taskId,
        p_reason: reason || null,
      })
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      setMode('closed')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  if (mode === 'closed') {
    return (
      <>
        <Button variant="secondary" size="sm" onClick={() => setMode('reschedule')}>
          <CalendarClock className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Reschedule
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setMode('skip')}>
          <SkipForward className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Skip this one
        </Button>
      </>
    )
  }

  if (mode === 'reschedule') {
    return (
      <div className="flex w-full flex-col gap-3 rounded-lg border border-[var(--tt-rule)] p-4">
        <p className="text-[13px] text-[var(--tt-ink-2)]">
          Moves just this day. The series and every other occurrence are unaffected.
        </p>
        <label className="flex flex-col gap-1 text-[13px]">
          New date
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="rounded-md border border-[var(--tt-rule)] bg-transparent px-3 py-2 text-[14px]"
          />
        </label>
        {error ? (
          <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button variant="primary" size="sm" disabled={pending} onClick={confirmReschedule}>
            Move it
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => {
              setMode('closed')
              setError(null)
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-[var(--tt-rule)] p-4">
      <p className="text-[13px] text-[var(--tt-ink-2)]">
        Cancels just this day. The series continues normally on its next occurrence.
      </p>
      <label className="flex flex-col gap-1 text-[13px]">
        Reason (optional)
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded-md border border-[var(--tt-rule)] bg-transparent px-3 py-2 text-[14px]"
        />
      </label>
      {error ? (
        <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button variant="danger" size="sm" disabled={pending} onClick={confirmSkip}>
          Skip this one
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => {
            setMode('closed')
            setError(null)
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
