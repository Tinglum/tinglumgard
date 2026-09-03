import { TaskRow } from '@/components/todotwo/tasks/task-row'
import { EmptyState, Surface } from '@/components/todotwo/ui/states'
import { UI_LOCALE } from '@/lib/todotwo/copy'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getUpcoming } from '@/lib/todotwo/queries'
import { FARM_TZ, farmDayStart, formatFarm } from '@/lib/todotwo/time'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function UpcomingPage() {
  await requireTodoTwoUser(todoTwoRoutes.upcoming())
  const groups = await getUpcoming(7)

  const total = groups.reduce((sum, g) => sum + g.tasks.length, 0)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Upcoming</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          {total === 0 ? 'Nothing scheduled this week.' : `${total} over the next 7 days`}
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.date} className="flex flex-col gap-2">
          <h2 className="flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
            {new Intl.DateTimeFormat(UI_LOCALE, {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              timeZone: FARM_TZ,
            }).format(farmDayStart(group.date))}
            <span className="font-normal normal-case tracking-normal">
              {group.tasks.length > 0 ? `· ${group.tasks.length}` : ''}
            </span>
          </h2>

          {group.tasks.length === 0 ? (
            <p className="px-1 text-[13px] text-[var(--tt-ink-3)]">Nothing scheduled.</p>
          ) : (
            <Surface className="px-4">
              <ul className="list-none">
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    timeLabel={task.due_at ? formatFarm(new Date(task.due_at), 'HH:mm') : null}
                  />
                ))}
              </ul>
            </Surface>
          )}
        </section>
      ))}

      {total === 0 ? (
        <EmptyState title="Nothing ahead" description="Generated routines will appear here." />
      ) : null}
    </div>
  )
}
