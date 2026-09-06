import * as React from 'react'
import Link from 'next/link'

import { Avatar } from '@/components/todotwo/ui/avatar'
import { Surface } from '@/components/todotwo/ui/states'
import { isFinished } from '@/lib/todotwo/domain/task-status'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'
import type { TaskRowAssignee } from '@/components/todotwo/tasks/task-row'

export interface FarmTodayTask {
  id: string
  title: string
  status: string
  due_at: string | null
  assignee?: TaskRowAssignee | null
}

/**
 * Who has what today, for the whole farm.
 *
 * Deliberately read-only and deliberately compact. The lists above this one are
 * the reader's own work and are actionable; this is the answer to "who is doing
 * the goats today?", which on a farm gets asked constantly and otherwise costs
 * somebody a walk across the yard. Ticking somebody else's job off from here
 * would be a different feature and a worse one, so the rows are links to the
 * task rather than controls.
 *
 * Grouped by person rather than by time, because the question is almost always
 * about a person.
 *
 * A server component on purpose: it has no interactivity, so rendering it here
 * keeps it out of the client bundle and lets the page hand it the same
 * timeLabel formatter the rows above already use.
 */
export function FarmToday({
  tasks,
  currentPersonId,
  timeLabel,
}: {
  tasks: FarmTodayTask[]
  currentPersonId: string
  timeLabel: (dueAt: string | null) => string | null
}) {
  if (tasks.length === 0) return null

  // Map preserves insertion order, and `tasks` arrives already sorted, so the
  // person with the earliest job of the day comes first.
  const byPerson = new Map<string, { person: TaskRowAssignee; tasks: FarmTodayTask[] }>()

  for (const task of tasks) {
    const person = task.assignee
    if (!person) continue
    const group = byPerson.get(person.id)
    if (group) group.tasks.push(task)
    else byPerson.set(person.id, { person, tasks: [task] })
  }

  const groups = Array.from(byPerson.values())

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
        Everyone today · {groups.length} {groups.length === 1 ? 'person' : 'people'}
      </h2>

      <Surface className="px-4">
        <ul className="list-none">
          {groups.map(({ person, tasks: theirs }) => {
            const remaining = theirs.filter((task) => !isFinished(task.status)).length

            return (
              <li
                key={person.id}
                className="flex items-start gap-3 border-b border-[var(--tt-rule)] py-3 last:border-b-0"
              >
                <Avatar person={person} size={28} className="mt-[2px] shrink-0" />

                <div className="min-w-0 flex-1">
                  <p className="text-[14px]">
                    {person.preferredName?.trim() || person.fullName}
                    {person.id === currentPersonId ? (
                      <span className="text-[var(--tt-ink-3)]"> · you</span>
                    ) : null}
                    <span className="text-[var(--tt-ink-3)]">
                      {' · '}
                      {remaining === 0 ? 'all done' : `${remaining} left`}
                    </span>
                  </p>

                  <ul className="mt-1 flex flex-col gap-[2px] list-none">
                    {theirs.map((task) => {
                      const done = isFinished(task.status)
                      const at = timeLabel(task.due_at)

                      return (
                        <li key={task.id} className="text-[13px] leading-snug">
                          <Link
                            href={`${TODOTWO_BASE}/tasks/${task.id}`}
                            className="inline-flex items-baseline gap-1.5 hover:underline"
                          >
                            {at ? (
                              <span className="tabular-nums text-[var(--tt-ink-3)]">{at}</span>
                            ) : null}
                            <span
                              className={
                                done
                                  ? 'text-[var(--tt-ink-3)] line-through'
                                  : 'text-[var(--tt-ink-2)]'
                              }
                            >
                              {task.title}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>
      </Surface>
    </section>
  )
}
