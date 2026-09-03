import Link from 'next/link'
import { CalendarRange } from 'lucide-react'

import { EmptyState, Surface } from '@/components/todotwo/ui/states'
import { requireRole } from '@/lib/todotwo/auth'
import { getProjects } from '@/lib/todotwo/queries'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  await requireRole(['super_admin', 'farm_admin', 'coordinator'], `${TODOTWO_BASE}/projects`)

  const projects = await getProjects()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl">Projects</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Multi-day efforts, separate from the daily routines — pick one for a timeline of what is
          scheduled across the coming weeks.
        </p>
      </header>

      {projects.length === 0 ? (
        <EmptyState title="No projects yet" description="Projects created from Todoist or the app will show up here." />
      ) : (
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
      )}
    </div>
  )
}
