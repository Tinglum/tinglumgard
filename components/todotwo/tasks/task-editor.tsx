'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import {
  FIELD_CLASS,
  StepsFields,
  type DraftStep,
} from '@/components/todotwo/tasks/steps-fields'

/**
 * Editing a one-off task: its wording and its steps.
 *
 * Only for tasks that stand on their own. A day of a recurring routine is
 * edited through the routine, so that one change carries to every future day
 * rather than to the single Wednesday somebody happened to open — the task
 * page links there instead of offering this.
 */

export interface EditableTaskStep {
  id: string
  title: string
  description: string | null
}

export function TaskEditor({
  taskId,
  title: initialTitle,
  description: initialDescription,
  steps: initialSteps,
}: {
  taskId: string
  title: string
  description: string | null
  steps: EditableTaskStep[]
}) {
  const router = useRouter()

  const asDrafts = React.useCallback(
    (): DraftStep[] =>
      initialSteps.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description ?? '',
        key: step.id,
      })),
    [initialSteps]
  )

  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState(initialTitle)
  const [description, setDescription] = React.useState(initialDescription ?? '')
  const [steps, setSteps] = React.useState<DraftStep[]>(asDrafts)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function reset() {
    setTitle(initialTitle)
    setDescription(initialDescription ?? '')
    setSteps(asDrafts())
    setError(null)
    setOpen(false)
  }

  async function save() {
    if (!title.trim()) {
      setError('A task needs a name.')
      return
    }

    setSaving(true)
    setError(null)

    const response = await fetch(`/api/todotwo/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
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
        Edit task
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-[var(--tt-rule)] p-4">
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

      <StepsFields
        steps={steps}
        onChange={setSteps}
        note="Removing a step keeps the record of it having been done; it just stops showing here."
      />

      {error ? <p className="text-[13px] text-[var(--tt-danger)]">{error}</p> : null}

      <div className="flex gap-2">
        <Button size="sm" disabled={saving} onClick={save}>
          {saving ? 'Saving …' : 'Save task'}
        </Button>
        <Button size="sm" variant="ghost" disabled={saving} onClick={reset}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
