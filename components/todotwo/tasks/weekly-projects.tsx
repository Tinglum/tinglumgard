import { ClaimTaskButton } from './claim-task-button'
import { TaskRow } from './task-row'
import { Surface } from '@/components/todotwo/ui/states'
import { farmWeek } from '@/lib/todotwo/domain/weekly-projects'
import { isFinished } from '@/lib/todotwo/domain/task-status'
import { farmDayStart, formatFarm } from '@/lib/todotwo/time'
import type { TaskRow as ProjectTask } from '@/lib/todotwo/queries'

export function WeeklyProjects({ tasks, personId, today }: {
  tasks: ProjectTask[]; personId: string; today: string
}) {
  const week = farmWeek(today)
  const active = tasks.filter(task => task.status !== 'cancelled')
  const open = active.filter(task => !isFinished(task.status))
  const current = open.filter(task => !task.due_date || task.due_date >= week.start)
  const overdue = open.filter(task => task.due_date && task.due_date < week.start)
  const mine = current.filter(task => task.assignee?.id === personId)
  const available = current.filter(task => !task.assignee)
  const others = current.filter(task => task.assignee && task.assignee.id !== personId)
  const done = active.filter(task => isFinished(task.status))

  function list(rows: ProjectTask[]) {
    return <div className="divide-y divide-[var(--tt-rule)]">{[...rows]
      .sort((a, b) => (a.due_date || week.end).localeCompare(b.due_date || week.end))
      .map(task => <div key={task.id} className="py-2">
        <p className={`text-[11px] ${task.due_date && task.due_date < today && !isFinished(task.status) ? 'text-[var(--tt-danger)]' : 'text-[var(--tt-ink-3)]'}`}>
          {task.due_date ? `${task.due_date < today && !isFinished(task.status) ? 'Still to do · ' : ''}${formatFarm(farmDayStart(task.due_date), 'EEEE d MMM')}` : 'Plan a day this week'}
        </p>
        <div className="flex items-center gap-3"><ul className="min-w-0 flex-1 list-none"><TaskRow task={task} timeLabel={null} /></ul>
          {!task.assignee && !isFinished(task.status) ? <ClaimTaskButton taskId={task.id} /> : null}
        </div>
      </div>)}</div>
  }

  return <Surface className="flex flex-col gap-4 border-l-4 border-l-[var(--tt-accent)] p-4 sm:p-5">
    <section aria-labelledby="weekly-projects-title" className="flex flex-col gap-4">
      <header><h2 id="weekly-projects-title" className="text-xl">Weekly projects</h2>
        <p className="mt-1 text-xs text-[var(--tt-ink-3)]">{formatFarm(farmDayStart(week.start), 'd MMM')}–{formatFarm(farmDayStart(week.end), 'd MMM')} · {done.length} of {current.length + done.length} done</p>
        <p className="mt-2 text-sm text-[var(--tt-ink-2)]">Plan the whole week from Monday. Claim a project now and make sure it gets done by its scheduled day. Daily chores are listed separately above.</p>
      </header>
      <details><summary className="cursor-pointer py-2 text-sm font-semibold">My weekly projects · {mine.length}</summary>
        {mine.length ? list(mine) : <p className="mt-2 text-sm text-[var(--tt-ink-3)]">You have not claimed any projects for this week yet.</p>}
      </details>
      <details><summary className="cursor-pointer py-2 text-sm font-semibold">Up for grabs this week · {available.length}</summary>
        {available.length ? list(available) : <p className="mt-2 text-sm text-[var(--tt-ink-3)]">Everything has an owner. Check the team’s projects below.</p>}
      </details>
      {overdue.length > 0 && <details><summary className="cursor-pointer py-2 text-sm font-semibold text-[var(--tt-danger)]">Needs attention from earlier weeks · {overdue.length}</summary>{list(overdue)}</details>}
      {others.length > 0 && <details><summary className="cursor-pointer py-2 text-sm font-semibold">Claimed by the team · {others.length}</summary>{list(others)}</details>}
      {done.length > 0 && <details><summary className="cursor-pointer py-2 text-sm font-semibold">Completed this week · {done.length}</summary>{list(done)}</details>}
    </section>
  </Surface>
}
