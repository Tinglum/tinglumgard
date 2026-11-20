'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  CalendarOff,
  Check,
  Clock,
  FolderKanban,
  Hand,
  Users,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Avatar } from '@/components/todotwo/ui/avatar'
import { Button } from '@/components/todotwo/ui/button'
import { EmptyState, StatusPill, Surface } from '@/components/todotwo/ui/states'
import { TaskRow } from '@/components/todotwo/tasks/task-row'
import { ProjectForm } from '@/components/todotwo/tasks/project-form'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { isFinished } from '@/lib/todotwo/domain/task-status'
import { plannedThisWeek, projectPlanLabel } from '@/lib/todotwo/domain/project-planning'
import { farmDayStart, formatFarm } from '@/lib/todotwo/time'
import { TODOTWO_BASE, todoTwoRoutes } from '@/lib/todotwo/routes'
import type { TaskAssignee, TaskGroup, TaskRow as QueryTaskRow } from '@/lib/todotwo/queries'
import type { DayOffEntry } from '@/lib/todotwo/domain/days-off'

type ScopeFilter = 'everyone' | 'mine' | 'unclaimed'

function timeLabel(dueAt: string | null): string | null {
  return dueAt ? formatFarm(new Date(dueAt), 'HH:mm') : null
}

export function WeekPlanner({
  today,
  currentPerson,
  canManageProjects,
  initialGroups,
  initialWeeklyTasks,
  initialProjects,
  daysOffSchedule,
  showEveryoneDaysOff,
  favorites,
}: {
  today: string
  currentPerson: TaskAssignee
  canManageProjects: boolean
  initialGroups: TaskGroup[]
  initialWeeklyTasks: QueryTaskRow[]
  initialProjects: QueryTaskRow[]
  daysOffSchedule: DayOffEntry[]
  showEveryoneDaysOff: boolean
  favorites: { key: string; label: string; count: number }[]
}) {
  const [groups, setGroups] = React.useState<TaskGroup[]>(initialGroups)
  const [weeklyTasks, setWeeklyTasks] = React.useState<QueryTaskRow[]>(initialWeeklyTasks)
  const [projects, setProjects] = React.useState<QueryTaskRow[]>(initialProjects)
  const [scope, setScope] = React.useState<ScopeFilter>('everyone')
  const [selectedDate, setSelectedDate] = React.useState<string | 'all'>('all')
  const [toast, setToast] = React.useState<{ message: string; tone?: 'accent' | 'danger' } | null>(
    null
  )

  React.useEffect(() => setGroups(initialGroups), [initialGroups])
  React.useEffect(() => setWeeklyTasks(initialWeeklyTasks), [initialWeeklyTasks])
  React.useEffect(() => setProjects(initialProjects), [initialProjects])

  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  // Map date -> people with a day off
  const offByDate = React.useMemo(() => {
    const map = new Map<string, string[]>()
    for (const entry of daysOffSchedule) {
      if (!entry.off) continue
      if (!showEveryoneDaysOff && entry.off.id !== currentPerson.id) continue
      const existing = map.get(entry.date) ?? []
      if (!existing.includes(entry.off.name)) {
        existing.push(entry.off.name)
      }
      map.set(entry.date, existing)
    }
    return map
  }, [daysOffSchedule, showEveryoneDaysOff, currentPerson.id])

  const handleStatusChange = React.useCallback((taskId: string, nextDone: boolean) => {
    const nextStatus = nextDone ? 'completed' : 'assigned'
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
      }))
    )
    setWeeklyTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)))
    setProjects((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)))
  }, [])

  async function handleClaim(task: QueryTaskRow, source: 'day' | 'weekly' | 'projects') {
    const claimed: QueryTaskRow = { ...task, assignee: currentPerson }
    if (source === 'day') {
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          tasks: g.tasks.map((t) => (t.id === task.id ? claimed : t)),
        }))
      )
    } else if (source === 'weekly') {
      setWeeklyTasks((prev) => prev.map((t) => (t.id === task.id ? claimed : t)))
    } else {
      setProjects((prev) => prev.map((t) => (t.id === task.id ? claimed : t)))
    }
    setToast({ message: `Claimed "${task.title}"`, tone: 'accent' })

    const supabase = getTodoTwoBrowserClient()
    const { error } = await supabase.rpc('claim_task', { p_task_id: task.id })
    if (error) {
      if (source === 'day') {
        setGroups((prev) =>
          prev.map((g) => ({
            ...g,
            tasks: g.tasks.map((t) => (t.id === task.id ? task : t)),
          }))
        )
      } else if (source === 'weekly') {
        setWeeklyTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
      } else {
        setProjects((prev) => prev.map((t) => (t.id === task.id ? task : t)))
      }
      setToast({
        message: /already has that task/i.test(error.message)
          ? 'Someone else already took that task.'
          : 'Could not claim task.',
        tone: 'danger',
      })
    }
  }

  function filterTasks(tasks: QueryTaskRow[]): QueryTaskRow[] {
    if (scope === 'mine') return tasks.filter((t) => t.assignee?.id === currentPerson.id)
    if (scope === 'unclaimed') return tasks.filter((t) => !t.assignee && !isFinished(t.status))
    return tasks
  }

  const totalTasks = groups.reduce((sum, g) => sum + filterTasks(g.tasks).length, 0)
  const totalUnclaimed = groups.reduce(
    (sum, g) => sum + g.tasks.filter((t) => !t.assignee && !isFinished(t.status)).length,
    0
  )

  const visibleGroups =
    selectedDate === 'all' ? groups : groups.filter((g) => g.date === selectedDate)

  const openWeekly = weeklyTasks.filter((t) => t.status !== 'cancelled' && !isFinished(t.status))
  const openProjectsThisWeek = projects.filter(
    (t) => t.status !== 'cancelled' && !isFinished(t.status) && plannedThisWeek(t, today)
  )
  const openProjectsLater = projects.filter(
    (t) => t.status !== 'cancelled' && !isFinished(t.status) && !plannedThisWeek(t, today)
  )

  return (
    <div className="tt-fade-up mx-auto flex w-full max-w-4xl flex-col gap-5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tt-accent)]">
            7-Day Overview
          </p>
          <h1 className="mt-0.5 text-[26px] leading-tight text-[var(--tt-ink)]">Week Plan</h1>
          <p className="mt-1 text-[13.5px] text-[var(--tt-ink-2)]">
            See who is on what each day, spot gaps, and plan weekly farm projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusPill tone="neutral">{totalTasks} scheduled</StatusPill>
          {totalUnclaimed > 0 ? (
            <button type="button" onClick={() => setScope('unclaimed')}>
              <StatusPill tone="warn">{totalUnclaimed} unclaimed</StatusPill>
            </button>
          ) : (
            <StatusPill tone="accent">All covered</StatusPill>
          )}
        </div>
      </header>

      {/* Interactive 7-Day Strip */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedDate('all')}
          className={cn(
            'flex shrink-0 flex-col items-center justify-center rounded-2xl border px-3.5 py-2 text-center transition-all',
            selectedDate === 'all'
              ? 'border-[var(--tt-accent)] bg-[var(--tt-accent)] text-[var(--tt-on-accent)] shadow-[var(--tt-shadow-sm)]'
              : 'border-[var(--tt-rule)] bg-[var(--tt-surface)] text-[var(--tt-ink-2)] hover:border-[var(--tt-rule-strong)]'
          )}
        >
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] opacity-80">
            All
          </span>
          <span className="mt-0.5 text-[15px] font-semibold tabular-nums">{groups.length}d</span>
        </button>

        {groups.map((group) => {
          const filtered = filterTasks(group.tasks)
          const unclaimedCount = group.tasks.filter(
            (t) => !t.assignee && !isFinished(t.status)
          ).length
          const peopleOff = offByDate.get(group.date) ?? []
          const active = selectedDate === group.date
          const isToday = group.date === today
          const dayObj = farmDayStart(group.date)

          return (
            <button
              key={group.date}
              type="button"
              onClick={() => setSelectedDate(active ? 'all' : group.date)}
              className={cn(
                'flex min-w-[66px] shrink-0 flex-col items-center rounded-2xl border px-3 py-2 text-center transition-all',
                active
                  ? 'border-[var(--tt-accent)] bg-[var(--tt-accent)] text-[var(--tt-on-accent)] shadow-[var(--tt-shadow-sm)]'
                  : 'border-[var(--tt-rule)] bg-[var(--tt-surface)] text-[var(--tt-ink)] hover:border-[var(--tt-accent)]'
              )}
            >
              <span
                className={cn(
                  'text-[10.5px] font-semibold uppercase tracking-[0.06em]',
                  active
                    ? 'text-[var(--tt-on-accent)]/85'
                    : isToday
                      ? 'text-[var(--tt-accent)]'
                      : 'text-[var(--tt-ink-3)]'
                )}
              >
                {isToday ? 'Today' : formatFarm(dayObj, 'EEE')}
              </span>
              <span className="mt-0.5 text-[16px] font-semibold tabular-nums leading-tight">
                {formatFarm(dayObj, 'd')}
              </span>
              <div className="mt-1 flex items-center gap-1">
                <span
                  className={cn(
                    'text-[11px] font-medium tabular-nums',
                    active ? 'text-[var(--tt-on-accent)]/90' : 'text-[var(--tt-ink-3)]'
                  )}
                >
                  {filtered.length}
                </span>
                {unclaimedCount > 0 ? (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[var(--tt-warn)]"
                    title={`${unclaimedCount} unclaimed`}
                  />
                ) : null}
                {peopleOff.length > 0 ? (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[var(--tt-accent)] opacity-60"
                    title={`Off: ${peopleOff.join(', ')}`}
                  />
                ) : null}
              </div>
            </button>
          )
        })}
      </div>

      {/* Scope Switcher */}
      <div
        role="tablist"
        aria-label="Filter week by owner"
        className="grid grid-cols-3 gap-1 rounded-2xl border border-[var(--tt-rule)] bg-[var(--tt-surface-2)]/80 p-1"
      >
        {(
          [
            { key: 'everyone', label: 'Whole Farm', icon: Users },
            { key: 'mine', label: 'My Week', icon: CalendarDays },
            { key: 'unclaimed', label: `Unclaimed (${totalUnclaimed})`, icon: Hand },
          ] as const
        ).map((item) => {
          const active = scope === item.key
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setScope(item.key)}
              className={cn(
                'flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-[13px] font-medium transition-all',
                active
                  ? 'bg-[var(--tt-surface)] font-semibold text-[var(--tt-ink)] shadow-[var(--tt-shadow-sm)]'
                  : 'text-[var(--tt-ink-2)] hover:text-[var(--tt-ink)]'
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Day-by-day Schedule */}
      <div className="flex flex-col gap-4">
        {visibleGroups.map((group) => {
          const tasks = filterTasks(group.tasks)
          const peopleOff = offByDate.get(group.date) ?? []
          const dayObj = farmDayStart(group.date)
          const isToday = group.date === today

          // Group by person when viewing Whole Farm
          const byPerson = new Map<string, { person: TaskAssignee | null; tasks: QueryTaskRow[] }>()
          if (scope === 'everyone') {
            for (const task of tasks) {
              const key = task.assignee?.id ?? '__unclaimed__'
              const existing = byPerson.get(key)
              if (existing) existing.tasks.push(task)
              else byPerson.set(key, { person: task.assignee ?? null, tasks: [task] })
            }
          }
          const personGroups = Array.from(byPerson.values()).sort((a, b) => {
            if (!a.person) return -1
            if (!b.person) return 1
            if (a.person.id === currentPerson.id) return -1
            if (b.person.id === currentPerson.id) return 1
            return (a.person.preferredName || a.person.fullName).localeCompare(
              b.person.preferredName || b.person.fullName
            )
          })

          return (
            <Surface key={group.date} className="p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--tt-rule)] pb-2.5">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-[16px] font-semibold text-[var(--tt-ink)]">
                    {isToday ? 'Today' : formatFarm(dayObj, 'EEEE')}
                  </h2>
                  <span className="text-[13px] text-[var(--tt-ink-3)]">
                    {formatFarm(dayObj, 'd MMM')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {peopleOff.length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tt-surface-2)] px-2.5 py-0.5 text-[11.5px] font-medium text-[var(--tt-ink-2)]">
                      <CalendarOff className="h-3 w-3 text-[var(--tt-ink-3)]" aria-hidden="true" />
                      Off: {peopleOff.join(', ')}
                    </span>
                  ) : null}
                  <StatusPill tone="neutral">
                    {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                  </StatusPill>
                </div>
              </div>

              {tasks.length === 0 ? (
                <p className="py-2 text-[13.5px] text-[var(--tt-ink-3)]">
                  {scope === 'unclaimed'
                    ? 'Everything on this day has an owner.'
                    : scope === 'mine'
                      ? 'Nothing assigned to you on this day.'
                      : 'Nothing scheduled.'}
                </p>
              ) : scope === 'everyone' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {personGroups.map(({ person, tasks: pTasks }) => (
                    <div
                      key={person?.id ?? 'unclaimed'}
                      className={cn(
                        'rounded-xl border p-3',
                        !person
                          ? 'border-[var(--tt-warn-rule)] bg-[var(--tt-warn-soft)]/35'
                          : person.id === currentPerson.id
                            ? 'border-[var(--tt-accent-ring)] bg-[var(--tt-accent-soft)]/25'
                            : 'border-[var(--tt-rule)] bg-[var(--tt-ground)]/40'
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {person ? (
                            <Avatar person={person} size={22} />
                          ) : (
                            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--tt-warn-soft)] text-[var(--tt-warn)]">
                              <Hand className="h-3 w-3" />
                            </span>
                          )}
                          <span className="truncate text-[13.5px] font-semibold text-[var(--tt-ink)]">
                            {person
                              ? person.preferredName?.trim() || person.fullName
                              : 'Unclaimed'}
                          </span>
                          {person?.id === currentPerson.id ? (
                            <span className="rounded-full bg-[var(--tt-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--tt-accent)]">
                              You
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[11.5px] tabular-nums text-[var(--tt-ink-3)]">
                          {pTasks.length}
                        </span>
                      </div>

                      <ul className="flex flex-col gap-1.5 list-none">
                        {pTasks.map((task) => {
                          const at = timeLabel(task.due_at)
                          const done = isFinished(task.status)
                          return (
                            <li
                              key={task.id}
                              className="flex items-center justify-between gap-2 text-[13px]"
                            >
                              <Link
                                href={`${TODOTWO_BASE}/tasks/${task.id}`}
                                className={cn(
                                  'flex min-w-0 flex-1 items-baseline gap-1.5 hover:text-[var(--tt-accent)]',
                                  done && 'text-[var(--tt-ink-3)] line-through'
                                )}
                              >
                                {done ? (
                                  <Check className="h-3 w-3 shrink-0 text-[var(--tt-accent)]" />
                                ) : null}
                                {at ? (
                                  <span className="shrink-0 text-[11.5px] font-medium tabular-nums text-[var(--tt-ink-3)]">
                                    {at}
                                  </span>
                                ) : null}
                                <span className="truncate">{task.title}</span>
                              </Link>
                              {!person && !done ? (
                                <button
                                  type="button"
                                  onClick={() => void handleClaim(task, 'day')}
                                  className="shrink-0 rounded-lg bg-[var(--tt-surface)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--tt-accent)] shadow-[var(--tt-shadow-xs)] hover:bg-[var(--tt-accent)] hover:text-[var(--tt-on-accent)]"
                                >
                                  Take
                                </button>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="list-none">
                  {tasks.map((task) =>
                    scope === 'unclaimed' ? (
                      <li
                        key={task.id}
                        className="flex items-center justify-between gap-3 border-b border-[var(--tt-rule)] py-3 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`${TODOTWO_BASE}/tasks/${task.id}`}
                            className="block truncate text-[14.5px] font-medium text-[var(--tt-ink)] hover:text-[var(--tt-accent)]"
                          >
                            {task.title}
                          </Link>
                          {timeLabel(task.due_at) ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-[12px] tabular-nums text-[var(--tt-ink-3)]">
                              <Clock className="h-3 w-3" />
                              {timeLabel(task.due_at)}
                            </span>
                          ) : null}
                        </div>
                        <Button
                          size="sm"
                          variant="soft"
                          onClick={() => void handleClaim(task, 'day')}
                        >
                          Take it
                        </Button>
                      </li>
                    ) : (
                      <TaskRow
                        key={task.id}
                        task={task}
                        timeLabel={timeLabel(task.due_at)}
                        hideAssignee
                        onStatusChange={handleStatusChange}
                      />
                    )
                  )}
                </ul>
              )}
            </Surface>
          )
        })}
      </div>

      {/* Weekly Tasks & Farm Projects Planner */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Surface className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-3)]">
              Weekly farm tasks
            </h2>
            <StatusPill tone="neutral">{openWeekly.length} open</StatusPill>
          </div>
          {openWeekly.length === 0 ? (
            <EmptyState
              title="All weekly tasks done"
              className="border-0 bg-transparent py-6"
            />
          ) : (
            <ul className="list-none divide-y divide-[var(--tt-rule)]">
              {openWeekly.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`${TODOTWO_BASE}/tasks/${task.id}`}
                      className="block truncate text-[14px] font-medium text-[var(--tt-ink)] hover:text-[var(--tt-accent)]"
                    >
                      {task.title}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--tt-ink-3)]">
                      {task.assignee ? (
                        <span className="inline-flex items-center gap-1">
                          <Avatar person={task.assignee} size={16} />
                          {task.assignee.preferredName?.trim() || task.assignee.fullName}
                        </span>
                      ) : (
                        <span className="font-medium text-[var(--tt-warn)]">Unclaimed</span>
                      )}
                    </div>
                  </div>
                  {!task.assignee ? (
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() => void handleClaim(task, 'weekly')}
                    >
                      Take
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <Surface className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-[var(--tt-accent)]" aria-hidden="true" />
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-3)]">
                Projects this week
              </h2>
            </div>
            <Link
              href={todoTwoRoutes.projects()}
              className="text-[12.5px] font-medium text-[var(--tt-accent)] hover:underline"
            >
              Backlog ({openProjectsLater.length})
            </Link>
          </div>

          {openProjectsThisWeek.length === 0 ? (
            <p className="py-2 text-[13.5px] text-[var(--tt-ink-3)]">
              No projects scheduled for this week yet.
            </p>
          ) : (
            <ul className="list-none divide-y divide-[var(--tt-rule)]">
              {openProjectsThisWeek.map((task) => (
                <li key={task.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`${TODOTWO_BASE}/tasks/${task.id}`}
                        className="block text-[14px] font-medium text-[var(--tt-ink)] hover:text-[var(--tt-accent)]"
                      >
                        {task.title}
                      </Link>
                      <p className="mt-0.5 text-[12px] text-[var(--tt-ink-3)]">
                        {projectPlanLabel(task)}
                      </p>
                    </div>
                    {!task.assignee ? (
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() => void handleClaim(task, 'projects')}
                      >
                        Take
                      </Button>
                    ) : (
                      <Avatar person={task.assignee} size={22} />
                    )}
                  </div>
                  {canManageProjects ||
                  task.created_by_person_id === currentPerson.id ||
                  task.assignee?.id === currentPerson.id ? (
                    <ProjectForm task={task} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-[var(--tt-rule)] pt-1">
            <ProjectForm />
          </div>
        </Surface>
      </div>

      {/* Quick Saved Views (Favorites) */}
      {favorites.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
            Quick views
          </h2>
          <div className="flex flex-wrap gap-2">
            {favorites.map((view) => (
              <Link
                key={view.key}
                href={todoTwoRoutes.favorites(view.key)}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--tt-rule)] bg-[var(--tt-surface)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--tt-ink-2)] shadow-[var(--tt-shadow-xs)] transition-colors hover:border-[var(--tt-accent)] hover:text-[var(--tt-ink)]"
              >
                <span>{view.label}</span>
                <span className="rounded-full bg-[var(--tt-surface-2)] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--tt-ink)]">
                  {view.count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-[13px] font-medium shadow-[var(--tt-shadow-float)] md:bottom-6',
            toast.tone === 'danger'
              ? 'bg-[var(--tt-danger)] text-[var(--tt-on-accent)]'
              : 'bg-[var(--tt-ink)] text-[var(--tt-surface)]'
          )}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  )
}
