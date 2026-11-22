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
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
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

interface SuggestedAssignment {
  taskId: string
  personId: string
  reason: string
}

function timeLabel(dueAt: string | null): string | null {
  return dueAt ? formatFarm(new Date(dueAt), 'HH:mm') : null
}

function sortTasks(tasks: QueryTaskRow[]): QueryTaskRow[] {
  return [...tasks].sort((a, b) => {
    if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at)
    if (a.due_at) return -1
    if (b.due_at) return 1
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.title.localeCompare(b.title)
  })
}

export function WeekPlanner({
  today,
  currentPerson,
  farmPeople,
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
  farmPeople: TaskAssignee[]
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
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null)

  // Auto-fill unclaimed preview/apply state (staff only)
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [applyingPlan, setApplyingPlan] = React.useState(false)
  const [suggestedPlan, setSuggestedPlan] = React.useState<SuggestedAssignment[] | null>(null)
  const [unassignableCount, setUnassignableCount] = React.useState(0)

  const [toast, setToast] = React.useState<{ message: string; tone?: 'accent' | 'danger' } | null>(
    null
  )

  React.useEffect(() => setGroups(initialGroups), [initialGroups])
  React.useEffect(() => setWeeklyTasks(initialWeeklyTasks), [initialWeeklyTasks])
  React.useEffect(() => setProjects(initialProjects), [initialProjects])

  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(timer)
  }, [toast])

  const personById = React.useMemo(() => {
    const map = new Map<string, TaskAssignee>()
    for (const p of farmPeople) map.set(p.id, p)
    map.set(currentPerson.id, currentPerson)
    return map
  }, [farmPeople, currentPerson])

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

  // Instant 0 ms owner reassignment (staff)
  async function handleReassign(task: QueryTaskRow, nextPersonId: string) {
    const nextAssignee = nextPersonId ? (personById.get(nextPersonId) ?? null) : null
    const updated: QueryTaskRow = { ...task, assignee: nextAssignee }

    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) => (t.id === task.id ? updated : t)),
      }))
    )
    setWeeklyTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
    setProjects((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
    setToast({
      message: nextAssignee
        ? `Assigned "${task.title}" to ${nextAssignee.preferredName || nextAssignee.fullName}`
        : `Released "${task.title}" to Up for grabs`,
      tone: 'accent',
    })

    const { error } = await getTodoTwoBrowserClient().rpc('assign_task', {
      p_task_id: task.id,
      p_person_id: nextPersonId || null,
    })
    if (error) {
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          tasks: g.tasks.map((t) => (t.id === task.id ? task : t)),
        }))
      )
      setWeeklyTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
      setProjects((prev) => prev.map((t) => (t.id === task.id ? task : t)))
      setToast({ message: error.message || 'Could not reassign task.', tone: 'danger' })
    }
  }

  // Instant 0 ms day mover (staff)
  async function handleMoveDay(task: QueryTaskRow, fromDate: string, toDate: string) {
    if (!toDate || toDate === fromDate) return
    const movedTask: QueryTaskRow = { ...task, due_date: toDate }

    setGroups((prev) =>
      prev.map((g) => {
        if (g.date === fromDate) {
          return { ...g, tasks: g.tasks.filter((t) => t.id !== task.id) }
        }
        if (g.date === toDate) {
          return { ...g, tasks: sortTasks([...g.tasks, movedTask]) }
        }
        return g
      })
    )
    setEditingTaskId(null)
    setToast({
      message: `Moved "${task.title}" to ${formatFarm(farmDayStart(toDate), 'EEE d MMM')}`,
      tone: 'accent',
    })

    const db = getTodoTwoBrowserClient()
    const { error } = task.series_id
      ? await db.rpc('reschedule_occurrence', { p_task_id: task.id, p_new_date: toDate })
      : await db.from('tasks').update({ due_date: toDate }).eq('id', task.id)

    if (error) {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.date === toDate) {
            return { ...g, tasks: g.tasks.filter((t) => t.id !== task.id) }
          }
          if (g.date === fromDate) {
            return { ...g, tasks: sortTasks([...g.tasks, task]) }
          }
          return g
        })
      )
      setToast({ message: error.message || 'Could not move task.', tone: 'danger' })
    }
  }

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

  // One-click Auto-fill Unclaimed (preview -> approve)
  async function handlePreviewAutoFill() {
    if (groups.length === 0 || previewLoading) return
    setPreviewLoading(true)
    setSuggestedPlan(null)
    try {
      const response = await fetch('/api/todotwo/assign/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '',
          from: groups[0].date,
          to: groups[groups.length - 1].date,
        }),
      })
      const data = (await response.json()) as {
        ok?: boolean
        message?: string
        plan?: { assignments: SuggestedAssignment[]; unassignable: unknown[] }
      }
      if (!response.ok || !data.ok || !data.plan) {
        setToast({
          message: data.message ?? 'Could not build suggestions right now.',
          tone: 'danger',
        })
        return
      }
      if (data.plan.assignments.length === 0) {
        setToast({ message: 'No assignable gaps found for this week.', tone: 'accent' })
        return
      }
      setSuggestedPlan(data.plan.assignments)
      setUnassignableCount(data.plan.unassignable.length)
    } catch {
      setToast({ message: 'Network error while building suggestions.', tone: 'danger' })
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleApplyAutoFill() {
    if (!suggestedPlan || suggestedPlan.length === 0 || applyingPlan) return
    setApplyingPlan(true)
    try {
      const response = await fetch('/api/todotwo/assign/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: suggestedPlan.map(({ taskId, personId }) => ({ taskId, personId })),
        }),
      })
      const data = (await response.json()) as {
        ok?: boolean
        applied?: { taskId: string; personId: string }[]
        message?: string
      }
      if (!response.ok || !data.applied) {
        setToast({ message: data.message ?? 'Could not apply assignments.', tone: 'danger' })
        return
      }
      const appliedMap = new Map(data.applied.map((a) => [a.taskId, a.personId]))
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          tasks: g.tasks.map((t) => {
            const pid = appliedMap.get(t.id)
            if (!pid) return t
            const person = personById.get(pid)
            return person ? { ...t, assignee: person } : t
          }),
        }))
      )
      setSuggestedPlan(null)
      setToast({
        message: `Assigned ${data.applied.length} task${data.applied.length === 1 ? '' : 's'} fairly across the team`,
        tone: 'accent',
      })
    } catch {
      setToast({ message: 'Network error applying assignments.', tone: 'danger' })
    } finally {
      setApplyingPlan(false)
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
            7-Day Planner
          </p>
          <h1 className="mt-0.5 text-[26px] leading-tight text-[var(--tt-ink)]">Week Plan</h1>
          <p className="mt-1 text-[13.5px] text-[var(--tt-ink-2)]">
            Balance workload, reassign in one tap, and plan weekly farm projects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="neutral">{totalTasks} scheduled</StatusPill>
          {totalUnclaimed > 0 ? (
            <button type="button" onClick={() => setScope('unclaimed')}>
              <StatusPill tone="warn">{totalUnclaimed} unclaimed</StatusPill>
            </button>
          ) : (
            <StatusPill tone="accent">All covered</StatusPill>
          )}
          {canManageProjects && totalUnclaimed > 0 ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => void handlePreviewAutoFill()}
              disabled={previewLoading}
            >
              {previewLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {previewLoading ? 'Balancing…' : 'Auto-fill gaps'}
            </Button>
          ) : null}
        </div>
      </header>

      {/* Auto-fill preview confirmation banner */}
      {suggestedPlan ? (
        <Surface className="flex flex-col gap-3 border-[var(--tt-accent)] bg-[var(--tt-accent-soft)]/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[14px] font-semibold text-[var(--tt-ink)]">
                Suggested {suggestedPlan.length} fair assignment
                {suggestedPlan.length === 1 ? '' : 's'}
              </p>
              <p className="text-[12.5px] text-[var(--tt-ink-2)]">
                Respects days off, stays, pairings, and farm rules.
                {unassignableCount > 0
                  ? ` ${unassignableCount} task${unassignableCount === 1 ? '' : 's'} could not be placed.`
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => void handleApplyAutoFill()}
                disabled={applyingPlan}
              >
                {applyingPlan ? 'Applying…' : 'Apply all'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSuggestedPlan(null)}
                disabled={applyingPlan}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </Surface>
      ) : null}

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
                          const isEditing = editingTaskId === task.id
                          return (
                            <li key={task.id} className="flex flex-col gap-1.5 text-[13px]">
                              <div className="flex items-center justify-between gap-2">
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

                                <div className="flex shrink-0 items-center gap-1">
                                  {!person && !done ? (
                                    <button
                                      type="button"
                                      onClick={() => void handleClaim(task, 'day')}
                                      className="rounded-lg bg-[var(--tt-surface)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--tt-accent)] shadow-[var(--tt-shadow-xs)] hover:bg-[var(--tt-accent)] hover:text-[var(--tt-on-accent)]"
                                    >
                                      Take
                                    </button>
                                  ) : null}
                                  {canManageProjects && !done ? (
                                    <button
                                      type="button"
                                      aria-label={`Reassign or move ${task.title}`}
                                      onClick={() =>
                                        setEditingTaskId(isEditing ? null : task.id)
                                      }
                                      className={cn(
                                        'flex h-6 w-6 items-center justify-center rounded-lg transition-colors',
                                        isEditing
                                          ? 'bg-[var(--tt-accent)] text-[var(--tt-on-accent)]'
                                          : 'text-[var(--tt-ink-3)] hover:bg-[var(--tt-surface)] hover:text-[var(--tt-ink)]'
                                      )}
                                    >
                                      {isEditing ? (
                                        <X className="h-3 w-3" />
                                      ) : (
                                        <SlidersHorizontal className="h-3 w-3" />
                                      )}
                                    </button>
                                  ) : null}
                                </div>
                              </div>

                              {/* 1-Tap Inline Reassign & Move Day (#5) */}
                              {isEditing && canManageProjects ? (
                                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] p-2 shadow-[var(--tt-shadow-xs)]">
                                  <select
                                    aria-label="Assign owner"
                                    value={task.assignee?.id ?? ''}
                                    onChange={(e) => void handleReassign(task, e.target.value)}
                                    className="min-h-[32px] rounded-lg border border-[var(--tt-rule)] bg-[var(--tt-ground)] px-2 text-[12px] font-medium text-[var(--tt-ink)]"
                                  >
                                    <option value="">Unclaimed</option>
                                    {farmPeople.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.preferredName?.trim() || p.fullName}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    aria-label="Move to day"
                                    value={group.date}
                                    onChange={(e) =>
                                      void handleMoveDay(task, group.date, e.target.value)
                                    }
                                    className="min-h-[32px] rounded-lg border border-[var(--tt-rule)] bg-[var(--tt-ground)] px-2 text-[12px] font-medium text-[var(--tt-ink)]"
                                  >
                                    {groups.map((g) => (
                                      <option key={g.date} value={g.date}>
                                        {g.date === today
                                          ? 'Today'
                                          : formatFarm(farmDayStart(g.date), 'EEE d MMM')}
                                      </option>
                                    ))}
                                  </select>
                                </div>
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
                        className="flex flex-col gap-2.5 border-b border-[var(--tt-rule)] py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`${TODOTWO_BASE}/tasks/${task.id}`}
                            className="block text-[15px] font-medium leading-snug text-[var(--tt-ink)] hover:text-[var(--tt-accent)]"
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
                        <div className="flex shrink-0 items-center gap-2">
                          {canManageProjects ? (
                            <select
                              aria-label={`Assign ${task.title}`}
                              value=""
                              onChange={(e) => {
                                if (e.target.value) void handleReassign(task, e.target.value)
                              }}
                              className="min-h-[36px] flex-1 rounded-xl border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2.5 text-[13px] font-medium text-[var(--tt-ink-2)] sm:flex-none"
                            >
                              <option value="">Assign…</option>
                              {farmPeople.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.preferredName?.trim() || p.fullName}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          <Button
                            size="sm"
                            variant="soft"
                            onClick={() => void handleClaim(task, 'day')}
                          >
                            Take it
                          </Button>
                        </div>
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
                      className="block text-[14.5px] font-medium leading-snug text-[var(--tt-ink)] hover:text-[var(--tt-accent)]"
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
