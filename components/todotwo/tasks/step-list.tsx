'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

export interface Step {
  id: string
  title: string
  description: string | null
  done: boolean
  kind: 'series-step' | 'subtask'
}

/**
 * The checklist for one task.
 *
 * Ticking a step of a recurring routine records progress against *this*
 * occurrence, never against the shared template — Tuesday's "Wipe counters"
 * being done says nothing about Wednesday's. A subtask of a one-off is a task
 * in its own right and simply completes itself.
 */
export function StepList({
  taskId,
  steps: initial,
  taskDone,
}: {
  taskId: string
  steps: Step[]
  taskDone: boolean
}) {
  const router = useRouter()
  const [steps, setSteps] = React.useState(initial)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)

  React.useEffect(() => setSteps(initial), [initial])

  const doneCount = steps.filter((s) => s.done).length

  async function toggle(step: Step) {
    if (busy) return
    setBusy(step.id)
    setError(null)

    const next = !step.done
    setSteps((current) =>
      current.map((s) => (s.id === step.id ? { ...s, done: next } : s))
    )

    try {
      const supabase = getTodoTwoBrowserClient()

      const { error: rpcError } =
        step.kind === 'series-step'
          ? await supabase.rpc('toggle_step', { p_task_id: taskId, p_step_id: step.id })
          : await supabase.rpc(next ? 'complete_task' : 'uncomplete_task', {
              p_task_id: step.id,
            })

      if (rpcError) {
        setSteps((current) =>
          current.map((s) => (s.id === step.id ? { ...s, done: !next } : s))
        )
        setError(rpcError.message)
        return
      }

      router.refresh()
    } catch (caught) {
      setSteps((current) => current.map((s) => (s.id === step.id ? { ...s, done: !next } : s)))
      setError(caught instanceof Error ? caught.message : 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  async function markAll() {
    for (const step of steps.filter((s) => !s.done)) {
      // Sequential on purpose: the RPC toggles, so parallel calls on the same
      // task can race each other into the wrong state.
      // eslint-disable-next-line no-await-in-loop
      await toggle(step)
    }
  }

  if (steps.length === 0) {
    return (
      <p className="text-sm text-[var(--tt-ink-3)]">
        No steps. Complete the task when it is done.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          Steps · {doneCount} of {steps.length}
        </p>
        {doneCount < steps.length && !taskDone ? (
          <Button variant="ghost" size="sm" onClick={markAll} disabled={busy !== null}>
            Tick all
          </Button>
        ) : null}
      </div>

      <div
        className="h-1 w-full overflow-hidden rounded-full bg-[var(--tt-surface-2)]"
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-label="Steps completed"
      >
        <div
          className="h-full rounded-full bg-[var(--tt-accent)] transition-[width]"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <ul className="list-none">
        {steps.map((step) => (
          <li
            key={step.id}
            className="flex items-start gap-3 border-b border-[var(--tt-rule)] py-3 last:border-b-0"
          >
            <button
              type="button"
              onClick={() => toggle(step)}
              disabled={busy === step.id}
              aria-pressed={step.done}
              aria-label={step.done ? `Undo "${step.title}"` : `Tick "${step.title}"`}
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors',
                step.done
                  ? 'border-[var(--tt-accent)] bg-[var(--tt-accent)] text-[var(--tt-on-accent)]'
                  : 'border-[var(--tt-rule-strong)] hover:border-[var(--tt-accent)]'
              )}
            >
              {step.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            </button>

            <div className="min-w-0 flex-1">
              <p className={cn('text-[15px] leading-snug', step.done && 'line-through opacity-60')}>
                {step.title}
              </p>
              {step.description ? (
                <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-[var(--tt-ink-2)]">
                  {step.description}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
