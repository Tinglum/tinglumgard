import { AssignmentConsole } from '@/components/todotwo/assign/assignment-console'
import { requireRole } from '@/lib/todotwo/auth'
import { getPeople, getProjects, getSeries } from '@/lib/todotwo/queries'
import { addFarmDays, farmToday } from '@/lib/todotwo/time'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function AssignPage() {
  await requireRole(['super_admin', 'farm_admin', 'coordinator'], `${TODOTWO_BASE}/routines/assign`)

  const today = farmToday()
  const defaultFrom = today
  const defaultTo = addFarmDays(today, 6)

  const [people, series, projects] = await Promise.all([getPeople(), getSeries(), getProjects()])

  const roster = people.map((person) => ({
    id: person.id,
    name: person.preferred_name || person.full_name,
  }))

  // The same labels the free-text path matches "housekeeping tasks" against: a
  // routine's title or a project's name. Offered whole rather than filtered to
  // the chosen window, because the window is picked after this list is built —
  // a group with nothing in it comes back from the preview as unresolved, which
  // is the existing, visible failure rather than a silently missing option.
  const taskGroups = Array.from(
    new Set([...series.map((s) => s.title), ...projects.map((p) => p.name)])
  )
    .filter((label) => label.trim() !== '')
    .sort((a, b) => a.localeCompare(b))

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Assign with free text</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Tick the usual constraints, add anything unusual in your own words — "divide all tasks
          evenly, but Robert does no housekeeping tasks" — and check the result before anything is
          written.
        </p>
      </header>

      <AssignmentConsole
        defaultFrom={defaultFrom}
        defaultTo={defaultTo}
        people={roster}
        taskGroups={taskGroups}
      />
    </div>
  )
}
