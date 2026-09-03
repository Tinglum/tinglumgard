'use client'

import * as React from 'react'
import { AlertTriangle, Check, Loader2, Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/todotwo/ui/button'
import { Surface } from '@/components/todotwo/ui/states'

interface Constraint {
  kind: 'unavailable_weekday' | 'unavailable_dates' | 'exclude_tasks' | 'only_people' | 'max_per_day'
  [key: string]: unknown
}

interface UnresolvedReference {
  text: string
  kind: 'person' | 'task_group'
  suggestion: string | null
}

interface Assignment {
  taskId: string
  personId: string
  reason: string
}

interface Unassignable {
  taskId: string
  title: string
  date: string
  reason: string
}

interface LoadEntry {
  personId: string
  name: string
  count: number
}

interface PreviewResponse {
  ok: true
  summary: string
  constraints: Constraint[]
  unresolved: UnresolvedReference[]
  plan: {
    assignments: Assignment[]
    unassignable: Unassignable[]
    load: LoadEntry[]
    inertConstraints: Constraint[]
    fairnessSpread: number
  }
  taskCount: number
}

interface ApiError {
  error: string
  message: string
}

const WEEKDAY_LABEL: Record<string, string> = {
  MO: 'Monday',
  TU: 'Tuesday',
  WE: 'Wednesday',
  TH: 'Thursday',
  FR: 'Friday',
  SA: 'Saturday',
  SU: 'Sunday',
}

function describeConstraint(c: Constraint, load: LoadEntry[]): string {
  const nameOf = (id: string | null) => (id ? load.find((l) => l.personId === id)?.name ?? id : 'everyone')

  switch (c.kind) {
    case 'unavailable_weekday':
      return `${nameOf(c.personId as string)} is off ${(c.weekdays as string[])
        .map((w) => WEEKDAY_LABEL[w] ?? w)
        .join(' and ')}.`
    case 'unavailable_dates':
      return `${nameOf(c.personId as string)} is away on ${(c.dates as string[]).join(', ')}.`
    case 'exclude_tasks':
      return `${nameOf(c.personId as string)} does not do that kind of task.`
    case 'only_people':
      return `Only ${(c.personIds as string[]).map((id) => nameOf(id)).join(' and ')} can do that kind of task.`
    case 'max_per_day':
      return `${nameOf(c.personId as string | null)} does no more than ${c.limit} task${
        c.limit === 1 ? '' : 's'
      } a day.`
    default:
      return 'Understood, but nothing to describe.'
  }
}

/**
 * Free text in, a reviewable plan out, nothing written until Apply.
 *
 * Preview asks Claude to translate the text into constraints, then runs the
 * same deterministic solver the routines page uses to build the rota — the
 * model never decides who does what. Apply is disabled until a preview has
 * succeeded with no unresolved names, so a coordinator cannot accidentally
 * commit a plan built from a misunderstood instruction.
 */
export function AssignmentConsole({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [text, setText] = React.useState('')
  const [from, setFrom] = React.useState(defaultFrom)
  const [to, setTo] = React.useState(defaultTo)

  const [previewing, setPreviewing] = React.useState(false)
  const [applying, setApplying] = React.useState(false)
  const [preview, setPreview] = React.useState<PreviewResponse | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [appliedCount, setAppliedCount] = React.useState<number | null>(null)
  const [applyFailures, setApplyFailures] = React.useState<{ taskId: string; message: string }[]>([])

  async function runPreview() {
    setPreviewing(true)
    setError(null)
    setPreview(null)
    setAppliedCount(null)
    setApplyFailures([])

    try {
      const res = await fetch('/api/todotwo/assign/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, from, to }),
      })

      const data = (await res.json()) as PreviewResponse | ApiError

      if (!res.ok || !('ok' in data)) {
        setError((data as ApiError).message ?? 'Could not build a preview.')
        return
      }

      setPreview(data)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setPreviewing(false)
    }
  }

  async function apply() {
    if (!preview) return
    setApplying(true)
    setError(null)

    try {
      const res = await fetch('/api/todotwo/assign/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: preview.plan.assignments.map(({ taskId, personId }) => ({ taskId, personId })) }),
      })

      const data = (await res.json()) as {
        ok: boolean
        appliedCount: number
        failed: { taskId: string; message: string }[]
      } & Partial<ApiError>

      if (!res.ok) {
        setError(data.message ?? 'Could not apply the plan.')
        return
      }

      setAppliedCount(data.appliedCount)
      setApplyFailures(data.failed ?? [])
      if (data.ok) setPreview(null)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setApplying(false)
    }
  }

  const canApply = preview !== null && preview.unresolved.length === 0 && preview.plan.assignments.length > 0

  return (
    <div className="flex flex-col gap-5">
      <Surface className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="assign-text" className="text-[13px] font-medium text-[var(--tt-ink)]">
            Instructions
          </label>
          <textarea
            id="assign-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder='e.g. "Divide all tasks evenly, but Robert does no housekeeping tasks. Amber is off Thursday and Friday."'
            className={cn(
              'w-full rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] p-3 text-[15px]',
              'text-[var(--tt-ink)] placeholder:text-[var(--tt-ink-3)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--tt-accent)]'
            )}
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="assign-from" className="text-[12px] text-[var(--tt-ink-3)]">
              From
            </label>
            <input
              id="assign-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="min-h-[40px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[14px] text-[var(--tt-ink)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="assign-to" className="text-[12px] text-[var(--tt-ink-3)]">
              To
            </label>
            <input
              id="assign-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="min-h-[40px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[14px] text-[var(--tt-ink)]"
            />
          </div>
        </div>

        <Button onClick={runPreview} disabled={previewing || from > to} className="self-start">
          {previewing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Reading …
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Preview
            </>
          )}
        </Button>

        {error ? (
          <p role="alert" className="flex items-start gap-2 text-[13px] text-[var(--tt-danger)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </Surface>

      {preview ? (
        <Surface className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
              What was understood
            </p>
            <p className="text-[14px] text-[var(--tt-ink)]">{preview.summary}</p>
          </div>

          {preview.constraints.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {preview.constraints.map((c, i) => (
                <li key={i} className="text-[13px] text-[var(--tt-ink-2)]">
                  • {describeConstraint(c, preview.plan.load)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--tt-ink-3)]">No restrictions — an even split across everyone.</p>
          )}

          {preview.unresolved.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-md bg-[var(--tt-warn-soft)] p-3">
              <p className="flex items-center gap-2 text-[13px] font-medium text-[var(--tt-warn)]">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Could not match {preview.unresolved.length === 1 ? 'this' : 'these'} — Apply is disabled until
                it's fixed
              </p>
              <ul className="flex flex-col gap-1">
                {preview.unresolved.map((u, i) => (
                  <li key={i} className="text-[13px] text-[var(--tt-warn)]">
                    "{u.text}" — no {u.kind === 'person' ? 'person' : 'task group'} found
                    {u.suggestion ? ` — did you mean "${u.suggestion}"?` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="border-t border-[var(--tt-rule)] pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
              Resulting rota — {preview.plan.assignments.length} of {preview.taskCount} tasks
            </p>
            <ul className="flex flex-col gap-2">
              {preview.plan.load.map((l) => (
                <li key={l.personId} className="flex items-center justify-between text-[14px]">
                  <span>{l.name}</span>
                  <span className="tabular-nums text-[var(--tt-ink-2)]">{l.count}</span>
                </li>
              ))}
            </ul>
          </div>

          {preview.plan.unassignable.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-md bg-[var(--tt-danger-soft)] p-3">
              <p className="text-[13px] font-medium text-[var(--tt-danger)]">
                {preview.plan.unassignable.length} task{preview.plan.unassignable.length === 1 ? '' : 's'} could
                not be assigned to anyone
              </p>
              <ul className="flex flex-col gap-1">
                {preview.plan.unassignable.map((u) => (
                  <li key={u.taskId} className="text-[13px] text-[var(--tt-danger)]">
                    {u.title} ({u.date}) — {u.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.plan.inertConstraints.length > 0 ? (
            <p className="text-[12px] text-[var(--tt-ink-3)]">
              {preview.plan.inertConstraints.length} instruction
              {preview.plan.inertConstraints.length === 1 ? '' : 's'} did not affect anything in this window —
              worth a second look.
            </p>
          ) : null}

          <Button onClick={apply} disabled={!canApply || applying} className="self-start">
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Applying …
              </>
            ) : (
              `Apply — assign ${preview.plan.assignments.length} task${preview.plan.assignments.length === 1 ? '' : 's'}`
            )}
          </Button>
        </Surface>
      ) : null}

      {appliedCount !== null ? (
        <Surface className="flex flex-col gap-2 p-4">
          <p className="flex items-center gap-2 text-[14px] text-[var(--tt-accent)]">
            <Check className="h-4 w-4" aria-hidden="true" />
            {appliedCount} assignment{appliedCount === 1 ? '' : 's'} applied.
          </p>
          {applyFailures.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {applyFailures.map((f) => (
                <li key={f.taskId} className="text-[13px] text-[var(--tt-danger)]">
                  Task {f.taskId}: {f.message}
                </li>
              ))}
            </ul>
          ) : null}
        </Surface>
      ) : null}
    </div>
  )
}
