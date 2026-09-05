import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock, Repeat } from 'lucide-react'

import { Avatar } from '@/components/todotwo/ui/avatar'
import { StepList } from '@/components/todotwo/tasks/step-list'
import { CompleteTaskButton } from '@/components/todotwo/tasks/complete-task-button'
import { DuplicateTaskButton } from '@/components/todotwo/tasks/duplicate-task-button'
import { OccurrenceActions } from '@/components/todotwo/tasks/occurrence-actions'
import { AskForHelp } from '@/components/todotwo/tasks/ask-for-help'
import { OfferTaskButton } from '@/components/todotwo/tasks/offer-task-button'
import { PrioritySelect } from '@/components/todotwo/tasks/priority-select'
import { PrivateNote } from '@/components/todotwo/tasks/private-note'
import { Surface } from '@/components/todotwo/ui/states'
import { getTodoTwoClient } from '@/lib/todotwo/db'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import {
  getTaskDetail,
  getAssignmentHistoryForSeries,
  getCurrentAssignee,
  getCurrentAssigneePerson,
  getPeople,
} from '@/lib/todotwo/queries'
import { describeRule } from '@/lib/todotwo/domain/recurrence'
import { UI_LOCALE } from '@/lib/todotwo/copy'
import { FARM_TZ, farmDayStart, formatFarm } from '@/lib/todotwo/time'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const principal = await requireTodoTwoUser(`${TODOTWO_BASE}/tasks/${params.id}`)

  const detail = await getTaskDetail(params.id)
  if (!detail) notFound()

  const { task, steps, seriesRule, projectName } = detail
  const done = task.status === 'completed' || task.status === 'verified'

  const history = task.series_id ? await getAssignmentHistoryForSeries(task.series_id) : []

  const currentAssigneeId = await getCurrentAssignee(task.id)
  const isCurrentAssignee = currentAssigneeId !== null && currentAssigneeId === principal.person.id

  // So the page offers "ask the group" or "you have asked", never both.
  const { data: openAsk } = await getTodoTwoClient()
    .from('task_help_requests')
    .select('id')
    .eq('task_id', params.id)
    .eq('status', 'open')
    .maybeSingle()
  const hasOpenHelpRequest = openAsk !== null
  const currentAssignee = currentAssigneeId ? await getCurrentAssigneePerson(task.id) : null
  const offerCandidates = isCurrentAssignee
    ? (await getPeople())
        .filter((p) => p.id !== currentAssigneeId)
        .map((p) => ({ id: p.id, full_name: p.full_name, preferred_name: p.preferred_name }))
    : []

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link
        href={TODOTWO_BASE}
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--tt-ink-2)] hover:text-[var(--tt-ink)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Today
      </Link>

      <header className="flex flex-col gap-2">
        {projectName ? (
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--tt-accent)]">
            {projectName}
          </p>
        ) : null}

        <h1 className="text-2xl leading-tight">{task.title}</h1>

        {currentAssignee ? (
          <div className="flex items-center gap-2 text-[14px] text-[var(--tt-ink-2)]">
            <Avatar person={currentAssignee} size={36} />
            <span>{currentAssignee.preferredName?.trim() || currentAssignee.fullName}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--tt-ink-3)]">
          {task.due_date ? (
            <span>
              {new Intl.DateTimeFormat(UI_LOCALE, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                timeZone: FARM_TZ,
              }).format(farmDayStart(task.due_date))}
            </span>
          ) : null}

          {task.due_at ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {formatFarm(new Date(task.due_at), 'HH:mm')}
            </span>
          ) : null}

          {seriesRule ? (
            <span className="inline-flex items-center gap-1">
              <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
              {describeRule(seriesRule)}
            </span>
          ) : null}
        </div>
      </header>

      {task.description ? (
        <Surface className="p-4">
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-[var(--tt-ink-2)]">
            {task.description}
          </p>
        </Surface>
      ) : null}

      <Surface className="p-4">
        <PrioritySelect taskId={task.id} priority={task.priority} />
      </Surface>

      <Surface className="p-4">
        <StepList taskId={task.id} steps={steps} taskDone={done} />
      </Surface>

      <Surface className="p-4">
        <PrivateNote taskId={task.id} personId={principal.person.id} />
      </Surface>

      <div className="flex flex-wrap items-center gap-2">
        <CompleteTaskButton
          taskId={task.id}
          done={done}
          requiresFeedCheck={task.requires_feed_check}
        />
        <DuplicateTaskButton taskId={task.id} defaultDueDate={task.due_date} />
        {isCurrentAssignee ? (
          <OfferTaskButton taskId={task.id} candidates={offerCandidates} />
        ) : null}
      </div>

      {isCurrentAssignee && !done ? (
        <AskForHelp taskId={task.id} alreadyAsked={hasOpenHelpRequest} />
      ) : null}

      {task.series_id ? (
        <div className="flex flex-wrap items-center gap-2">
          <OccurrenceActions taskId={task.id} defaultDueDate={task.due_date} />
        </div>
      ) : null}

      {seriesRule ? (
        <p className="text-[12px] leading-relaxed text-[var(--tt-ink-3)]">
          This is one day of a recurring routine. Editing the instructions changes every future
          day; ticking steps here affects only {task.due_date}.
        </p>
      ) : null}

      {history.length > 0 ? (
        <Surface className="p-4">
          <h2 className="mb-2 text-[12px] uppercase tracking-[0.1em] text-[var(--tt-ink-3)]">
            Recently done by
          </h2>
          <ul className="flex flex-col gap-1.5 text-[13px] text-[var(--tt-ink-2)]">
            {history.map((entry) => (
              <li key={entry.personId} className="flex items-center justify-between gap-3">
                <span>{entry.preferredName?.trim() || entry.fullName}</span>
                <span className="text-[var(--tt-ink-3)]">
                  {new Intl.DateTimeFormat(UI_LOCALE, {
                    day: 'numeric',
                    month: 'short',
                    timeZone: FARM_TZ,
                  }).format(farmDayStart(entry.occurrenceDate))}
                </span>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}
    </div>
  )
}
