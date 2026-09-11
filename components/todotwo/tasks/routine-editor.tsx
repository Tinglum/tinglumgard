'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import {
  FIELD_CLASS,
  StepsFields,
  type DraftStep,
} from '@/components/todotwo/tasks/steps-fields'
import { parseRrule } from '@/lib/todotwo/domain/recurrence'
import type { RoutineStep } from '@/lib/todotwo/queries'

/**
 * Editing a routine in place.
 *
 * The Routines page has always claimed the instructions live here and that
 * changing them changes every future day. That was true of the data and false
 * of the software — there was no way to change anything, and rewording a
 * routine meant a hand-written UPDATE against production. This is the missing
 * half.
 *
 * The schedule is offered as days of the week rather than as an RRULE string,
 * because nobody should have to type FREQ=WEEKLY;BYDAY=WE to say "Wednesdays".
 * The subset here — daily, or particular weekdays — is exactly what
 * lib/todotwo/domain/recurrence supports, so there is no rule the picker can
 * produce that the generator would later choke on, and none it can silently
 * fail to represent.
 */

const WEEKDAYS: { code: string; label: string }[] = [
  { code: 'MO', label: 'Mon' },
  { code: 'TU', label: 'Tue' },
  { code: 'WE', label: 'Wed' },
  { code: 'TH', label: 'Thu' },
  { code: 'FR', label: 'Fri' },
  { code: 'SA', label: 'Sat' },
  { code: 'SU', label: 'Sun' },
]

export interface EditableRoutine {
  id: string
  title: string
  description: string | null
  rrule: string
  steps: RoutineStep[]
}

/** Time of day is preserved across an edit: the picker only sets the days. */
function readRule(rrule: string): { daily: boolean; days: string[]; suffix: string } {
  try {
    const parsed = parseRrule(rrule)
    const suffix =
      parsed.hour !== null
        ? `;BYHOUR=${parsed.hour};BYMINUTE=${parsed.minute ?? 0}`
        : ''
    return { daily: parsed.freq === 'DAILY', days: parsed.byDay, suffix }
  } catch {
    return { daily: false, days: ['MO'], suffix: '' }
  }
}

export function RoutineEditor({ routine }: { routine: EditableRoutine }) {
  const router = useRouter()
  const initial = React.useMemo(() => readRule(routine.rrule), [routine.rrule])

  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState(routine.title)
  const [description, setDescription] = React.useState(routine.description ?? '')
  const [daily, setDaily] = React.useState(initial.daily)
  const [days, setDays] = React.useState<string[]>(initial.days)
  const [steps, setSteps] = React.useState<DraftStep[]>(() =>
    routine.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description ?? '',
      key: step.id,
    }))
  )
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function reset() {
    setTitle(routine.title)
    setDescription(routine.description ?? '')
    setDaily(initial.daily)
    setDays(initial.days)
    setSteps(
      routine.steps.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description ?? '',
        key: step.id,
      }))
    )
    setError(null)
    setOpen(false)
  }

  function toggleDay(code: string) {
    setDays((current) =>
      current.includes(code) ? current.filter((d) => d !== code) : [...current, code]
    )
  }

  async function save() {
    if (!title.trim()) {
      setError('A routine needs a name.')
      return
    }
    if (!daily && days.length === 0) {
      setError('Pick at least one day, or choose every day.')
      return
    }

    setSaving(true)
    setError(null)

    const ordered = WEEKDAYS.filter((d) => days.includes(d.code)).map((d) => d.code)
    const rrule = daily
      ? `RRULE:FREQ=DAILY${initial.suffix}`
      : `RRULE:FREQ=WEEKLY;BYDAY=${ordered.join(',')}${initial.suffix}`

    const response = await fetch(`/api/todotwo/routines/${routine.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        rrule,
        steps: steps.map((step) => ({
          id: step.id,
          title: step.title,
          description: step.description,
        })),
      }),
    })

    const result = (await response.json().catch(() => ({}))) as { error?: string }
    setSaving(false)

    if (!response.ok) {
      setError(result.error ?? 'Could not save that.')
      return
    }

    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <Button size="sm" variant="ghost" className="self-start" onClick={() => setOpen(true)}>
        Edit routine
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-[13px]">
        Name
        <input className={FIELD_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1 text-[13px]">
        Instructions
        <textarea
          className={`${FIELD_CLASS} min-h-[72px]`}
          value={description}
          placeholder="What the person needs to know before they start."
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div className="flex flex-col gap-2 text-[13px]">
        Schedule
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={daily} onChange={() => setDaily(true)} />
            Every day
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={!daily} onChange={() => setDaily(false)} />
            Certain days
          </label>
        </div>

        {!daily ? (
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => {
              const on = days.includes(day.code)
              return (
                <button
                  key={day.code}
                  type="button"
                  onClick={() => toggleDay(day.code)}
                  aria-pressed={on}
                  className={`min-h-9 rounded-md border px-3 text-[13px] ${
                    on
                      ? 'border-[var(--tt-accent)] bg-[var(--tt-accent)] text-white'
                      : 'border-[var(--tt-rule-strong)]'
                  }`}
                >
                  {day.label}
                </button>
              )
            })}
          </div>
        ) : null}

        <p className="text-[12px] text-[var(--tt-ink-3)]">
          Changing this rebuilds the days ahead: ones the new schedule does not want are taken off
          the calendar, and the ones it does want are added. Days already done are left alone.
        </p>
      </div>

      <StepsFields
        steps={steps}
        onChange={setSteps}
        note="Removing a step keeps the record of anyone who already ticked it off; it just stops appearing on future days."
      />

      {error ? <p className="text-[13px] text-[var(--tt-danger)]">{error}</p> : null}

      <div className="flex gap-2">
        <Button size="sm" disabled={saving} onClick={save}>
          {saving ? 'Saving …' : 'Save routine'}
        </Button>
        <Button size="sm" variant="ghost" disabled={saving} onClick={reset}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
