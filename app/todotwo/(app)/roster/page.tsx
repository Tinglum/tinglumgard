import { RosterDatePicker } from '@/components/todotwo/roster/date-picker'
import { EmptyState, Surface } from '@/components/todotwo/ui/states'
import { Avatar } from '@/components/todotwo/ui/avatar'
import { UI_LOCALE } from '@/lib/todotwo/copy'
import { cn } from '@/lib/utils'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getRosterForDate, type RosterEntry } from '@/lib/todotwo/queries'
import { isCancelled, isFinished } from '@/lib/todotwo/domain/task-status'
import {
  FARM_TZ,
  addFarmDays,
  farmDayStart,
  farmDaysBetween,
  farmToday,
  formatFarm,
  isFarmDate,
  type FarmDate,
} from '@/lib/todotwo/time'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

/**
 * Finished work. `task_status` has eleven values; OPEN_STATUSES in
 * lib/todotwo/queries.ts names the seven that are still outstanding, which
 * leaves completed, verified, awaiting_verification and cancelled as closed.
 *
 * awaiting_verification is not in OPEN_STATUSES and the board already labels
 * it "Done": the person did the work, someone else has yet to sign it off.
 * On a "who is doing what" view that reads as done, so it strikes through and
 * counts towards the tally.
 *
 * cancelled is deliberately *not* here. Cancelled work was never done, so
 * counting it as done would inflate the tally and make a called-off day look
 * productive. It is struck through too — it is not outstanding either — but
 * dimmer, and it is excluded from the denominator rather than the numerator.
 */


/**
 * Who is doing what, at a glance — today and tomorrow side by side, one
 * section per person per day. Distinct from Today/Upcoming (a person's own
 * work) and from the farm-wide Favorites view (a flat list not grouped by
 * person).
 *
 * Two days rather than one because that is the question the view is actually
 * asked: what is happening now, and what needs lining up before it arrives.
 * The date picker still moves the pair, so any two consecutive days can be
 * read; it picks the first of the two.
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
  const start: FarmDate = rawDate && isFarmDate(rawDate) ? rawDate : farmToday()
  const second: FarmDate = addFarmDays(start, 1)

  // Two reads rather than one ranged read: the query is already indexed on
  // due_date and grouping happens per day anyway, so a range would only have
  // to be split apart again.
  const [firstEntries, secondEntries] = await Promise.all([
    getRosterForDate(start),
    getRosterForDate(second),
  ])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl">Roster</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Who is on what over two days. Finished work is struck through.
        </p>
        <RosterDatePicker date={start} />
      </header>

      <RosterDay date={start} entries={firstEntries} />
      <RosterDay date={second} entries={secondEntries} />
    </div>
  )
}

/** One labelled day: its heading, then a section per person with work on it. */
function RosterDay({ date, entries }: { date: FarmDate; entries: RosterEntry[] }) {
  const populated = entries.filter((entry) => entry.tasks.length > 0)
  const total = populated.reduce((sum, entry) => sum + entry.tasks.length, 0)
  const relative = relativeLabel(date)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-2 border-b border-[var(--tt-rule)] pb-2">
        <h2 className="text-[17px] font-semibold text-[var(--tt-ink)]">
          {relative ?? longDate(date)}
        </h2>
        {relative ? <span className="text-sm text-[var(--tt-ink-2)]">{longDate(date)}</span> : null}
        <span className="ml-auto text-[12px] tabular-nums text-[var(--tt-ink-3)]">
          {total === 0 ? 'nothing scheduled' : `${total} task${total === 1 ? '' : 's'}`}
        </span>
      </div>

      {total === 0 ? (
        <EmptyState title="Nothing scheduled" description="No tasks are due on this day." />
      ) : (
        <div className="flex flex-col gap-4">
          {populated.map((entry) => (
            <PersonBlock key={entry.personId ?? 'unassigned'} entry={entry} />
          ))}
        </div>
      )}
    </section>
  )
}

/** One person's work for a day, with a done-of-outstanding tally. */
function PersonBlock({ entry }: { entry: RosterEntry }) {
  const cancelled = entry.tasks.filter((task) => isCancelled(task.status)).length
  const countable = entry.tasks.length - cancelled
  const done = entry.tasks.filter((task) => isFinished(task.status)).length

  return (
    <div className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
        {entry.personId ? (
          <Avatar
            person={{
              id: entry.personId,
              fullName: entry.personName ?? '?',
              photoUrl: entry.photoUrl,
            }}
            size={18}
          />
        ) : null}
        {entry.personName}
        <span className="font-normal normal-case tracking-normal">
          {countable > 0 ? `· ${done} of ${countable} done` : `· ${entry.tasks.length}`}
          {cancelled > 0 ? ` · ${cancelled} cancelled` : ''}
        </span>
      </h3>

      <Surface className="px-4">
        <ul className="list-none divide-y divide-[var(--tt-rule)]">
          {entry.tasks.map((task) => {
            const taskDone = isFinished(task.status)
            const taskCancelled = isCancelled(task.status)

            return (
              <li
                key={task.id}
                className={cn(
                  'flex items-center justify-between gap-3 py-3',
                  taskCancelled && 'opacity-60'
                )}
              >
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-[15px]',
                    (taskDone || taskCancelled) && 'line-through',
                    taskDone && 'text-[var(--tt-ink-2)]',
                    taskCancelled && 'text-[var(--tt-ink-3)]'
                  )}
                >
                  {task.title}
                </span>
                {task.dueAt ? (
                  <span className="shrink-0 text-[12px] tabular-nums text-[var(--tt-ink-3)]">
                    {formatFarm(new Date(task.dueAt), 'HH:mm')}
                  </span>
                ) : null}
                <span className="shrink-0 text-[11px] uppercase tracking-wide text-[var(--tt-ink-3)]">
                  {task.status.replace(/_/g, ' ')}
                </span>
              </li>
            )
          })}
        </ul>
      </Surface>
    </div>
  )
}

/**
 * "Today" / "Tomorrow" / "Yesterday", or null when the date is far enough out
 * that the calendar date is the only useful label.
 */
function relativeLabel(date: FarmDate): string | null {
  const offset = farmDaysBetween(farmToday(), date)
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  if (offset === -1) return 'Yesterday'
  return null
}

function longDate(date: FarmDate): string {
  return new Intl.DateTimeFormat(UI_LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: FARM_TZ,
  }).format(farmDayStart(date))
}
