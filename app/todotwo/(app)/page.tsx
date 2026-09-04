import { ClaimTaskButton } from '@/components/todotwo/tasks/claim-task-button'
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

/**
 * Today, scoped to the person reading it.
 *
 * The page answers two questions and no others: what am I doing today, and
 * what still needs someone. Everyone else's work is readable elsewhere — it is
 * just not what this screen is for.
 */
export default async function TodayPage() {
  const principal = await requireTodoTwoUser(TODOTWO_BASE)
  const today = farmToday()
  const { overdue, mine, unclaimed, doneToday } = await getToday(principal.person.id, today)

  const totalMinutes = [...overdue, ...mine].reduce(
    (sum, task) => sum + (task.estimated_minutes ?? 0),
    0
  )
  const myOpenCount = overdue.length + mine.length

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
          {myOpenCount === 0
            ? unclaimed.length > 0
              ? `Nothing on you today · ${unclaimed.length} up for grabs`
              : 'Nothing on you today.'
            : `${myOpenCount} on you today${totalMinutes > 0 ? ` · about ${totalMinutes} min` : ''}`}
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

        {mine.length === 0 ? (
          <EmptyState
            title="Nothing assigned to you today"
            description={
              unclaimed.length > 0
                ? 'Not a mistake — nobody has put you on anything today. Have a look at what is up for grabs below.'
                : 'Nothing has your name on it today, and nothing is going spare either.'
            }
          />
        ) : (
          <Surface className="px-4">
            <ul className="list-none">
              {mine.map((task) => (
                <TaskRow key={task.id} task={task} timeLabel={timeLabel(task.due_at)} />
              ))}
            </ul>
          </Surface>
        )}
      </section>

      {unclaimed.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
            Up for grabs · {unclaimed.length}
          </h2>
          <p className="text-[13px] text-[var(--tt-ink-2)]">
            Due today with nobody on them. Take one and it is yours.
          </p>
          <Surface className="px-4">
            <ul className="list-none">
              {unclaimed.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start justify-between gap-3 border-b border-[var(--tt-rule)] last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <TaskRow task={task} timeLabel={timeLabel(task.due_at)} />
                  </div>
                  <div className="shrink-0 self-center pl-1">
                    <ClaimTaskButton taskId={task.id} />
                  </div>
                </li>
              ))}
            </ul>
          </Surface>
        </section>
      ) : null}

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
