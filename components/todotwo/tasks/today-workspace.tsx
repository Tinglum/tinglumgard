'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CalendarRange,
  Check,
  CheckCircle2,
  Clock,
  FolderKanban,
  Hand,
  Megaphone,
  Moon,
  Sparkles,
  Sun,
  Sunrise,
  Users,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Avatar } from '@/components/todotwo/ui/avatar'
import { Button } from '@/components/todotwo/ui/button'
import { EmptyState, StatusPill, Surface } from '@/components/todotwo/ui/states'
import { TaskRow, type YesterdayResponsibleInfo } from '@/components/todotwo/tasks/task-row'
import { AskForHelp } from '@/components/todotwo/tasks/ask-for-help'
import { OpenHelpRequests, type OpenHelpRequest } from '@/components/todotwo/tasks/open-help-requests'
import { ProjectForm } from '@/components/todotwo/tasks/project-form'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { isFinished } from '@/lib/todotwo/domain/task-status'
import { plannedThisWeek, projectPlanLabel } from '@/lib/todotwo/domain/project-planning'
import { farmWeek } from '@/lib/todotwo/domain/weekly-projects'
import { addFarmDays, farmDayStart, formatFarm } from '@/lib/todotwo/time'
import { TODOTWO_BASE, todoTwoRoutes } from '@/lib/todotwo/routes'
import type { BarnNote, TaskAssignee, TaskRow as QueryTaskRow } from '@/lib/todotwo/queries'

type WorkspaceTab = 'my-day' | 'team' | 'week'
type DaySlot = 'morning' | 'afternoon' | 'evening' | 'anytime'

const DAY_SLOTS: { key: DaySlot; label: string; range: string }[] = [
  { key: 'morning', label: 'Morning', range: 'Before 12:00' },
  { key: 'afternoon', label: 'Afternoon', range: '12:00–17:00' },
  { key: 'evening', label: 'Evening', range: '17:00+' },
  { key: 'anytime', label: 'Anytime', range: 'Flexible' },
]

function timeLabel(dueAt: string | null): string | null {
  return dueAt ? formatFarm(new Date(dueAt), 'HH:mm') : null
}

function slotForTask(dueAt: string | null): DaySlot {
  if (!dueAt) return 'anytime'
  const hour = Number(formatFarm(new Date(dueAt), 'HH'))
  if (Number.isNaN(hour)) return 'anytime'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function currentDaySlot(farmHour: number): DaySlot {
  if (farmHour < 12) return 'morning'
  if (farmHour < 17) return 'afternoon'
  return 'evening'
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

export function TodayWorkspace({
  dateHeading,
  greeting,
  today,
  farmHour,
  currentPerson,
  canManageProjects,
  initialBarnNote,
  initialOverdue,
  initialMine,
  initialUnclaimed,
  initialDoneToday,
  initialEveryoneToday,
  initialEveryoneYesterday,
  initialWeeklyTasks,
  initialProjects,
  initialHelpRequests,
  dailySeriesIds,
  olderOpenCount,
}: {
  dateHeading: string
  greeting: string
  today: string
  farmHour: number
  currentPerson: TaskAssignee
  canManageProjects: boolean
  initialBarnNote: BarnNote | null
  initialOverdue: QueryTaskRow[]
  initialMine: QueryTaskRow[]
  initialUnclaimed: QueryTaskRow[]
  initialDoneToday: QueryTaskRow[]
  initialEveryoneToday: QueryTaskRow[]
  initialEveryoneYesterday: QueryTaskRow[]
  initialWeeklyTasks: QueryTaskRow[]
  initialProjects: QueryTaskRow[]
  initialHelpRequests: OpenHelpRequest[]
  dailySeriesIds: string[]
  olderOpenCount: number
}) {
  const [tab, setTab] = React.useState<WorkspaceTab>('my-day')
  const [teamDay, setTeamDay] = React.useState<'today' | 'yesterday'>('today')
  const [teamFilter, setTeamFilter] = React.useState<'all' | 'active' | 'done'>('all')
  const [teamSlot, setTeamSlot] = React.useState<'all' | DaySlot>('all')
  const [showDone, setShowDone] = React.useState(false)
  const [barnNote, setBarnNote] = React.useState<BarnNote | null>(initialBarnNote)
  const [composingNote, setComposingNote] = React.useState(false)
  const [noteTitle, setNoteTitle] = React.useState('')
  const [noteBody, setNoteBody] = React.useState('')
  const [savingNote, setSavingNote] = React.useState(false)
  const [toast, setToast] = React.useState<{ message: string; tone?: 'accent' | 'danger' } | null>(
    null
  )

  const nowSlot = currentDaySlot(farmHour)

  const [overdue, setOverdue] = React.useState<QueryTaskRow[]>(initialOverdue)
  const [mine, setMine] = React.useState<QueryTaskRow[]>(initialMine)
  const [unclaimed, setUnclaimed] = React.useState<QueryTaskRow[]>(initialUnclaimed)
  const [doneToday, setDoneToday] = React.useState<QueryTaskRow[]>(initialDoneToday)
  const [everyoneToday, setEveryoneToday] = React.useState<QueryTaskRow[]>(initialEveryoneToday)
  const [everyoneYesterday, setEveryoneYesterday] =
    React.useState<QueryTaskRow[]>(initialEveryoneYesterday)
  const [weeklyTasks, setWeeklyTasks] = React.useState<QueryTaskRow[]>(initialWeeklyTasks)
  const [projects, setProjects] = React.useState<QueryTaskRow[]>(initialProjects)

  // Keep state synced when server props change (e.g., after QuickAdd or ProjectForm)
  React.useEffect(() => setOverdue(initialOverdue), [initialOverdue])
  React.useEffect(() => setMine(initialMine), [initialMine])
  React.useEffect(() => setUnclaimed(initialUnclaimed), [initialUnclaimed])
  React.useEffect(() => setDoneToday(initialDoneToday), [initialDoneToday])
  React.useEffect(() => setEveryoneToday(initialEveryoneToday), [initialEveryoneToday])
  React.useEffect(() => setEveryoneYesterday(initialEveryoneYesterday), [initialEveryoneYesterday])
  React.useEffect(() => setWeeklyTasks(initialWeeklyTasks), [initialWeeklyTasks])
  React.useEffect(() => setProjects(initialProjects), [initialProjects])

  // Map series_id -> who had yesterday's occurrence and whether they completed it
  const yesterdayBySeriesId = React.useMemo(() => {
    const map = new Map<string, YesterdayResponsibleInfo>()
    for (const task of everyoneYesterday) {
      if (!task.series_id) continue
      const person = task.assignee
      map.set(task.series_id, {
        name: person ? person.preferredName?.trim() || person.fullName : null,
        completed: isFinished(task.status),
      })
    }
    return map
  }, [everyoneYesterday])

  const dailySeries = React.useMemo(() => new Set(dailySeriesIds), [dailySeriesIds])
  const askedTaskIds = React.useMemo(
    () => new Set(initialHelpRequests.filter((r) => r.isMine).map((r) => r.taskId)),
    [initialHelpRequests]
  )

  const showToast = React.useCallback((message: string, tone: 'accent' | 'danger' = 'accent') => {
    setToast({ message, tone })
  }, [])

  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(timer)
  }, [toast])

  // Instant optimistic status change across all lists (0 ms, no router.refresh)
  const handleStatusChange = React.useCallback(
    (taskId: string, nextDone: boolean) => {
      const nextStatus = nextDone ? 'completed' : 'assigned'
      const updateStatus = (list: QueryTaskRow[]) =>
        list.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))

      setEveryoneToday(updateStatus)
      setWeeklyTasks(updateStatus)
      setProjects(updateStatus)

      if (nextDone) {
        const fromOverdue = overdue.find((t) => t.id === taskId)
        const fromMine = mine.find((t) => t.id === taskId)
        const target = fromOverdue ?? fromMine
        if (fromOverdue) setOverdue((prev) => prev.filter((t) => t.id !== taskId))
        if (fromMine) setMine((prev) => prev.filter((t) => t.id !== taskId))
        if (target) {
          setDoneToday((prev) =>
            prev.some((t) => t.id === taskId)
              ? prev
              : sortTasks([...prev, { ...target, status: 'completed' }])
          )
        }
      } else {
        const fromDone = doneToday.find((t) => t.id === taskId)
        if (fromDone) {
          setDoneToday((prev) => prev.filter((t) => t.id !== taskId))
          const restored = { ...fromDone, status: 'assigned' }
          if (restored.due_date && restored.due_date < today) {
            setOverdue((prev) => sortTasks([...prev, restored]))
          } else {
            setMine((prev) => sortTasks([...prev, restored]))
          }
        }
      }
    },
    [doneToday, mine, overdue, today]
  )

  // Instant optimistic claim (0 ms UI update, background Supabase RPC)
  async function handleClaim(task: QueryTaskRow, source: 'unclaimed' | 'weekly' | 'projects') {
    const claimedTask: QueryTaskRow = { ...task, assignee: currentPerson }

    if (source === 'unclaimed') {
      setUnclaimed((prev) => prev.filter((t) => t.id !== task.id))
      setMine((prev) => sortTasks([...prev.filter((t) => t.id !== task.id), claimedTask]))
      setEveryoneToday((prev) => sortTasks([...prev.filter((t) => t.id !== task.id), claimedTask]))
    } else if (source === 'weekly') {
      setWeeklyTasks((prev) => prev.map((t) => (t.id === task.id ? claimedTask : t)))
      if (task.due_date === today) {
        setMine((prev) => sortTasks([...prev.filter((t) => t.id !== task.id), claimedTask]))
        setEveryoneToday((prev) =>
          sortTasks([...prev.filter((t) => t.id !== task.id), claimedTask])
        )
      }
    } else {
      setProjects((prev) => prev.map((t) => (t.id === task.id ? claimedTask : t)))
      setMine((prev) => sortTasks([...prev.filter((t) => t.id !== task.id), claimedTask]))
      setEveryoneToday((prev) => sortTasks([...prev.filter((t) => t.id !== task.id), claimedTask]))
    }

    showToast(`Claimed "${task.title}"`)

    const supabase = getTodoTwoBrowserClient()
    const { error } = await supabase.rpc('claim_task', { p_task_id: task.id })
    if (error) {
      // Roll back cleanly
      if (source === 'unclaimed') {
        setUnclaimed((prev) => sortTasks([...prev, task]))
        setMine((prev) => prev.filter((t) => t.id !== task.id))
        setEveryoneToday((prev) => prev.filter((t) => t.id !== task.id))
      } else if (source === 'weekly') {
        setWeeklyTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
      } else {
        setProjects((prev) => prev.map((t) => (t.id === task.id ? task : t)))
      }
      showToast(
        /already has that task/i.test(error.message)
          ? 'Someone else already claimed that task.'
          : 'Could not claim task. Please try again.',
        'danger'
      )
    }
  }

  // Instant optimistic snooze to tomorrow (0 ms UI update, background Supabase RPC)
  async function handleSnooze(task: QueryTaskRow) {
    setUnclaimed((prev) => prev.filter((t) => t.id !== task.id))
    showToast(`Moved "${task.title}" to tomorrow`)

    const supabase = getTodoTwoBrowserClient()
    const { error } = await supabase.rpc('defer_task', {
      p_task_id: task.id,
      p_new_date: addFarmDays(today, 1),
    })
    if (error) {
      setUnclaimed((prev) => sortTasks([...prev, task]))
      showToast('Could not move task to tomorrow.', 'danger')
    }
  }

  const myOpenCount = overdue.length + mine.length
  const totalMinutes = [...overdue, ...mine].reduce(
    (sum, task) => sum + (task.estimated_minutes ?? 0),
    0
  )

  const teamTotal = everyoneToday.length
  const teamDone = everyoneToday.filter((t) => isFinished(t.status)).length
  const yesterdayTotal = everyoneYesterday.length
  const yesterdayDone = everyoneYesterday.filter((t) => isFinished(t.status)).length
  const yesterdayUnclaimed = everyoneYesterday.filter((t) => !t.assignee)

  // Group everyoneToday or everyoneYesterday by person for the Farm Team view
  const activeTeamTasks = teamDay === 'yesterday' ? everyoneYesterday : everyoneToday
  const teamGroups = React.useMemo(() => {
    const map = new Map<string, { person: TaskAssignee; tasks: QueryTaskRow[] }>()
    for (const task of activeTeamTasks) {
      const person = task.assignee
      if (!person) continue
      if (teamSlot !== 'all' && slotForTask(task.due_at) !== teamSlot) continue
      const existing = map.get(person.id)
      if (existing) existing.tasks.push(task)
      else map.set(person.id, { person, tasks: [task] })
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.person.id === currentPerson.id) return -1
      if (b.person.id === currentPerson.id) return 1
      const aRem = a.tasks.filter((t) => !isFinished(t.status)).length
      const bRem = b.tasks.filter((t) => !isFinished(t.status)).length
      return bRem - aRem
    })
  }, [activeTeamTasks, currentPerson.id, teamSlot])
  async function handleAckBarnNote() {
    if (!barnNote) return
    const current = barnNote
    setBarnNote(null)
    showToast('Barn note marked as read')

    const { error } = await getTodoTwoBrowserClient()
      .from('announcement_acknowledgements')
      .upsert(
        { announcement_id: current.id, person_id: currentPerson.id },
        { onConflict: 'announcement_id,person_id' }
      )
    if (error) {
      setBarnNote(current)
      showToast('Could not dismiss note.', 'danger')
    }
  }

  async function handlePostBarnNote(event: React.FormEvent) {
    event.preventDefault()
    const cleanTitle = noteTitle.trim()
    if (!cleanTitle || savingNote) return
    setSavingNote(true)
    const cleanBody = noteBody.trim() || cleanTitle

    const { data, error } = await getTodoTwoBrowserClient()
      .from('announcements')
      .insert({
        title: cleanTitle,
        body: cleanBody,
        urgency: 'important',
        author_person_id: currentPerson.id,
        published_at: new Date().toISOString(),
      })
      .select('id, published_at')
      .single()

    setSavingNote(false)
    if (error || !data) {
      showToast('Could not post barn note.', 'danger')
      return
    }

    setBarnNote({
      id: data.id as string,
      title: cleanTitle,
      body: cleanBody,
      urgency: 'important',
      publishedAt: (data.published_at as string) ?? new Date().toISOString(),
      authorName: currentPerson.preferredName?.trim() || currentPerson.fullName,
    })
    setNoteTitle('')
    setNoteBody('')
    setComposingNote(false)
    showToast('Barn note pinned for the team')
  }

  // Group My Day chores into Morning / Afternoon / Evening / Anytime (#8)
  const mineBySlot = React.useMemo(() => {
    const map = new Map<DaySlot, QueryTaskRow[]>()
    for (const task of mine) {
      const slot = slotForTask(task.due_at)
      const list = map.get(slot) ?? []
      list.push(task)
      map.set(slot, list)
    }
    return DAY_SLOTS.map((slot) => ({
      ...slot,
      tasks: map.get(slot.key) ?? [],
    })).filter((g) => g.tasks.length > 0)
  }, [mine])

  const filteredTeamGroups = React.useMemo(() => {
    if (teamFilter === 'all') return teamGroups
    return teamGroups.filter(({ tasks }) => {
      const remaining = tasks.filter((t) => !isFinished(t.status)).length
      return teamFilter === 'active' ? remaining > 0 : remaining === 0
    })
  }, [teamGroups, teamFilter])

  const week = farmWeek(today)
  const openWeekly = weeklyTasks.filter((t) => t.status !== 'cancelled' && !isFinished(t.status))
  const openProjectsThisWeek = projects.filter(
    (t) => t.status !== 'cancelled' && !isFinished(t.status) && plannedThisWeek(t, today)
  )
  const unclaimedWeekCount =
    openWeekly.filter((t) => !t.assignee).length +
    openProjectsThisWeek.filter((t) => !t.assignee).length

  return (
    <div className="tt-fade-up mx-auto flex w-full max-w-4xl flex-col gap-5">
      {/* Hero Header */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tt-accent)]">
              {dateHeading}
            </p>
            <h1 className="mt-0.5 text-[26px] leading-tight text-[var(--tt-ink)]">{greeting}</h1>
          </div>

          <div className="flex items-center gap-2">
            {canManageProjects ? (
              <button
                type="button"
                onClick={() => setComposingNote((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 py-2 text-[13px] font-medium text-[var(--tt-ink-2)] shadow-[var(--tt-shadow-xs)] transition-colors hover:bg-[var(--tt-surface-2)] hover:text-[var(--tt-ink)]"
              >
                <Megaphone className="h-3.5 w-3.5 text-[var(--tt-accent)]" aria-hidden="true" />
                Barn note
              </button>
            ) : null}
            <Link
              href={todoTwoRoutes.upcoming()}
              className="hidden items-center gap-1.5 rounded-xl border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3.5 py-2 text-[13px] font-medium text-[var(--tt-ink)] shadow-[var(--tt-shadow-xs)] transition-colors hover:bg-[var(--tt-surface-2)] sm:inline-flex"
            >
              <CalendarRange className="h-4 w-4 text-[var(--tt-accent)]" aria-hidden="true" />
              Plan week
            </Link>
          </div>
        </div>

        {/* Quick Barn Note Composer (staff) */}
        {composingNote && canManageProjects ? (
          <Surface className="border-[var(--tt-accent-ring)] p-3.5">
            <form onSubmit={(e) => void handlePostBarnNote(e)} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--tt-accent)]">
                  Pin a barn note for today
                </p>
                <button
                  type="button"
                  onClick={() => setComposingNote(false)}
                  aria-label="Close barn note"
                  className="rounded-lg p-1 text-[var(--tt-ink-3)] hover:bg-[var(--tt-surface-2)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g., Dinner at 19:00 · North pasture gate battery low"
                maxLength={200}
                required
                className="min-h-[40px] w-full rounded-xl border border-[var(--tt-rule-strong)] bg-[var(--tt-ground)]/60 px-3 text-[14px] text-[var(--tt-ink)] focus:border-[var(--tt-accent)] focus:bg-[var(--tt-surface)] focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <input
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Optional extra details…"
                  maxLength={500}
                  className="min-h-[36px] flex-1 rounded-xl border border-[var(--tt-rule)] bg-[var(--tt-ground)]/40 px-3 text-[13px] text-[var(--tt-ink)] focus:border-[var(--tt-accent)] focus:bg-[var(--tt-surface)] focus:outline-none"
                />
                <Button type="submit" size="sm" disabled={savingNote || !noteTitle.trim()}>
                  {savingNote ? 'Pinning…' : 'Pin note'}
                </Button>
              </div>
            </form>
          </Surface>
        ) : null}

        {/* Active Pinned Barn Note Banner (#10) */}
        {barnNote ? (
          <Surface
            className={cn(
              'flex items-start justify-between gap-3 p-3.5 sm:px-4',
              barnNote.urgency === 'urgent'
                ? 'border-[var(--tt-danger-rule)] bg-[var(--tt-danger-soft)]/55'
                : 'border-[var(--tt-accent-ring)] bg-[var(--tt-accent-soft)]/55'
            )}
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <Megaphone
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  barnNote.urgency === 'urgent'
                    ? 'text-[var(--tt-danger)]'
                    : 'text-[var(--tt-accent)]'
                )}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[var(--tt-ink)]">{barnNote.title}</p>
                {barnNote.body && barnNote.body !== barnNote.title ? (
                  <p className="mt-0.5 text-[13px] text-[var(--tt-ink-2)]">{barnNote.body}</p>
                ) : null}
                {barnNote.authorName ? (
                  <p className="mt-0.5 text-[11.5px] text-[var(--tt-ink-3)]">
                    Note from {barnNote.authorName}
                  </p>
                ) : null}
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleAckBarnNote()}
              className="shrink-0"
            >
              Got it
            </Button>
          </Surface>
        ) : null}

        {/* Live Status Summary Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('my-day')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors',
              myOpenCount === 0
                ? 'bg-[var(--tt-accent-soft)] text-[var(--tt-accent)]'
                : 'border border-[var(--tt-rule)] bg-[var(--tt-surface)] text-[var(--tt-ink)] shadow-[var(--tt-shadow-xs)]'
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--tt-accent)]" aria-hidden="true" />
            {myOpenCount === 0
              ? 'All caught up'
              : `${myOpenCount} left${totalMinutes > 0 ? ` · ~${totalMinutes}m` : ''}`}
          </button>

          <button
            type="button"
            onClick={() => {
              setTeamDay('today')
              setTab('team')
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--tt-rule)] bg-[var(--tt-surface)] px-3 py-1 text-[12.5px] font-medium text-[var(--tt-ink-2)] shadow-[var(--tt-shadow-xs)] transition-colors hover:border-[var(--tt-accent)] hover:text-[var(--tt-ink)]"
          >
            <Users className="h-3.5 w-3.5 text-[var(--tt-accent)]" aria-hidden="true" />
            Today: <span className="font-semibold tabular-nums text-[var(--tt-ink)]">{teamDone}/{teamTotal}</span> done
          </button>

          {yesterdayTotal > 0 ? (
            <button
              type="button"
              onClick={() => {
                setTeamDay('yesterday')
                setTab('team')
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--tt-rule)] bg-[var(--tt-surface)] px-3 py-1 text-[12.5px] font-medium text-[var(--tt-ink-2)] shadow-[var(--tt-shadow-xs)] transition-colors hover:border-[var(--tt-accent)] hover:text-[var(--tt-ink)]"
            >
              <Clock className="h-3.5 w-3.5 text-[var(--tt-ink-3)]" aria-hidden="true" />
              Yesterday:{' '}
              <span className="font-semibold tabular-nums text-[var(--tt-ink)]">
                {yesterdayDone}/{yesterdayTotal}
              </span>{' '}
              done
            </button>
          ) : null}

          {unclaimed.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setTab('my-day')
                setTimeout(() => {
                  document.getElementById('up-for-grabs')?.scrollIntoView({ behavior: 'smooth' })
                }, 40)
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--tt-warn-rule)] bg-[var(--tt-warn-soft)] px-3 py-1 text-[12.5px] font-semibold text-[var(--tt-warn)] transition-opacity hover:opacity-90"
            >
              <Hand className="h-3.5 w-3.5" aria-hidden="true" />
              {unclaimed.length} up for grabs
            </button>
          ) : null}
        </div>
      </header>

      {/* Instant View Switcher (0 ms client tabs) */}
      <div
        role="tablist"
        aria-label="Today views"
        className="grid grid-cols-3 gap-1 rounded-2xl border border-[var(--tt-rule)] bg-[var(--tt-surface-2)]/80 p-1"
      >
        {(
          [
            {
              key: 'my-day',
              label: 'My Day',
              count: myOpenCount,
            },
            {
              key: 'team',
              label: 'Farm Team',
              count: teamGroups.length,
            },
            {
              key: 'week',
              label: 'This Week',
              count: openWeekly.length + openProjectsThisWeek.length,
            },
          ] as const
        ).map((item) => {
          const active = tab === item.key
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.key)}
              className={cn(
                'flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-[13.5px] font-medium transition-all',
                active
                  ? 'bg-[var(--tt-surface)] font-semibold text-[var(--tt-ink)] shadow-[var(--tt-shadow-sm)]'
                  : 'text-[var(--tt-ink-2)] hover:text-[var(--tt-ink)]'
              )}
            >
              <span>{item.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none',
                  active
                    ? 'bg-[var(--tt-accent-soft)] text-[var(--tt-accent)]'
                    : 'bg-[var(--tt-surface)]/70 text-[var(--tt-ink-3)]'
                )}
              >
                {item.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* TAB 1: MY DAY */}
      {tab === 'my-day' ? (
        <div className="flex flex-col gap-5">
          {initialHelpRequests.length > 0 ? (
            <OpenHelpRequests requests={initialHelpRequests} />
          ) : null}

          {overdue.length > 0 ? (
            <Surface className="border-[var(--tt-danger-rule)] p-4 sm:p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[var(--tt-danger)]" aria-hidden="true" />
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-danger)]">
                    Overdue
                  </h2>
                </div>
                <StatusPill tone="danger">{overdue.length}</StatusPill>
              </div>
              <ul className="list-none">
                {overdue.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    timeLabel={timeLabel(task.due_at)}
                    hideAssignee
                    onStatusChange={handleStatusChange}
                    helpAction={
                      <AskForHelp taskId={task.id} alreadyAsked={askedTaskIds.has(task.id)} />
                    }
                  />
                ))}
              </ul>
            </Surface>
          ) : null}

          {/* My Daily Chores */}
          <Surface className="p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-3)]">
                My chores today
              </h2>
              {mine.length > 0 ? (
                <StatusPill tone="accent">{mine.length} open</StatusPill>
              ) : null}
            </div>

            {mine.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Nothing left on your list today"
                description={
                  unclaimed.length > 0
                    ? `${unclaimed.length} unclaimed job${unclaimed.length === 1 ? '' : 's'} below if you have spare time.`
                    : 'Check Farm Team to see how everyone else is doing, or open This Week.'
                }
                className="mt-2 border-0 bg-transparent py-7"
              />
            ) : mineBySlot.length > 1 ? (
              <div className="flex flex-col gap-4 pt-1">
                {mineBySlot.map((slotGroup) => {
                  const isNow = slotGroup.key === nowSlot
                  const SlotIcon =
                    slotGroup.key === 'morning'
                      ? Sunrise
                      : slotGroup.key === 'afternoon'
                        ? Sun
                        : slotGroup.key === 'evening'
                          ? Moon
                          : Clock
                  return (
                    <div key={slotGroup.key} className="flex flex-col">
                      <div className="mb-1 flex items-center gap-2">
                        <SlotIcon
                          className={cn(
                            'h-3.5 w-3.5',
                            isNow ? 'text-[var(--tt-accent)]' : 'text-[var(--tt-ink-3)]'
                          )}
                          aria-hidden="true"
                        />
                        <span className="text-[12px] font-semibold text-[var(--tt-ink-2)]">
                          {slotGroup.label}
                        </span>
                        <span className="text-[11.5px] text-[var(--tt-ink-3)]">
                          {slotGroup.range}
                        </span>
                        {isNow ? <StatusPill tone="accent">Now</StatusPill> : null}
                      </div>
                      <ul className="list-none">
                        {slotGroup.tasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            timeLabel={timeLabel(task.due_at)}
                            hideAssignee
                            yesterdayInfo={
                              task.series_id ? (yesterdayBySeriesId.get(task.series_id) ?? null) : null
                            }
                            onStatusChange={handleStatusChange}
                            helpAction={
                              <AskForHelp
                                taskId={task.id}
                                alreadyAsked={askedTaskIds.has(task.id)}
                              />
                            }
                          />
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            ) : (
              <ul className="list-none">
                {mine.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    timeLabel={timeLabel(task.due_at)}
                    hideAssignee
                    yesterdayInfo={
                      task.series_id ? (yesterdayBySeriesId.get(task.series_id) ?? null) : null
                    }
                    onStatusChange={handleStatusChange}
                    helpAction={
                      <AskForHelp taskId={task.id} alreadyAsked={askedTaskIds.has(task.id)} />
                    }
                  />
                ))}
              </ul>
            )}
          </Surface>

          {/* Up for grabs */}
          {unclaimed.length > 0 ? (
            <Surface
              id="up-for-grabs"
              className="scroll-mt-20 border-[var(--tt-warn-rule)] p-4 sm:p-5"
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hand className="h-4 w-4 text-[var(--tt-warn)]" aria-hidden="true" />
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-warn)]">
                    Up for grabs
                  </h2>
                </div>
                <StatusPill tone="warn">{unclaimed.length} unclaimed</StatusPill>
              </div>
              <p className="mb-2 text-[12.5px] text-[var(--tt-ink-2)]">
                Due today with no owner yet. Tap to claim instantly.
              </p>

              <ul className="list-none divide-y divide-[var(--tt-rule)]">
                {unclaimed.map((task) => {
                  const at = timeLabel(task.due_at)
                  const isDaily = Boolean(task.series_id && dailySeries.has(task.series_id))
                  const yInfo = task.series_id ? yesterdayBySeriesId.get(task.series_id) : null
                  return (
                    <li
                      key={task.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-2 last:pb-1"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`${TODOTWO_BASE}/tasks/${task.id}`}
                          className="block truncate text-[14.5px] font-medium text-[var(--tt-ink)] hover:text-[var(--tt-accent)]"
                        >
                          {task.title}
                        </Link>
                        {at || task.estimated_minutes || yInfo ? (
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[var(--tt-ink-3)]">
                            {at ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--tt-surface-2)] px-1.5 py-0.5 tabular-nums text-[var(--tt-ink-2)]">
                                <Clock className="h-3 w-3" aria-hidden="true" />
                                {at}
                              </span>
                            ) : null}
                            {task.estimated_minutes ? <span>{task.estimated_minutes} min</span> : null}
                            {yInfo ? (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium',
                                  yInfo.completed
                                    ? 'bg-[var(--tt-accent-soft)] text-[var(--tt-accent)]'
                                    : 'bg-[var(--tt-warn-soft)] text-[var(--tt-warn)]'
                                )}
                              >
                                Yesterday: {yInfo.name ?? 'Unclaimed'} ·{' '}
                                {yInfo.completed ? 'Done ✓' : 'Not completed'}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {!isDaily ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleSnooze(task)}
                          >
                            Tomorrow
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="soft"
                          onClick={() => void handleClaim(task, 'unclaimed')}
                        >
                          Take it
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Surface>
          ) : null}

          {/* Done Today (collapsible) */}
          {doneToday.length > 0 ? (
            <Surface className="p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-3)]">
                  <Check className="h-4 w-4 text-[var(--tt-accent)]" aria-hidden="true" />
                  Completed today · {doneToday.length}
                </span>
                <span className="text-[12.5px] font-medium text-[var(--tt-accent)]">
                  {showDone ? 'Hide' : 'Show'}
                </span>
              </button>

              {showDone ? (
                <ul className="mt-2 list-none">
                  {doneToday.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      timeLabel={timeLabel(task.due_at)}
                      hideAssignee
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </ul>
              ) : null}
            </Surface>
          ) : null}

          {olderOpenCount > 0 ? (
            <p className="px-1 text-[12.5px] text-[var(--tt-ink-3)]">
              {olderOpenCount} older item{olderOpenCount === 1 ? '' : 's'} still open from more than
              a month ago.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* TAB 2: FARM TEAM ("Who is doing what today & yesterday?") */}
      {tab === 'team' ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            {/* Today vs Yesterday switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-xl border border-[var(--tt-rule)] bg-[var(--tt-surface-2)]/80 p-1">
                <button
                  type="button"
                  onClick={() => setTeamDay('today')}
                  className={cn(
                    'rounded-lg px-3 py-1 text-[13px] font-medium transition-all',
                    teamDay === 'today'
                      ? 'bg-[var(--tt-surface)] font-semibold text-[var(--tt-ink)] shadow-[var(--tt-shadow-xs)]'
                      : 'text-[var(--tt-ink-2)] hover:text-[var(--tt-ink)]'
                  )}
                >
                  Today ({teamDone}/{teamTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setTeamDay('yesterday')}
                  className={cn(
                    'rounded-lg px-3 py-1 text-[13px] font-medium transition-all',
                    teamDay === 'yesterday'
                      ? 'bg-[var(--tt-surface)] font-semibold text-[var(--tt-ink)] shadow-[var(--tt-shadow-xs)]'
                      : 'text-[var(--tt-ink-2)] hover:text-[var(--tt-ink)]'
                  )}
                >
                  Yesterday ({yesterdayDone}/{yesterdayTotal})
                </button>
              </div>

              <Link
                href={
                  teamDay === 'yesterday'
                    ? `${TODOTWO_BASE}/roster?date=${addFarmDays(today, -1)}`
                    : todoTwoRoutes.roster()
                }
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--tt-accent)] hover:underline"
              >
                {teamDay === 'yesterday' ? 'Yesterday on Roster' : 'Two-day roster'}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: 'all', label: `Everyone (${teamGroups.length})` },
                    {
                      key: 'active',
                      label: teamDay === 'yesterday' ? 'Had uncompleted' : 'In progress',
                    },
                    { key: 'done', label: 'Completed all' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setTeamFilter(f.key)}
                    className={cn(
                      'rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors',
                      teamFilter === f.key
                        ? 'bg-[var(--tt-accent)] text-[var(--tt-on-accent)]'
                        : 'border border-[var(--tt-rule)] bg-[var(--tt-surface)] text-[var(--tt-ink-2)] hover:text-[var(--tt-ink)]'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Morning / Afternoon / Evening filter (#8) */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { key: 'all', label: 'All day' },
                  { key: 'morning', label: 'Morning' },
                  { key: 'afternoon', label: 'Afternoon' },
                  { key: 'evening', label: 'Evening' },
                ] as const
              ).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setTeamSlot(s.key)}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors',
                    teamSlot === s.key
                      ? 'bg-[var(--tt-accent-soft)] font-semibold text-[var(--tt-accent)]'
                      : 'text-[var(--tt-ink-3)] hover:bg-[var(--tt-surface)] hover:text-[var(--tt-ink)]'
                  )}
                >
                  {s.label}
                  {s.key === nowSlot ? ' · now' : ''}
                </button>
              ))}
            </div>
          </div>

          {teamDay === 'today' && unclaimed.length > 0 ? (
            <Surface className="flex flex-wrap items-center justify-between gap-3 border-[var(--tt-warn-rule)] bg-[var(--tt-warn-soft)]/50 px-4 py-3">
              <div className="flex items-center gap-2 text-[13.5px] font-medium text-[var(--tt-warn)]">
                <Hand className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {unclaimed.length} task{unclaimed.length === 1 ? '' : 's'} today still{' '}
                  {unclaimed.length === 1 ? 'has' : 'have'} no owner
                </span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setTab('my-day')}>
                View unclaimed
              </Button>
            </Surface>
          ) : null}

          {teamDay === 'yesterday' && yesterdayUnclaimed.length > 0 ? (
            <Surface className="border-[var(--tt-warn-rule)] bg-[var(--tt-warn-soft)]/35 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-warn)]">
                  <Hand className="h-4 w-4" aria-hidden="true" />
                  Unclaimed yesterday
                </span>
                <StatusPill tone="warn">{yesterdayUnclaimed.length}</StatusPill>
              </div>
              <ul className="flex flex-col gap-1.5 list-none">
                {yesterdayUnclaimed.map((task) => {
                  const finished = isFinished(task.status)
                  return (
                    <li key={task.id}>
                      <Link
                        href={`${TODOTWO_BASE}/tasks/${task.id}`}
                        className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-[13.5px] hover:bg-[var(--tt-surface)]"
                      >
                        <span className="font-medium text-[var(--tt-ink)]">{task.title}</span>
                        <StatusPill tone={finished ? 'accent' : 'danger'}>
                          {finished ? 'Done' : 'Not completed'}
                        </StatusPill>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Surface>
          ) : null}

          {filteredTeamGroups.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No matching team members"
              description="Try switching the filter above to see everyone working today."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredTeamGroups.map(({ person, tasks }) => {
                const doneCount = tasks.filter((t) => isFinished(t.status)).length
                const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0
                const isMe = person.id === currentPerson.id

                return (
                  <Surface
                    key={person.id}
                    className={cn(
                      'flex flex-col gap-3 p-4',
                      isMe && 'ring-1 ring-[var(--tt-accent-ring)]'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar person={person} size={34} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold text-[var(--tt-ink)]">
                            <span className="truncate">
                              {person.preferredName?.trim() || person.fullName}
                            </span>
                            {isMe ? (
                              <span className="rounded-full bg-[var(--tt-accent-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--tt-accent)]">
                                You
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[12px] tabular-nums text-[var(--tt-ink-3)]">
                            {doneCount} of {tasks.length} done
                          </p>
                        </div>
                      </div>

                      <StatusPill tone={doneCount === tasks.length ? 'accent' : 'neutral'}>
                        {pct}%
                      </StatusPill>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--tt-surface-2)]">
                      <div
                        className="h-full rounded-full bg-[var(--tt-accent)] transition-[width] duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <ul className="flex flex-col gap-1.5 list-none">
                      {tasks.map((task) => {
                        const finished = isFinished(task.status)
                        const at = timeLabel(task.due_at)
                        const completedAt = task.completed_at
                          ? formatFarm(new Date(task.completed_at), 'HH:mm')
                          : null
                        return (
                          <li key={task.id}>
                            <Link
                              href={`${TODOTWO_BASE}/tasks/${task.id}`}
                              className="flex items-start gap-2 rounded-xl px-2 py-1.5 text-[13.5px] transition-colors hover:bg-[var(--tt-surface-2)]"
                            >
                              <span
                                className={cn(
                                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                                  finished
                                    ? 'border-[var(--tt-accent)] bg-[var(--tt-accent)] text-[var(--tt-on-accent)]'
                                    : teamDay === 'yesterday'
                                      ? 'border-[var(--tt-danger)] bg-[var(--tt-danger-soft)]'
                                      : 'border-[var(--tt-rule-strong)]'
                                )}
                              >
                                {finished ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : null}
                              </span>
                              <span
                                className={cn(
                                  'min-w-0 flex-1 leading-snug',
                                  finished
                                    ? 'text-[var(--tt-ink-3)] line-through'
                                    : 'text-[var(--tt-ink)]'
                                )}
                              >
                                {task.title}
                              </span>
                              {teamDay === 'yesterday' ? (
                                <span
                                  className={cn(
                                    'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                                    finished
                                      ? 'bg-[var(--tt-accent-soft)] text-[var(--tt-accent)]'
                                      : 'bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]'
                                  )}
                                >
                                  {finished
                                    ? completedAt
                                      ? `Done ${completedAt}`
                                      : 'Done ✓'
                                    : 'Not done'}
                                </span>
                              ) : at ? (
                                <span className="shrink-0 text-[11.5px] font-medium tabular-nums text-[var(--tt-ink-3)]">
                                  {at}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </Surface>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* TAB 3: THIS WEEK (Quick Weekly & Projects Overview) */}
      {tab === 'week' ? (
        <div className="flex flex-col gap-5">
          <Surface className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-[var(--tt-surface)] to-[var(--tt-accent-soft)]/45 p-4 sm:p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-accent)]">
                {formatFarm(farmDayStart(week.start), 'd MMM')} –{' '}
                {formatFarm(farmDayStart(week.end), 'd MMM')}
              </p>
              <h2 className="mt-0.5 text-[18px] font-semibold text-[var(--tt-ink)]">
                Weekly tasks &amp; farm projects
              </h2>
              <p className="mt-0.5 text-[13px] text-[var(--tt-ink-2)]">
                {unclaimedWeekCount > 0
                  ? `${unclaimedWeekCount} item${unclaimedWeekCount === 1 ? '' : 's'} still need an owner this week.`
                  : 'Everything this week has an owner.'}
              </p>
            </div>
            <Link
              href={todoTwoRoutes.upcoming()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--tt-accent)] px-4 py-2 text-[13.5px] font-medium text-[var(--tt-on-accent)] shadow-[var(--tt-shadow-xs)] transition-colors hover:bg-[var(--tt-accent-hover)]"
            >
              Full Week Planner
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Surface>

          {/* Weekly repeating farm tasks */}
          <Surface className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-3)]">
                Weekly farm tasks
              </h3>
              <StatusPill tone="neutral">{openWeekly.length} open</StatusPill>
            </div>

            {openWeekly.length === 0 ? (
              <p className="py-3 text-[13.5px] text-[var(--tt-ink-3)]">
                All weekly farm tasks are done for this week.
              </p>
            ) : (
              <ul className="list-none divide-y divide-[var(--tt-rule)]">
                {openWeekly.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`${TODOTWO_BASE}/tasks/${task.id}`}
                        className="block text-[14.5px] font-medium text-[var(--tt-ink)] hover:text-[var(--tt-accent)]"
                      >
                        {task.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[var(--tt-ink-3)]">
                        <span>
                          {task.due_date
                            ? formatFarm(farmDayStart(task.due_date), 'EEE d MMM')
                            : 'Any day this week'}
                        </span>
                        {task.assignee ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tt-surface-2)] py-0.5 pl-0.5 pr-2 text-[11.5px] font-medium text-[var(--tt-ink-2)]">
                            <Avatar person={task.assignee} size={16} />
                            {task.assignee.preferredName?.trim() || task.assignee.fullName}
                          </span>
                        ) : (
                          <StatusPill tone="warn">Unclaimed</StatusPill>
                        )}
                      </div>
                    </div>

                    {!task.assignee ? (
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() => void handleClaim(task, 'weekly')}
                      >
                        Take it
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Surface>

          {/* Farm projects planned this week */}
          <Surface className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-[var(--tt-accent)]" aria-hidden="true" />
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tt-ink-3)]">
                  Projects this week
                </h3>
              </div>
              <Link
                href={todoTwoRoutes.projects()}
                className="text-[12.5px] font-medium text-[var(--tt-accent)] hover:underline"
              >
                All projects ({projects.filter((p) => !isFinished(p.status)).length})
              </Link>
            </div>

            {openProjectsThisWeek.length === 0 ? (
              <p className="py-2 text-[13.5px] text-[var(--tt-ink-3)]">
                No farm projects planned for this week yet.
              </p>
            ) : (
              <ul className="list-none divide-y divide-[var(--tt-rule)]">
                {openProjectsThisWeek.map((task) => (
                  <li key={task.id} className="py-3 first:pt-1 last:pb-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`${TODOTWO_BASE}/tasks/${task.id}`}
                          className="block text-[14.5px] font-medium text-[var(--tt-ink)] hover:text-[var(--tt-accent)]"
                        >
                          {task.title}
                        </Link>
                        <p className="mt-0.5 text-[12px] text-[var(--tt-ink-3)]">
                          {projectPlanLabel(task)}
                        </p>
                        {task.assignee ? (
                          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--tt-surface-2)] py-0.5 pl-0.5 pr-2 text-[11.5px] font-medium text-[var(--tt-ink-2)]">
                            <Avatar person={task.assignee} size={16} />
                            {task.assignee.preferredName?.trim() || task.assignee.fullName}
                          </span>
                        ) : null}
                      </div>

                      {!task.assignee ? (
                        <Button
                          size="sm"
                          variant="soft"
                          onClick={() => void handleClaim(task, 'projects')}
                        >
                          Take it
                        </Button>
                      ) : null}
                    </div>
                    {canManageProjects ||
                    task.created_by_person_id === currentPerson.id ||
                    task.assignee?.id === currentPerson.id ? (
                      <div className="mt-1">
                        <ProjectForm task={task} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 border-t border-[var(--tt-rule)] pt-2">
              <ProjectForm />
            </div>
          </Surface>
        </div>
      ) : null}

      {/* Floating Instant Feedback Toast */}
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
