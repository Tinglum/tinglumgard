'use client'

import { useState, useId } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X } from 'lucide-react'
import { Button } from '@/components/todotwo/ui/button'
import { FIELD_CLASS } from './steps-fields'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import type { TaskRow } from '@/lib/todotwo/queries'
import { farmWeek } from '@/lib/todotwo/domain/weekly-projects'

export function ProjectForm({ task }: { task?: TaskRow }) {
  const id = useId()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduled, setScheduled] = useState(Boolean(task?.planned_week))
  const [hasDue, setHasDue] = useState(Boolean(task?.due_date))

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] font-medium text-[var(--tt-accent)] transition-colors hover:bg-[var(--tt-accent-soft)]"
      >
        {task ? (
          <>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit dates
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add farm project
          </>
        )}
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-2xl border border-[var(--tt-rule-strong)] bg-[var(--tt-ground)]/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13.5px] font-semibold text-[var(--tt-ink)]">
          {task ? 'Edit project' : 'New farm project'}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close form"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--tt-ink-3)] hover:bg-[var(--tt-surface-2)] hover:text-[var(--tt-ink)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form
        className="flex flex-col gap-3 text-sm"
        onSubmit={async (event) => {
          event.preventDefault()
          const form = event.currentTarget
          const fields = new FormData(form)
          setPending(true)
          setError(null)
          try {
            const { error: rpcError } = await getTodoTwoBrowserClient().rpc('save_farm_project', {
              p_task_id: task?.id ?? null,
              p_title: fields.get('title'),
              p_description: fields.get('description') || null,
              p_planned_week: scheduled ? farmWeek(String(fields.get('week'))).start : null,
              p_due_date: hasDue ? fields.get('due') : null,
              p_due_date_certainty: hasDue ? fields.get('certainty') : 'definite',
            })
            if (rpcError) throw rpcError
            if (!task) {
              form.reset()
              setScheduled(false)
              setHasDue(false)
            }
            setOpen(false)
            router.refresh()
          } catch (err) {
            setError(
              err instanceof Error || (err && typeof err === 'object' && 'message' in err)
                ? String((err as { message: unknown }).message)
                : 'Could not save the project. Try again.'
            )
          } finally {
            setPending(false)
          }
        }}
      >
        <label htmlFor={`${id}-title`} className="flex flex-col gap-1 text-[13px] font-medium">
          Project name
          <input
            id={`${id}-title`}
            name="title"
            className={FIELD_CLASS}
            defaultValue={task?.title}
            placeholder="e.g., Repair north pasture gate"
            required
            maxLength={500}
          />
        </label>

        <label htmlFor={`${id}-description`} className="flex flex-col gap-1 text-[13px] font-medium">
          Details (optional)
          <textarea
            id={`${id}-description`}
            name="description"
            className={FIELD_CLASS}
            defaultValue={task?.description ?? ''}
            placeholder="Tools needed, materials, or notes..."
            maxLength={10000}
            rows={2}
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label htmlFor={`${id}-plan`} className="flex flex-col gap-1 text-[13px] font-medium">
            Schedule
            <select
              id={`${id}-plan`}
              className={FIELD_CLASS}
              value={scheduled ? 'week' : 'later'}
              onChange={(e) => setScheduled(e.target.value === 'week')}
            >
              <option value="later">Backlog · no planned week</option>
              <option value="week">Plan for a specific week</option>
            </select>
          </label>

          {scheduled ? (
            <label htmlFor={`${id}-week`} className="flex flex-col gap-1 text-[13px] font-medium">
              Any day in that week
              <input
                id={`${id}-week`}
                className={FIELD_CLASS}
                type="date"
                name="week"
                defaultValue={task?.planned_week ?? ''}
                required
              />
            </label>
          ) : null}
        </div>

        <label className="flex items-center gap-2 py-1 text-[13px] font-medium">
          <input
            type="checkbox"
            checked={hasDue}
            onChange={(e) => setHasDue(e.target.checked)}
            className="h-4 w-4 rounded accent-[var(--tt-accent)]"
          />
          Set a target or deadline date
        </label>

        {hasDue ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label htmlFor={`${id}-due`} className="flex flex-col gap-1 text-[13px] font-medium">
              Due date
              <input
                id={`${id}-due`}
                type="date"
                name="due"
                className={FIELD_CLASS}
                defaultValue={task?.due_date ?? ''}
                required
              />
            </label>
            <label
              htmlFor={`${id}-certainty`}
              className="flex flex-col gap-1 text-[13px] font-medium"
            >
              Date firmness
              <select
                id={`${id}-certainty`}
                name="certainty"
                className={FIELD_CLASS}
                defaultValue={task?.due_date_certainty ?? 'definite'}
              >
                <option value="definite">Firm deadline</option>
                <option value="approximate">Flexible target</option>
              </select>
            </label>
          </div>
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Saving…' : task ? 'Save changes' : 'Add project'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>

        {error ? (
          <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  )
}
