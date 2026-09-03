'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { Surface } from '@/components/todotwo/ui/states'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

const field =
  'min-h-[44px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[16px] text-[var(--tt-ink)]'

interface TemplateOption {
  id: string
  name: string
  defaultProjectId: string | null
  stepCount: number
}

interface ProjectOption {
  id: string
  name: string
}

interface SectionOption {
  id: string
  projectId: string
  name: string
}

interface PersonOption {
  id: string
  name: string
}

/**
 * Applies a template via todotwo.apply_task_template() — staff-only RPC, see
 * supabase/migrations/20260908095200_todotwo_task_templates.sql.
 */
export function ApplyTemplateForm({
  templates,
  projects,
  sections,
  people,
  today,
}: {
  templates: TemplateOption[]
  projects: ProjectOption[]
  sections: SectionOption[]
  people: PersonOption[]
  today: string
}) {
  const router = useRouter()
  const [templateId, setTemplateId] = React.useState(templates[0]?.id ?? '')
  const [projectId, setProjectId] = React.useState(
    templates[0]?.defaultProjectId ?? projects[0]?.id ?? ''
  )
  const [sectionId, setSectionId] = React.useState('')
  const [dueDate, setDueDate] = React.useState(today)
  const [assigneeId, setAssigneeId] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const sectionsForProject = sections.filter((s) => s.projectId === projectId)

  function selectTemplate(id: string) {
    setTemplateId(id)
    const template = templates.find((t) => t.id === id)
    if (template?.defaultProjectId) {
      setProjectId(template.defaultProjectId)
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!templateId) {
      setError('Choose a template.')
      return
    }
    if (!projectId) {
      setError('Choose a project.')
      return
    }
    if (!dueDate) {
      setError('Choose a date.')
      return
    }

    setPending(true)
    try {
      const supabase = getTodoTwoBrowserClient()

      const { data: newTaskId, error: rpcError } = await supabase.rpc('apply_task_template', {
        p_template_id: templateId,
        p_project_id: projectId,
        p_section_id: sectionId || null,
        p_due_date: dueDate,
        p_assignee_person_id: assigneeId || null,
      })

      if (rpcError) {
        setError(rpcError.message)
        return
      }

      router.push(newTaskId ? `${TODOTWO_BASE}/tasks/${newTaskId}` : TODOTWO_BASE)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  if (templates.length === 0) {
    return (
      <Surface className="p-4 text-sm text-[var(--tt-ink-2)]">
        No templates yet. Create one on the Templates settings page first.
      </Surface>
    )
  }

  return (
    <Surface className="p-4">
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <label className="flex flex-col gap-1 text-[13px]">
          Template
          <select
            value={templateId}
            onChange={(event) => selectTemplate(event.target.value)}
            className={field}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.stepCount} step{t.stepCount === 1 ? '' : 's'})
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[13px]">
            Project
            <select
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value)
                setSectionId('')
              }}
              className={field}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[13px]">
            Section (optional)
            <select
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              className={field}
            >
              <option value="">No section</option>
              {sectionsForProject.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[13px]">
            Date
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1 text-[13px]">
            Assign to (optional)
            <select
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              className={field}
            >
              <option value="">Unassigned</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} size="sm" className="self-start">
          {pending ? 'Creating …' : 'Create task'}
        </Button>
      </form>
    </Surface>
  )
}
