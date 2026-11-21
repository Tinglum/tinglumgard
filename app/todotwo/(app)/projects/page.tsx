import Link from 'next/link'
import { CalendarRange } from 'lucide-react'

import { StatusPill, Surface } from '@/components/todotwo/ui/states'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getProjects, getToday } from '@/lib/todotwo/queries'
import { farmToday } from '@/lib/todotwo/time'
import { FarmTaskPlan } from '@/components/todotwo/tasks/weekly-projects'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const principal = await requireTodoTwoUser(`${TODOTWO_BASE}/projects`)
  const today = farmToday()
  const canManage = principal.isAdmin || principal.roles.includes('coordinator')

  const [projects, plan] = await Promise.all([
    canManage ? getProjects() : Promise.resolve([]),
    getToday(principal.person.id, today),
  ])

  return (
    <div className="tt-fade-up mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tt-accent)]">
            Farm Planning
          </p>
          <h1 className="mt-0.5 text-[26px] leading-tight text-[var(--tt-ink)]">Projects</h1>
          <p className="mt-1 text-[13.5px] text-[var(--tt-ink-2)]">
            Bigger farm jobs, separate from daily chores. Assign a week, set a deadline, or keep in
            the backlog.
          </p>
        </div>
        <StatusPill tone="neutral">{plan.projects.length} total</StatusPill>
      </header>

      <FarmTaskPlan
        kind="projects"
        tasks={plan.projects}
        personId={principal.person.id}
        today={today}
        canManageProjects={canManage}
      />

      {projects.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--tt-ink-3)]">
            Task lists &amp; timelines
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {projects.map((project) => (
              <Surface key={project.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-[var(--tt-ink)]">
                    {project.name}
                  </p>
                  <p className="text-[12.5px] text-[var(--tt-ink-3)]">
                    {project.openCount} open task{project.openCount === 1 ? '' : 's'}
                  </p>
                </div>
                <Link
                  href={`${TODOTWO_BASE}/projects/${project.id}/timeline`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--tt-accent-soft)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--tt-accent)] transition-colors hover:bg-[var(--tt-accent)] hover:text-[var(--tt-on-accent)]"
                >
                  <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                  Timeline
                </Link>
              </Surface>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
