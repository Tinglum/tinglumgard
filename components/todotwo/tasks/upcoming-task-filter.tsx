'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'

import { TaskRow } from '@/components/todotwo/tasks/task-row'
import { Surface } from '@/components/todotwo/ui/states'
import type { TaskGroup } from '@/lib/todotwo/queries'
import { UI_LOCALE } from '@/lib/todotwo/copy'
import { FARM_TZ, farmDayStart, formatFarm } from '@/lib/todotwo/time'

export function UpcomingTaskFilter({ groups, personId }: { groups: TaskGroup[]; personId: string }) {
  const [query, setQuery] = React.useState('')
  const normalized = query.trim().toLocaleLowerCase()
  const suggestions = Array.from(new Set(groups.slice(0, 4).flatMap((group) => group.tasks.map((task) => task.title)))).sort()
  const shownGroups = (normalized ? groups.slice(0, 4) : groups).map((group) => ({
    ...group,
    tasks: group.tasks.filter((task) =>
      (!normalized ? task.assignee?.id !== personId : true) &&
      (!normalized || task.title.toLocaleLowerCase().includes(normalized))
    ),
  }))
  const matchCount = shownGroups.reduce((sum, group) => sum + group.tasks.length, 0)

  return <section className="flex flex-col gap-4">
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{normalized ? 'All matching assignments' : 'Everyone else'}</h2>{normalized ? <span className="text-xs text-[var(--tt-ink-3)]">{matchCount} match{matchCount === 1 ? '' : 'es'} · next 4 days</span> : null}</div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tt-ink-3)]" aria-hidden="true" />
        <input
          type="search"
          list="upcoming-task-titles"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter tasks, e.g. Dinner"
          autoComplete="off"
          className="min-h-12 w-full rounded-lg border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] pl-10 pr-11 text-[15px] text-[var(--tt-ink)] placeholder:text-[var(--tt-ink-3)]"
        />
        {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear task filter" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-[var(--tt-ink-3)]"><X className="h-4 w-4" /></button> : null}
        <datalist id="upcoming-task-titles">{suggestions.map((title) => <option key={title} value={title} />)}</datalist>
      </label>
    </div>

    {shownGroups.map((group) => {
      if (normalized && group.tasks.length === 0) return null
      return <section key={group.date} className="flex flex-col gap-2">
        <h3 className="flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          {new Intl.DateTimeFormat(UI_LOCALE, { weekday: 'long', day: 'numeric', month: 'short', timeZone: FARM_TZ }).format(farmDayStart(group.date))}
          <span className="font-normal normal-case tracking-normal">{group.tasks.length > 0 ? `· ${group.tasks.length}` : ''}</span>
        </h3>
        {group.tasks.length === 0 ? <p className="px-1 text-[13px] text-[var(--tt-ink-3)]">Nothing scheduled.</p> : <Surface className="px-4"><ul className="list-none">{group.tasks.map((task) => <TaskRow key={task.id} task={task} timeLabel={task.due_at ? formatFarm(new Date(task.due_at), 'HH:mm') : null} />)}</ul></Surface>}
      </section>
    })}
    {normalized && matchCount === 0 ? <p className="rounded-lg border border-dashed border-[var(--tt-rule-strong)] p-6 text-center text-sm text-[var(--tt-ink-3)]">No matching assignments in the next four days.</p> : null}
  </section>
}
