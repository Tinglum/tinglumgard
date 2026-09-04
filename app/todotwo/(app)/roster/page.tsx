import { RosterDatePicker } from '@/components/todotwo/roster/date-picker'
import { EmptyState, Surface } from '@/components/todotwo/ui/states'
import { Avatar } from '@/components/todotwo/ui/avatar'
import { UI_LOCALE } from '@/lib/todotwo/copy'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getRosterForDate } from '@/lib/todotwo/queries'
import { FARM_TZ, farmDayStart, farmToday, formatFarm, isFarmDate } from '@/lib/todotwo/time'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

/**
 * Who is doing what, at a glance — one section per person for the selected
 * day. Distinct from Today/Upcoming (a person's own work) and from the
 * farm-wide Favorites view (a flat list not grouped by person).
 *
 * Open to everyone signed in: RLS already treats farm work as not secret
 * (see the tasks policy comments) and Favorites' own farm-wide view is staff
 * gated for a different reason (it surfaces active in-progress work), not
 * because who's-on-what is sensitive. A day roster is the same visibility the
 * app already gives a Workawayer standing in the barn reading the list.
 */
export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  await requireTodoTwoUser(todoTwoRoutes.roster())

  const { date: rawDate } = await searchParams
  const date = rawDate && isFarmDate(rawDate) ? rawDate : farmToday()

  const entries = await getRosterForDate(date)
  const total = entries.reduce((sum, e) => sum + e.tasks.length, 0)

  const dateLabel = new Intl.DateTimeFormat(UI_LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: FARM_TZ,
  }).format(farmDayStart(date))

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl">Roster</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          {dateLabel} · {total === 0 ? 'nothing scheduled' : `${total} task${total === 1 ? '' : 's'}`}
        </p>
        <RosterDatePicker date={date} />
      </header>

      {total === 0 ? (
        <EmptyState title="Nothing scheduled" description="No tasks are due on this day." />
      ) : (
        entries
          .filter((entry) => entry.tasks.length > 0)
          .map((entry) => (
            <section key={entry.personId ?? 'unassigned'} className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
                {entry.personId ? (
                  <Avatar
                    person={{ id: entry.personId, fullName: entry.personName ?? '?', photoUrl: entry.photoUrl }}
                    size={18}
                  />
                ) : null}
                {entry.personName}
                <span className="font-normal normal-case tracking-normal">· {entry.tasks.length}</span>
              </h2>

              <Surface className="px-4">
                <ul className="list-none divide-y divide-[var(--tt-rule)]">
                  {entry.tasks.map((task) => (
                    <li key={task.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="min-w-0 flex-1 truncate text-[15px]">{task.title}</span>
                      {task.dueAt ? (
                        <span className="shrink-0 text-[12px] tabular-nums text-[var(--tt-ink-3)]">
                          {formatFarm(new Date(task.dueAt), 'HH:mm')}
                        </span>
                      ) : null}
                      <span className="shrink-0 text-[11px] uppercase tracking-wide text-[var(--tt-ink-3)]">
                        {task.status.replace(/_/g, ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </Surface>
            </section>
          ))
      )}
    </div>
  )
}
