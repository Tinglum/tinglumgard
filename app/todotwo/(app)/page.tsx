import { ClaimTaskButton } from '@/components/todotwo/tasks/claim-task-button'
import { AskForHelp } from '@/components/todotwo/tasks/ask-for-help'
import { FarmToday } from '@/components/todotwo/tasks/farm-today'
import { SnoozeTaskButton } from '@/components/todotwo/tasks/snooze-task-button'
import { OpenHelpRequests } from '@/components/todotwo/tasks/open-help-requests'
import { TaskRow } from '@/components/todotwo/tasks/task-row'
import { EmptyState, Surface } from '@/components/todotwo/ui/states'
import { copy, format, UI_LOCALE } from '@/lib/todotwo/copy'
import { displayName, requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getToday } from '@/lib/todotwo/queries'
import { getOpenHelpRequests } from '@/lib/todotwo/queries-help'
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
  const [
    { overdue, mine, unclaimed, doneToday, everyoneToday, olderOpenCount },
    helpRequests,
  ] = await Promise.all([
    getToday(principal.person.id, today),
    getOpenHelpRequests(principal.person.id),
  ])

  const totalMinutes = [...overdue, ...mine].reduce(
    (sum, task) => sum + (task.estimated_minutes ?? 0),
    0
  )
  const myOpenCount = overdue.length + mine.length
  const askedTaskIds = new Set(helpRequests.filter((request) => request.isMine).map((request) => request.taskId))

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
            ? 'Nothing on you today.'
            : `${myOpenCount} on you today${totalMinutes > 0 ? ` · about ${totalMinutes} min` : ''}`}
        </p>

        {/* The count that used to be a clause at the end of the line above,
            where it read as a footnote. Unclaimed work is the one thing on
            this screen that is nobody's problem until somebody makes it
            theirs, so it is the thing worth being large and worth being a
            link. */}
        {unclaimed.length > 0 ? (
          <a
            href="#up-for-grabs"
            className="mt-1 flex items-baseline gap-2 self-start rounded-md text-[var(--tt-accent)] hover:underline"
          >
            <span className="text-3xl font-semibold leading-none tabular-nums">
              {unclaimed.length}
            </span>
            <span className="text-sm">
              up for grabs — nobody has {unclaimed.length === 1 ? 'it' : 'them'} yet
            </span>
          </a>
        ) : null}
      </header>

      {overdue.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-danger)]">
            Overdue · {overdue.length}
          </h2>
          <Surface className="px-4">
            <ul className="list-none">
              {overdue.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  timeLabel={timeLabel(task.due_at)}
                  helpAction={<AskForHelp taskId={task.id} alreadyAsked={askedTaskIds.has(task.id)} />}
                />
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
                <TaskRow
                  key={task.id}
                  task={task}
                  timeLabel={timeLabel(task.due_at)}
                  helpAction={<AskForHelp taskId={task.id} alreadyAsked={askedTaskIds.has(task.id)} />}
                />
              ))}
            </ul>
          </Surface>
        )}
      </section>

      <FarmToday
        tasks={everyoneToday}
        currentPersonId={principal.person.id}
        timeLabel={timeLabel}
      />

      <OpenHelpRequests requests={helpRequests} />

      {olderOpenCount > 0 ? (
        <p className="text-[13px] text-[var(--tt-ink-3)]">
          {olderOpenCount} older item{olderOpenCount === 1 ? '' : 's'} still open from more than a
          month ago, not shown here.
        </p>
      ) : null}

      {unclaimed.length > 0 ? (
        // scroll-mt keeps the heading clear of the sticky top bar when the
        // count above jumps here.
        <section id="up-for-grabs" className="flex scroll-mt-20 flex-col gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
            Up for grabs · {unclaimed.length}
          </h2>
          <p className="text-[13px] text-[var(--tt-ink-2)]">
            Due today with nobody on them. Taking one means taking charge of it — making sure it
            gets done, not necessarily doing all of it yourself. If it should wait, move it to
            tomorrow instead.
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
                  <div className="flex shrink-0 flex-col items-end gap-1 self-center pl-1">
                    <ClaimTaskButton taskId={task.id} />
                    <SnoozeTaskButton taskId={task.id} />
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
