'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { TaskRow } from '@/components/todotwo/tasks/task-row'
import { Surface } from '@/components/todotwo/ui/states'
import type { TaskGroup } from '@/lib/todotwo/queries'
import { UI_LOCALE } from '@/lib/todotwo/copy'
import { FARM_TZ, farmDayStart, formatFarm } from '@/lib/todotwo/time'

export function PersonalUpcomingPager({ groups, personId }: { groups: TaskGroup[]; personId: string }) {
  const [index, setIndex] = React.useState(0)
  const group = groups[index]
  if (!group) return null
  const mine = group.tasks.filter((task) => task.assignee?.id === personId)
  const date = new Intl.DateTimeFormat(UI_LOCALE, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: FARM_TZ,
  }).format(farmDayStart(group.date))

  return <section className="flex flex-col gap-3 rounded-xl border border-[var(--tt-accent)] bg-[var(--tt-accent-soft)] p-4">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-accent)]">Your upcoming tasks</h2><p className="mt-1 text-base font-semibold capitalize">{date}</p></div>
      <span className="text-sm text-[var(--tt-ink-2)]">{mine.length} task{mine.length === 1 ? '' : 's'}</span>
    </div>
    {mine.length ? <Surface className="px-4"><ul className="list-none">{mine.map((task) => <TaskRow key={task.id} task={task} timeLabel={task.due_at ? formatFarm(new Date(task.due_at), 'HH:mm') : null} />)}</ul></Surface> : <p className="rounded-lg bg-[var(--tt-surface)] px-4 py-5 text-center text-sm text-[var(--tt-ink-3)]">You have nothing assigned this day.</p>}
    <div className="flex items-center justify-between gap-3">
      <button type="button" onClick={() => setIndex((value) => value - 1)} disabled={index === 0} className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium text-[var(--tt-ink-2)] disabled:invisible"><ChevronLeft className="h-4 w-4" />Previous day</button>
      <span className="text-xs tabular-nums text-[var(--tt-ink-3)]">{index + 1} / {groups.length}</span>
      <button type="button" onClick={() => setIndex((value) => value + 1)} disabled={index === groups.length - 1} className="inline-flex min-h-11 items-center gap-1 rounded-md bg-[var(--tt-accent)] px-3 text-sm font-medium text-[var(--tt-on-accent)] disabled:invisible">Next day<ChevronRight className="h-4 w-4" /></button>
    </div>
  </section>
}
