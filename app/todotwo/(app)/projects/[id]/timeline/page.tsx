import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Surface, EmptyState } from '@/components/todotwo/ui/states'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getProject, getProjectTimeline, type ProjectTimelineTask } from '@/lib/todotwo/queries'
import { addFarmDays, farmToday, formatFarm, farmDayStart } from '@/lib/todotwo/time'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const WINDOW_DAYS = 21

const DONE_STATUSES = new Set(['completed', 'verified'])
const CANCELLED_STATUSES = new Set(['cancelled', 'not_completed'])

function statusToneClass(status: string): string {
  if (DONE_STATUSES.has(status)) return 'border-[var(--tt-success,var(--tt-accent))] bg-[var(--tt-surface-2)]'
  if (CANCELLED_STATUSES.has(status)) return 'border-[var(--tt-rule)] bg-[var(--tt-surface)] opacity-60'
  if (status === 'blocked') return 'border-[var(--tt-danger)] bg-[var(--tt-danger-soft)]'
  return 'border-[var(--tt-accent)] bg-[var(--tt-surface)]'
}

export default async function ProjectTimelinePage({ params }: { params: { id: string } }) {
  await requireTodoTwoUser(`${TODOTWO_BASE}/projects/${params.id}/timeline`)

  const project = await getProject(params.id)
  if (!project) notFound()

  const from = farmToday()
  const to = addFarmDays(from, WINDOW_DAYS - 1)

  const timeline = await getProjectTimeline(project.id, from, to)

  const dates = Array.from({ length: WINDOW_DAYS }, (_, i) => addFarmDays(from, i))

  const tasksByDate = new Map<string, ProjectTimelineTask[]>()
  const unscheduled: ProjectTimelineTask[] = []
  for (const task of timeline.tasks) {
    if (!task.dueDate) {
      unscheduled.push(task)
      continue
    }
    const list = tasksByDate.get(task.dueDate) ?? []
    list.push(task)
    tasksByDate.set(task.dueDate, list)
  }

  const titleById = new Map(timeline.tasks.map((t) => [t.id, t.title]))
  const blockedByByTask = new Map<string, string[]>()
  for (const dep of timeline.dependencies) {
    const list = blockedByByTask.get(dep.taskId) ?? []
    const title = titleById.get(dep.dependsOnTaskId)
    if (title) list.push(title)
    blockedByByTask.set(dep.taskId, list)
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href={`${TODOTWO_BASE}/projects`}
          className="inline-flex items-center gap-1 self-start text-[13px] font-medium text-[var(--tt-accent)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Projects
        </Link>
        <h1 className="text-2xl">{project.name}</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Timeline for the next {WINDOW_DAYS} days — {timeline.tasks.length} scheduled task
          {timeline.tasks.length === 1 ? '' : 's'}.
        </p>
      </header>

      {timeline.tasks.length === 0 ? (
        <EmptyState
          title="Nothing scheduled"
          description="Tasks in this project with a due date in the next three weeks will show up here."
        />
      ) : (
        <Surface className="overflow-x-auto p-4">
          <div
            className="grid min-w-[900px] gap-px"
            style={{ gridTemplateColumns: `repeat(${WINDOW_DAYS}, minmax(2.5rem, 1fr))` }}
          >
            {dates.map((date) => {
              const isToday = date === from
              return (
                <div
                  key={date}
                  className={cn(
                    'flex flex-col items-center gap-0.5 border-b border-[var(--tt-rule)] pb-2 text-center',
                    isToday && 'text-[var(--tt-accent)]'
                  )}
                >
                  <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--tt-ink-3)]">
                    {formatFarm(farmDayStart(date), 'EEE')}
                  </span>
                  <span className="text-[13px] font-medium">{formatFarm(farmDayStart(date), 'd')}</span>
                </div>
              )
            })}

            {dates.map((date) => {
              const dayTasks = tasksByDate.get(date) ?? []
              return (
                <div key={`col-${date}`} className="flex flex-col gap-1.5 pt-2">
                  {dayTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`${TODOTWO_BASE}/tasks/${task.id}`}
                      title={task.title}
                      className={cn(
                        'truncate rounded border px-1.5 py-1 text-[11px] leading-snug hover:brightness-95',
                        statusToneClass(task.status)
                      )}
                    >
                      {task.title}
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>
        </Surface>
      )}

      {unscheduled.length > 0 ? (
        <Surface className="flex flex-col gap-2 p-4">
          <h2 className="text-[13px] font-semibold text-[var(--tt-ink-2)]">No due date</h2>
          <ul className="flex flex-col gap-1">
            {unscheduled.map((task) => (
              <li key={task.id}>
                <Link
                  href={`${TODOTWO_BASE}/tasks/${task.id}`}
                  className="text-[13px] hover:text-[var(--tt-accent)]"
                >
                  {task.title}
                </Link>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}

      {timeline.dependencies.length > 0 ? (
        <Surface className="flex flex-col gap-3 p-4">
          <h2 className="text-[13px] font-semibold text-[var(--tt-ink-2)]">Dependencies</h2>
          <ul className="flex flex-col gap-2">
            {timeline.tasks
              .filter((task) => (blockedByByTask.get(task.id) ?? []).length > 0)
              .map((task) => (
                <li key={task.id} className="text-[13px]">
                  <span className="font-medium">{task.title}</span>
                  <span className="text-[var(--tt-ink-3)]">
                    {' '}
                    blocked by {blockedByByTask.get(task.id)!.join(', ')}
                  </span>
                </li>
              ))}
          </ul>
        </Surface>
      ) : null}
    </div>
  )
}
