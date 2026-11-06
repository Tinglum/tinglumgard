import Link from 'next/link'
import { CalendarRange } from 'lucide-react'

import { Surface } from '@/components/todotwo/ui/states'
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

  const [projects, plan] = await Promise.all([canManage ? getProjects() : Promise.resolve([]), getToday(principal.person.id, today)])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl">Projects</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Bigger farm jobs, separate from daily chores. Plan a week, set a definite or approximate deadline, or save an idea for later.
        </p>
      </header>

      <FarmTaskPlan kind="projects" tasks={plan.projects} personId={principal.person.id} today={today} canManageProjects={canManage} />

      {projects.length > 0 ? (
        <details><summary className="cursor-pointer py-3 text-sm font-semibold">Task lists and timelines</summary>
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <Surface key={project.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-[15px] font-medium">{project.name}</span>
                <span className="text-[13px] text-[var(--tt-ink-3)]">
                  {project.openCount} open task{project.openCount === 1 ? '' : 's'}
                </span>
              </div>
              <Link
                href={`${TODOTWO_BASE}/projects/${project.id}/timeline`}
                className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-[var(--tt-accent)] hover:underline"
              >
                <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                Timeline
              </Link>
            </Surface>
          ))}
        </div>
        </details>
      ) : null}
    </div>
  )
}
