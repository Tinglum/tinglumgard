import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock, Repeat } from 'lucide-react'

import { StepList } from '@/components/todotwo/tasks/step-list'
import { CompleteTaskButton } from '@/components/todotwo/tasks/complete-task-button'
import { DuplicateTaskButton } from '@/components/todotwo/tasks/duplicate-task-button'
import { Surface } from '@/components/todotwo/ui/states'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getTaskDetail } from '@/lib/todotwo/queries'
import { describeRule } from '@/lib/todotwo/domain/recurrence'
import { UI_LOCALE } from '@/lib/todotwo/copy'
import { FARM_TZ, farmDayStart, formatFarm } from '@/lib/todotwo/time'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  await requireTodoTwoUser(`${TODOTWO_BASE}/tasks/${params.id}`)

  const detail = await getTaskDetail(params.id)
  if (!detail) notFound()

  const { task, steps, seriesRule, projectName } = detail
  const done = task.status === 'completed' || task.status === 'verified'

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
        <StepList taskId={task.id} steps={steps} taskDone={done} />
      </Surface>

      <div className="flex flex-wrap items-center gap-2">
        <CompleteTaskButton taskId={task.id} done={done} />
        <DuplicateTaskButton taskId={task.id} defaultDueDate={task.due_date} />
      </div>

      {seriesRule ? (
        <p className="text-[12px] leading-relaxed text-[var(--tt-ink-3)]">
          This is one day of a recurring routine. Editing the instructions changes every future
          day; ticking steps here affects only {task.due_date}.
        </p>
      ) : null}
    </div>
  )
}
