'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { Surface } from '@/components/todotwo/ui/states'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import type { TaskTemplateRow } from '@/lib/todotwo/queries'

const field =
  'min-h-[44px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[16px] text-[var(--tt-ink)]'

interface DraftStep {
  key: string
  title: string
}

function emptyStep(): DraftStep {
  return { key: crypto.randomUUID(), title: '' }
}

/**
 * Create/edit/delete for the farm-wide template library. Staff-only per RLS
 * (todotwo.task_templates / task_template_steps) — a non-staff person can
 * read this list but the insert/update/delete calls below will be rejected
 * by the database if they somehow reach this page.
 */
export function TemplateManager({ templates }: { templates: TaskTemplateRow[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = React.useState<string | 'new' | null>(null)
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [steps, setSteps] = React.useState<DraftStep[]>([emptyStep()])
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function startCreate() {
    setEditingId('new')
    setName('')
    setDescription('')
    setSteps([emptyStep()])
    setError(null)
  }

  function startEdit(template: TaskTemplateRow) {
    setEditingId(template.id)
    setName(template.name)
    setDescription(template.description ?? '')
    setSteps(
      template.steps.length > 0
        ? template.steps.map((s) => ({ key: s.id, title: s.title }))
        : [emptyStep()]
    )
    setError(null)
  }

  function cancel() {
    setEditingId(null)
    setError(null)
  }

  function updateStep(key: string, title: string) {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, title } : s)))
  }

  function removeStep(key: string) {
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev))
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep()])
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Give the template a name.')
      return
    }

    const cleanSteps = steps.map((s) => s.title.trim()).filter(Boolean)

    setPending(true)
    try {
      const supabase = getTodoTwoBrowserClient()

      if (editingId === 'new') {
        const { data: inserted, error: insertError } = await supabase
          .from('task_templates')
          .insert({ name: name.trim(), description: description.trim() || null })
          .select('id')
          .single()

        if (insertError) {
          setError(insertError.message)
          return
        }

        if (cleanSteps.length > 0) {
          const { error: stepsError } = await supabase.from('task_template_steps').insert(
            cleanSteps.map((title, index) => ({
              template_id: inserted.id,
              title,
              sort_order: index,
            }))
          )
          if (stepsError) {
            setError(stepsError.message)
            return
          }
        }
      } else if (editingId) {
        const { error: updateError } = await supabase
          .from('task_templates')
          .update({ name: name.trim(), description: description.trim() || null })
          .eq('id', editingId)

        if (updateError) {
          setError(updateError.message)
          return
        }

        // Replace steps wholesale — simplest correct approach for a short list.
        const { error: deleteError } = await supabase
          .from('task_template_steps')
          .delete()
          .eq('template_id', editingId)

        if (deleteError) {
          setError(deleteError.message)
          return
        }

        if (cleanSteps.length > 0) {
          const { error: stepsError } = await supabase.from('task_template_steps').insert(
            cleanSteps.map((title, index) => ({
              template_id: editingId,
              title,
              sort_order: index,
            }))
          )
          if (stepsError) {
            setError(stepsError.message)
            return
          }
        }
      }

      setEditingId(null)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  async function remove(template: TaskTemplateRow) {
    if (!window.confirm(`Delete "${template.name}"? This cannot be undone.`)) return

    setPending(true)
    setError(null)
    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: deleteError } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', template.id)

      if (deleteError) {
        setError(deleteError.message)
        return
      }

      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {templates.length === 0 && editingId === null ? (
        <p className="text-sm text-[var(--tt-ink-2)]">No templates yet.</p>
      ) : null}

      {templates.map((template) => (
        <Surface key={template.id} className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">{template.name}</h2>
              {template.description ? (
                <p className="text-[13px] text-[var(--tt-ink-2)]">{template.description}</p>
              ) : null}
              <p className="text-[12px] text-[var(--tt-ink-3)]">
                {template.steps.length} step{template.steps.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" size="sm" onClick={() => startEdit(template)}>
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={pending}
                onClick={() => remove(template)}
              >
                Delete
              </Button>
            </div>
          </div>
        </Surface>
      ))}

      {editingId === null ? (
        <Button variant="secondary" size="sm" className="self-start" onClick={startCreate}>
          New template
        </Button>
      ) : (
        <Surface className="p-4">
          <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
              {editingId === 'new' ? 'New template' : 'Edit template'}
            </p>

            <label className="flex flex-col gap-1 text-[13px]">
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={field}
                placeholder="New animal arrival checklist"
              />
            </label>

            <label className="flex flex-col gap-1 text-[13px]">
              Description (optional)
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={`${field} min-h-[80px] py-2`}
              />
            </label>

            <div className="flex flex-col gap-2">
              <p className="text-[13px]">Steps</p>
              {steps.map((step, index) => (
                <div key={step.key} className="flex items-center gap-2">
                  <input
                    value={step.title}
                    onChange={(event) => updateStep(step.key, event.target.value)}
                    className={`${field} flex-1`}
                    placeholder={`Step ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(step.key)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" className="self-start" onClick={addStep}>
                Add step
              </Button>
            </div>

            {error ? (
              <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={pending} size="sm">
                {pending ? 'Saving …' : 'Save template'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={pending}>
                Cancel
              </Button>
            </div>
          </form>
        </Surface>
      )}
    </div>
  )
}
