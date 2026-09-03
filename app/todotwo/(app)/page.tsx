import { TaskRow } from '@/components/todotwo/tasks/task-row'
import { EmptyState, Surface } from '@/components/todotwo/ui/states'
import { copy, format, UI_LOCALE } from '@/lib/todotwo/copy'
import { displayName, requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getToday } from '@/lib/todotwo/queries'
import { FARM_TZ, farmToday, formatFarm } from '@/lib/todotwo/time'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

function timeLabel(dueAt: string | null): string | null {
  return dueAt ? formatFarm(new Date(dueAt), 'HH:mm') : null
}

export default async function TodayPage() {
  const principal = await requireTodoTwoUser(TODOTWO_BASE)
  const today = farmToday()
  const { overdue, today: due, doneToday } = await getToday(today)

  const totalMinutes = [...overdue, ...due].reduce(
    (sum, task) => sum + (task.estimated_minutes ?? 0),
    0
  )

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--tt-accent)]">
          {new Intl.DateTimeFormat(UI_LOCALE, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: FARM_TZ,
          }).format(new Date())}
        </p>
        <h1 className="text-2xl">
          {format(copy.overview.greeting, { name: displayName(principal.person) })}
        </h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          {due.length === 0 && overdue.length === 0
            ? 'Nothing left today.'
            : `${due.length + overdue.length} to do${totalMinutes > 0 ? ` · about ${totalMinutes} min` : ''}`}
        </p>
      </header>

      {overdue.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-danger)]">
            Overdue · {overdue.length}
          </h2>
          <Surface className="px-4">
            <ul className="list-none">
              {overdue.map((task) => (
                <TaskRow key={task.id} task={task} timeLabel={timeLabel(task.due_at)} />
              ))}
            </ul>
          </Surface>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          {copy.common.today}
        </h2>

        {due.length === 0 ? (
          <EmptyState
            title="Nothing scheduled"
            description="Recurring routines appear here each morning."
          />
        ) : (
          <Surface className="px-4">
            <ul className="list-none">
              {due.map((task) => (
                <TaskRow key={task.id} task={task} timeLabel={timeLabel(task.due_at)} />
              ))}
            </ul>
          </Surface>
        )}
      </section>

      {doneToday.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
            Done · {doneToday.length}
          </h2>
          <Surface className="px-4">
            <ul className="list-none">
              {doneToday.map((task) => (
                <TaskRow key={task.id} task={task} timeLabel={timeLabel(task.due_at)} />
              ))}
            </ul>
          </Surface>
        </section>
      ) : null}
    </div>
  )
}
