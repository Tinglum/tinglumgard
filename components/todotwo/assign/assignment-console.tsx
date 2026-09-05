'use client'

import * as React from 'react'
import { AlertTriangle, Check, Loader2, Plus, Sparkles, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/todotwo/ui/button'
import { Surface } from '@/components/todotwo/ui/states'
import type { Weekday } from '@/lib/todotwo/domain/assignment'
import {
  EMPTY_PRESETS,
  WEEKDAY_ORDER,
  type PresetState,
} from '@/lib/todotwo/domain/assignment-presets'

export interface ConsolePerson {
  id: string
  name: string
}

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
  /** Split out so the preview can say which rule came from where. */
  presetConstraints: Constraint[]
  aiConstraints: Constraint[]
  /** Facts about the farm — approved time off, stays, skill sign-off. Not
   *  chosen this morning, so they are listed first and cannot be removed. */
  farmConstraints: { constraint: Constraint; source: string; detail: string }[]
  farmWarnings: { message: string }[]
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

function describeConstraint(c: Constraint, names: { personId: string; name: string }[]): string {
  const nameOf = (id: string | null) =>
    id ? names.find((l) => l.personId === id)?.name ?? id : 'everyone'

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
export function AssignmentConsole({
  defaultFrom,
  defaultTo,
  people,
  taskGroups,
}: {
  defaultFrom: string
  defaultTo: string
  people: ConsolePerson[]
  taskGroups: string[]
}) {
  const [text, setText] = React.useState('')
  const [from, setFrom] = React.useState(defaultFrom)
  const [to, setTo] = React.useState(defaultTo)
  const [presets, setPresets] = React.useState<PresetState>(EMPTY_PRESETS)

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
        body: JSON.stringify({ text, from, to, presets }),
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

  const nameOf = (id: string | null) =>
    id ? people.find((p) => p.id === id)?.name ?? id : 'everyone'

  const rosterNames = people.map((p) => ({ personId: p.id, name: p.name }))

  /**
   * The farm's standing arrangement, as one click.
   *
   * These are not clever defaults invented here — they are the rules the
   * owner described, which the free-text parser used to drop on the floor
   * because no constraint could carry them.
   */
  function applyFarmRules() {
    updatePresets({
      pairings: [
        { id: 'farm-goats-rabbits', labels: ['Goats', 'Rabbits'] },
        { id: 'farm-chickens-pigs', labels: ['Chickens + Ducks', 'Pigs'] },
      ],
      separations: [
        { id: 'farm-meals-apart', labelsA: ['Breakfast'], labelsB: ['Dinner'] },
        {
          id: 'farm-animals-not-meals',
          labelsA: ['Goats', 'Rabbits', 'Chickens + Ducks', 'Pigs'],
          labelsB: ['Breakfast', 'Dinner'],
        },
        { id: 'farm-meals-not-kitchen', labelsA: ['Breakfast', 'Dinner'], labelsB: ['Kitchen'] },
      ],
    })
  }

  function updatePresets(next: Partial<PresetState>) {
    setPresets((current) => ({ ...current, ...next }))
    // A ticked box changes what the plan would be, so the plan on screen is no
    // longer the plan that box describes. Better blank than stale.
    setPreview(null)
  }

  const newRowId = () => `row-${Math.random().toString(36).slice(2, 10)}`

  const canAddDayOff = people.length > 0
  const canAddExclusion = people.length > 0 && taskGroups.length > 0

  /**
   * The ticked rules, as removable chips.
   *
   * Shown before a preview runs and alongside the parsed free text afterwards,
   * so it is never ambiguous whether a box and a sentence are both in play —
   * they always are.
   */
  const tickedConstraints: { key: string; label: string; remove: () => void }[] = [
    ...presets.daysOff
      .filter((row) => row.weekdays.length > 0)
      .map((row) => ({
        key: `dayoff-${row.id}`,
        label: `${nameOf(row.personId)} is off ${WEEKDAY_ORDER.filter((d) =>
          row.weekdays.includes(d)
        )
          .map((d) => WEEKDAY_LABEL[d])
          .join(' and ')}`,
        remove: () =>
          updatePresets({ daysOff: presets.daysOff.filter((r) => r.id !== row.id) }),
      })),
    ...presets.taskExclusions
      .filter((row) => row.taskGroupLabel.trim() !== '')
      .map((row) => ({
        key: `exclude-${row.id}`,
        label: `${nameOf(row.personId)} does no ${row.taskGroupLabel}`,
        remove: () =>
          updatePresets({
            taskExclusions: presets.taskExclusions.filter((r) => r.id !== row.id),
          }),
      })),
    ...(presets.pairings ?? []).map((row) => ({
      key: `pair-${row.id}`,
      label: `${row.labels.join(' and ')} — same person`,
      remove: () =>
        updatePresets({ pairings: (presets.pairings ?? []).filter((r) => r.id !== row.id) }),
    })),
    ...(presets.separations ?? []).map((row) => ({
      key: `sep-${row.id}`,
      label: `${row.labelsA.join('/')} and ${row.labelsB.join('/')} — different people`,
      remove: () =>
        updatePresets({
          separations: (presets.separations ?? []).filter((r) => r.id !== row.id),
        }),
    })),
    ...(presets.maxPerDay
      ? [
          {
            key: 'max-per-day',
            label: `${nameOf(presets.maxPerDay.personId)} does no more than ${
              presets.maxPerDay.limit
            } a day`,
            remove: () => updatePresets({ maxPerDay: null }),
          },
        ]
      : []),
  ]

  return (
    <div className="flex flex-col gap-5">
      <Surface className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
            The usual constraints
          </p>
          <p className="text-[13px] text-[var(--tt-ink-2)]">
            Tick what applies. These become rules directly, with no reading of your text needed.
            Anything unusual still goes in the box below, and the two are used together.
          </p>
        </div>

        <p className="rounded-md bg-[var(--tt-surface-2)] p-3 text-[13px] text-[var(--tt-ink-2)]">
          <span className="font-medium text-[var(--tt-ink)]">Spread evenly &mdash; always on.</span>{' '}
          Work goes to whoever is carrying the least, so there is nothing to switch on here.
          Everything below narrows that down.
        </p>

        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-[var(--tt-ink)]">Who pairs with what</p>
          <p className="text-[12px] text-[var(--tt-ink-3)]">
            One person takes the whole round, morning and evening. Names match loosely, so
            &ldquo;Goats&rdquo; covers both its morning and evening routines.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyFarmRules()}
              className="rounded-md border border-[var(--tt-rule-strong)] px-3 py-1.5 text-[13px] hover:border-[var(--tt-accent)]"
            >
              Use the farm&rsquo;s usual rules
            </button>
            {(presets.pairings ?? []).length > 0 || (presets.separations ?? []).length > 0 ? (
              <button
                type="button"
                onClick={() => updatePresets({ pairings: [], separations: [] })}
                className="rounded-md px-3 py-1.5 text-[13px] text-[var(--tt-ink-3)] underline-offset-4 hover:underline"
              >
                Clear them
              </button>
            ) : null}
          </div>

          <p className="text-[12px] text-[var(--tt-ink-3)]">
            That is: goats with rabbits, chickens and ducks with pigs, morning and evening the
            same person; breakfast and dinner different people; whoever does an animal round
            does neither meal; whoever cooks does not do the kitchen.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-[var(--tt-ink)]">Days off</p>
          {presets.daysOff.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--tt-rule)] p-2"
            >
              <select
                aria-label="Person who is off"
                value={row.personId}
                onChange={(e) =>
                  updatePresets({
                    daysOff: presets.daysOff.map((r) =>
                      r.id === row.id ? { ...r, personId: e.target.value } : r
                    ),
                  })
                }
                className="min-h-[36px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[13px] text-[var(--tt-ink)]"
              >
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              <span className="text-[13px] text-[var(--tt-ink-3)]">is off</span>
              <div className="flex flex-wrap gap-1">
                {WEEKDAY_ORDER.map((day) => {
                  const on = row.weekdays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={on}
                      aria-label={WEEKDAY_LABEL[day]}
                      onClick={() =>
                        updatePresets({
                          daysOff: presets.daysOff.map((r) =>
                            r.id === row.id
                              ? {
                                  ...r,
                                  weekdays: on
                                    ? r.weekdays.filter((d) => d !== day)
                                    : [...r.weekdays, day],
                                }
                              : r
                          ),
                        })
                      }
                      className={cn(
                        'min-h-[32px] min-w-[36px] rounded-md border px-1.5 text-[12px]',
                        on
                          ? 'border-[var(--tt-accent)] bg-[var(--tt-accent-soft)] text-[var(--tt-ink)]'
                          : 'border-[var(--tt-rule-strong)] text-[var(--tt-ink-3)]'
                      )}
                    >
                      {WEEKDAY_LABEL[day].slice(0, 3)}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                aria-label="Remove this days-off rule"
                onClick={() =>
                  updatePresets({ daysOff: presets.daysOff.filter((r) => r.id !== row.id) })
                }
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-[var(--tt-ink-3)] hover:bg-[var(--tt-surface-2)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
          <Button
            size="sm"
            variant="secondary"
            className="self-start"
            disabled={!canAddDayOff}
            onClick={() =>
              updatePresets({
                daysOff: [
                  ...presets.daysOff,
                  { id: newRowId(), personId: people[0].id, weekdays: [] as Weekday[] },
                ],
              })
            }
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Someone is off on certain days
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--tt-rule)] pt-4">
          <p className="text-[13px] font-medium text-[var(--tt-ink)]">Work someone never does</p>
          {presets.taskExclusions.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--tt-rule)] p-2"
            >
              <select
                aria-label="Person who does not do this work"
                value={row.personId}
                onChange={(e) =>
                  updatePresets({
                    taskExclusions: presets.taskExclusions.map((r) =>
                      r.id === row.id ? { ...r, personId: e.target.value } : r
                    ),
                  })
                }
                className="min-h-[36px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[13px] text-[var(--tt-ink)]"
              >
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              <span className="text-[13px] text-[var(--tt-ink-3)]">does no</span>
              <select
                aria-label="Kind of work"
                value={row.taskGroupLabel}
                onChange={(e) =>
                  updatePresets({
                    taskExclusions: presets.taskExclusions.map((r) =>
                      r.id === row.id ? { ...r, taskGroupLabel: e.target.value } : r
                    ),
                  })
                }
                className="min-h-[36px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[13px] text-[var(--tt-ink)]"
              >
                {taskGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Remove this exclusion"
                onClick={() =>
                  updatePresets({
                    taskExclusions: presets.taskExclusions.filter((r) => r.id !== row.id),
                  })
                }
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-[var(--tt-ink-3)] hover:bg-[var(--tt-surface-2)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
          <Button
            size="sm"
            variant="secondary"
            className="self-start"
            disabled={!canAddExclusion}
            onClick={() =>
              updatePresets({
                taskExclusions: [
                  ...presets.taskExclusions,
                  { id: newRowId(), personId: people[0].id, taskGroupLabel: taskGroups[0] },
                ],
              })
            }
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Someone does not do a kind of work
          </Button>
          {!canAddExclusion ? (
            <p className="text-[12px] text-[var(--tt-ink-3)]">
              No named routines or projects to pick from yet.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--tt-rule)] pt-4">
          <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--tt-ink)]">
            <input
              type="checkbox"
              checked={presets.maxPerDay !== null}
              onChange={(e) =>
                updatePresets({ maxPerDay: e.target.checked ? { personId: null, limit: 3 } : null })
              }
              className="h-4 w-4 accent-[var(--tt-accent)]"
            />
            Cap how much anyone gets in a day
          </label>
          {presets.maxPerDay ? (
            <div className="flex flex-wrap items-center gap-2 pl-6">
              <select
                aria-label="Who the cap applies to"
                value={presets.maxPerDay.personId ?? ''}
                onChange={(e) =>
                  updatePresets({
                    maxPerDay: {
                      personId: e.target.value === '' ? null : e.target.value,
                      limit: presets.maxPerDay?.limit ?? 3,
                    },
                  })
                }
                className="min-h-[36px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[13px] text-[var(--tt-ink)]"
              >
                <option value="">Everyone</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              <span className="text-[13px] text-[var(--tt-ink-3)]">no more than</span>
              <input
                type="number"
                min={1}
                max={100}
                aria-label="Maximum tasks per person per day"
                value={presets.maxPerDay.limit}
                onChange={(e) =>
                  updatePresets({
                    maxPerDay: {
                      personId: presets.maxPerDay?.personId ?? null,
                      limit: Math.max(1, Math.min(100, Number(e.target.value) || 1)),
                    },
                  })
                }
                className="min-h-[36px] w-16 rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[13px] text-[var(--tt-ink)]"
              />
              <span className="text-[13px] text-[var(--tt-ink-3)]">tasks a day</span>
            </div>
          ) : null}
        </div>

        {tickedConstraints.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-[var(--tt-rule)] pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
              Active rules from the boxes above
            </p>
            <ul className="flex flex-wrap gap-2">
              {tickedConstraints.map((chip) => (
                <li
                  key={chip.key}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--tt-accent-soft)] py-1 pl-2.5 pr-1.5 text-[13px]"
                >
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.remove}
                    aria-label={`Remove: ${chip.label}`}
                    className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-[var(--tt-surface-2)]"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-[var(--tt-rule)] pt-4">
          <label htmlFor="assign-text" className="text-[13px] font-medium text-[var(--tt-ink)]">
            Anything else, in your own words
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
              {(preview.farmConstraints ?? []).map((entry, i) => (
                <li key={`farm-${i}`} className="text-[13px] text-[var(--tt-ink-2)]">
                  • {entry.detail}{' '}
                  <span className="text-[var(--tt-ink-3)]">(from the calendar)</span>
                </li>
              ))}
              {preview.presetConstraints.map((c, i) => (
                <li key={`preset-${i}`} className="text-[13px] text-[var(--tt-ink-2)]">
                  • {describeConstraint(c, preview.plan.load)}{' '}
                  <span className="text-[var(--tt-ink-3)]">(ticked)</span>
                </li>
              ))}
              {preview.aiConstraints.map((c, i) => (
                <li key={`ai-${i}`} className="text-[13px] text-[var(--tt-ink-2)]">
                  • {describeConstraint(c, preview.plan.load)}{' '}
                  <span className="text-[var(--tt-ink-3)]">(from your text)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--tt-ink-3)]">No restrictions — an even split across everyone.</p>
          )}

          {(preview.farmWarnings ?? []).length > 0 ? (
            <div className="flex flex-col gap-1 rounded-md bg-[var(--tt-warn-soft)] p-3">
              <p className="text-[12px] font-semibold text-[var(--tt-ink)]">Worth knowing</p>
              {preview.farmWarnings.map((w, i) => (
                <p key={`fw-${i}`} className="text-[13px] text-[var(--tt-ink-2)]">
                  {w.message}
                </p>
              ))}
            </div>
          ) : null}

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
