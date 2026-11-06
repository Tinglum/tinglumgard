import Link from 'next/link'
import { Surface } from '@/components/todotwo/ui/states'
import { farmWeek } from '@/lib/todotwo/domain/weekly-projects'
import { plannedThisWeek, projectPlanLabel } from '@/lib/todotwo/domain/project-planning'
import { isFinished } from '@/lib/todotwo/domain/task-status'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'
import type { TaskRow } from '@/lib/todotwo/queries'

export function MondayPlan({ tasks, today }: { tasks: TaskRow[]; today: string }) {
  const week = farmWeek(today)
  if (today !== week.start) return null
  const dated = tasks.filter(task => !isFinished(task.status) && task.status !== 'cancelled' && (task.due_date || task.planned_week))
  const earlier = dated.filter(task => (task.due_date && task.due_date < today) || (!task.due_date && task.planned_week && task.planned_week < today))
  const earlierIds = new Set(earlier.map(task => task.id))
  const thisWeek = dated.filter(task => !earlierIds.has(task.id) && plannedThisWeek(task, today))
  const coming = dated.filter(task => !earlierIds.has(task.id) && !plannedThisWeek(task, today))
  function list(rows: TaskRow[]) {
    return <ul className="divide-y divide-[var(--tt-rule)]">{[...rows].sort((a,b) => (a.due_date || a.planned_week || '').localeCompare(b.due_date || b.planned_week || '')).map(task => <li key={task.id} className="py-3">
      <Link className="font-semibold text-[var(--tt-accent)] hover:underline" href={`${TODOTWO_BASE}/tasks/${task.id}`}>{task.title}</Link>
      <p className="mt-1 text-xs text-[var(--tt-ink-2)]">{projectPlanLabel(task)}</p>
      <p className="mt-1 text-xs">{task.assignee ? task.assignee.preferredName || task.assignee.fullName : 'Unclaimed · needs an owner'}</p>
    </li>)}</ul>
  }
  return <Surface className="border-2 border-[var(--tt-accent)] p-5 sm:p-6">
    <h2 className="text-2xl">Monday · Plan the week</h2>
    <p className="mt-2 text-sm text-[var(--tt-ink-2)]">Review dated weekly tasks and projects together. Check firm deadlines, flexible targets and who is taking charge.</p>
    {earlier.length > 0 && <details className="mt-4"><summary className="cursor-pointer py-3 font-semibold">Earlier dates to review · {earlier.length}</summary>{list(earlier)}</details>}
    <section className="mt-4"><h3 className="font-semibold">This week · {thisWeek.length}</h3>{thisWeek.length ? list(thisWeek) : <p className="mt-2 text-sm">No dated work planned for this week yet.</p>}</section>
    {coming.length > 0 && <details className="mt-4"><summary className="cursor-pointer py-3 font-semibold">Coming up later · {coming.length}</summary>{list(coming)}</details>}
    <Link href={`${TODOTWO_BASE}/projects`} className="mt-4 inline-block py-2 text-sm font-semibold text-[var(--tt-accent)] hover:underline">Add or plan a project →</Link>
  </Surface>
}
