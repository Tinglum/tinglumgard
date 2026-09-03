import type { Metadata } from 'next'

import { ApplyTemplateForm } from '@/components/todotwo/templates/apply-template-form'
import { requireRole } from '@/lib/todotwo/auth'
import { getPeople, getProjects, getSections, getTaskTemplates } from '@/lib/todotwo/queries'
import { farmToday } from '@/lib/todotwo/time'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const metadata: Metadata = { title: 'New from template' }
export const dynamic = 'force-dynamic'

export default async function ApplyTemplatePage() {
  await requireRole(
    ['super_admin', 'farm_admin', 'coordinator'],
    `${TODOTWO_BASE}/routines/apply-template`
  )

  const [templates, projects, sections, people] = await Promise.all([
    getTaskTemplates(),
    getProjects(),
    getSections(),
    getPeople(),
  ])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">New from template</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Drop a template onto a project, section, and day.
        </p>
      </header>

      <ApplyTemplateForm
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          defaultProjectId: t.default_project_id,
          stepCount: t.steps.length,
        }))}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        sections={sections.map((s) => ({ id: s.id, projectId: s.project_id, name: s.name }))}
        people={people.map((p) => ({ id: p.id, name: p.preferred_name || p.full_name }))}
        today={farmToday()}
      />
    </div>
  )
}
