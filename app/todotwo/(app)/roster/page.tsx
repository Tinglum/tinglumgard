import { RosterDatePicker } from '@/components/todotwo/roster/date-picker'
import { UndoCompletionButton } from '@/components/todotwo/roster/undo-completion-button'
import Link from 'next/link'
import { Check, Hand } from 'lucide-react'
import { EmptyState, StatusPill, Surface } from '@/components/todotwo/ui/states'
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
import { TODOTWO_BASE, todoTwoRoutes } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const principal = await requireTodoTwoUser(todoTwoRoutes.roster())

  const { date: rawDate } = await searchParams
  const start: FarmDate = rawDate && isFarmDate(rawDate) ? rawDate : farmToday()
  const second: FarmDate = addFarmDays(start, 1)

  const [firstEntries, secondEntries] = await Promise.all([
    getRosterForDate(start),
    getRosterForDate(second),
  ])

  return (
    <div className="tt-fade-up mx-auto flex w-full max-w-4xl flex-col gap-7">
      <header className="flex flex-col gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tt-accent)]">
            Two-day view
          </p>
          <h1 className="mt-0.5 text-[26px] leading-tight text-[var(--tt-ink)]">Farm Roster</h1>
          <p className="mt-1 text-[13.5px] text-[var(--tt-ink-2)]">
            Who is on what across two days, with live completion progress.
          </p>
        </div>
        <RosterDatePicker date={start} />
      </header>

      <RosterDay
        date={start}
        entries={firstEntries}
        currentPersonId={principal.person.id}
        canUndoAll={principal.isAdmin}
      />
      <RosterDay
        date={second}
        entries={secondEntries}
        currentPersonId={principal.person.id}
        canUndoAll={principal.isAdmin}
      />
    </div>
  )
}

function RosterDay({
  date,
  entries,
  currentPersonId,
  canUndoAll,
}: {
  date: FarmDate
  entries: RosterEntry[]
  currentPersonId: string
  canUndoAll: boolean
}) {
  const populated = entries.filter((entry) => entry.tasks.length > 0)
  const total = populated.reduce((sum, entry) => sum + entry.tasks.length, 0)
  const totalDone = populated.reduce(
    (sum, entry) => sum + entry.tasks.filter((t) => isFinished(t.status)).length,
    0
  )
  const relative = relativeLabel(date)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-2.5 border-b border-[var(--tt-rule)] pb-2.5">
        <h2 className="text-[18px] font-semibold text-[var(--tt-ink)]">
          {relative ?? longDate(date)}
        </h2>
        {relative ? <span className="text-[13.5px] text-[var(--tt-ink-2)]">{longDate(date)}</span> : null}
        <div className="ml-auto flex items-center gap-2">
          {total > 0 ? (
            <StatusPill tone={totalDone === total ? 'accent' : 'neutral'}>
              {totalDone}/{total} done
            </StatusPill>
          ) : (
            <span className="text-[12px] text-[var(--tt-ink-3)]">nothing scheduled</span>
          )}
        </div>
      </div>

      {total === 0 ? (
        <EmptyState title="Nothing scheduled" description="No tasks are due on this day." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {populated.map((entry) => (
            <PersonBlock
              key={entry.personId ?? 'unassigned'}
              entry={entry}
              currentPersonId={currentPersonId}
              canUndoAll={canUndoAll}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function PersonBlock({
  entry,
  currentPersonId,
  canUndoAll,
}: {
  entry: RosterEntry
  currentPersonId: string
  canUndoAll: boolean
}) {
  const cancelled = entry.tasks.filter((task) => isCancelled(task.status)).length
  const countable = entry.tasks.length - cancelled
  const done = entry.tasks.filter((task) => isFinished(task.status)).length
  const pct = countable > 0 ? Math.round((done / countable) * 100) : 0
  const isMe = entry.personId === currentPersonId
  const isUnassigned = !entry.personId

  return (
    <Surface
      className={cn(
        'flex flex-col gap-3 p-4',
        isMe && 'ring-1 ring-[var(--tt-accent-ring)]',
        isUnassigned && 'border-[var(--tt-warn-rule)] bg-[var(--tt-warn-soft)]/30'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {entry.personId ? (
            <Avatar
              person={{
                id: entry.personId,
                fullName: entry.personName ?? '?',
                photoUrl: entry.photoUrl,
              }}
              size={30}
            />
          ) : (
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--tt-warn-soft)] text-[var(--tt-warn)]">
              <Hand className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 truncate text-[15px] font-semibold text-[var(--tt-ink)]">
              <span className="truncate">{entry.personName}</span>
              {isMe ? (
                <span className="rounded-full bg-[var(--tt-accent-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--tt-accent)]">
                  You
                </span>
              ) : null}
            </h3>
            <p className="text-[12px] tabular-nums text-[var(--tt-ink-3)]">
              {countable > 0 ? `${done} of ${countable} done` : `${entry.tasks.length} items`}
              {cancelled > 0 ? ` · ${cancelled} cancelled` : ''}
            </p>
          </div>
        </div>

        {!isUnassigned && countable > 0 ? (
          <StatusPill tone={done === countable ? 'accent' : 'neutral'}>{pct}%</StatusPill>
        ) : null}
      </div>

      {!isUnassigned && countable > 0 ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--tt-surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--tt-accent)] transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}

      <ul className="list-none divide-y divide-[var(--tt-rule)]">
        {entry.tasks.map((task) => {
          const taskDone = isFinished(task.status)
          const taskCancelled = isCancelled(task.status)

          return (
            <li
              key={task.id}
              className={cn(
                'flex items-center justify-between gap-2.5 py-2.5 first:pt-1 last:pb-0',
                taskCancelled && 'opacity-55'
              )}
            >
              <Link
                href={`${TODOTWO_BASE}/tasks/${task.id}`}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 text-[14px] hover:text-[var(--tt-accent)]',
                  (taskDone || taskCancelled) && 'line-through',
                  taskDone && 'text-[var(--tt-ink-3)]',
                  taskCancelled && 'text-[var(--tt-ink-3)]'
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    taskDone
                      ? 'border-[var(--tt-accent)] bg-[var(--tt-accent)] text-[var(--tt-on-accent)]'
                      : 'border-[var(--tt-rule-strong)]'
                  )}
                >
                  {taskDone ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : null}
                </span>
                <span className="truncate">{task.title}</span>
              </Link>
              <div className="flex shrink-0 items-center gap-1.5">
                {task.dueAt ? (
                  <span className="rounded-md bg-[var(--tt-surface-2)] px-1.5 py-0.5 text-[11.5px] font-medium tabular-nums text-[var(--tt-ink-2)]">
                    {formatFarm(new Date(task.dueAt), 'HH:mm')}
                  </span>
                ) : null}
                {(canUndoAll || entry.personId === currentPersonId) &&
                task.status === 'completed' ? (
                  <UndoCompletionButton taskId={task.id} taskTitle={task.title} />
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </Surface>
  )
}

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
