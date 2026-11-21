'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, ShoppingBasket } from 'lucide-react'

import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { Button } from '@/components/todotwo/ui/button'
import { EmptyState, StatusPill, Surface } from '@/components/todotwo/ui/states'
import type { TaskRow } from '@/lib/todotwo/queries'

const CATEGORIES = [
  {
    name: 'Produce',
    words:
      /apple|banana|berry|fruit|vegetable|potato|onion|garlic|tomato|salad|lettuce|carrot|cucumber/i,
  },
  { name: 'Dairy & eggs', words: /milk|cheese|cream|butter|yogh?urt|egg/i },
  {
    name: 'Bread & pantry',
    words: /bread|flour|rice|pasta|oil|sugar|salt|coffee|tea|cereal|tin|can/i,
  },
  { name: 'Household', words: /soap|paper|clean|bag|detergent|sponge|toilet|battery/i },
]

function category(title: string) {
  return CATEGORIES.find((entry) => entry.words.test(title))?.name ?? 'Other'
}

export function GroceryList({
  tasks: initialTasks,
  suggestions,
}: {
  tasks: TaskRow[]
  suggestions: string[]
}) {
  const router = useRouter()
  const [tasks, setTasks] = React.useState<TaskRow[]>(initialTasks)
  const [title, setTitle] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => setTasks(initialTasks), [initialTasks])

  const groups = React.useMemo(
    () =>
      tasks.reduce((result, task) => {
        const name = category(task.title)
        result.set(name, [...(result.get(name) ?? []), task])
        return result
      }, new Map<string, TaskRow[]>()),
    [tasks]
  )

  async function addItem(event: React.FormEvent) {
    event.preventDefault()
    const clean = title.trim()
    if (!clean) return
    setError(null)
    setTitle('')

    // Optimistic insert (0 ms UI feedback)
    const tempId = `temp-${Date.now()}`
    const optimistic: TaskRow = {
      id: tempId,
      title: clean,
      description: null,
      status: 'unassigned',
      priority: 3,
      due_date: null,
      due_at: null,
      all_day: true,
      project_id: null,
      section_id: null,
      series_id: null,
      parent_task_id: null,
      estimated_minutes: null,
      is_overridden: false,
      requires_feed_check: false,
      assignee: null,
    }
    setTasks((prev) => [...prev, optimistic])

    try {
      const response = await fetch('/api/farm/groceries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: clean }),
      })
      const result = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== tempId))
        setTitle(clean)
        setError(result.error ?? 'Could not add the item.')
        return
      }
      router.refresh()
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== tempId))
      setTitle(clean)
      setError('Could not add the item.')
    }
  }

  async function check(task: TaskRow) {
    if (task.id.startsWith('temp-')) return
    setError(null)
    // Optimistically remove immediately (0 ms)
    setTasks((prev) => prev.filter((t) => t.id !== task.id))

    const db = getTodoTwoBrowserClient()
    if (!task.assignee) {
      const { error: claimError } = await db.rpc('claim_task', { p_task_id: task.id })
      if (claimError && !/already has/i.test(claimError.message)) {
        setTasks((prev) => [...prev, task])
        setError(claimError.message)
        return
      }
    }
    const { error: completeError } = await db.rpc('complete_task', {
      p_task_id: task.id,
      p_actual_minutes: null,
      p_has_enough_food: null,
    })
    if (completeError) {
      setTasks((prev) => [...prev, task])
      setError(completeError.message)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Surface className="p-3 sm:p-4">
        <form onSubmit={addItem} className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            list="grocery-history"
            autoComplete="off"
            placeholder="Add milk, apples, soap…"
            className="min-h-[42px] flex-1 rounded-xl border border-[var(--tt-rule-strong)] bg-[var(--tt-ground)]/60 px-3.5 text-[14.5px] text-[var(--tt-ink)] placeholder:text-[var(--tt-ink-3)] focus:border-[var(--tt-accent)] focus:bg-[var(--tt-surface)] focus:outline-none"
          />
          <datalist id="grocery-history">
            {suggestions.map((item) => (
              <option key={item.toLocaleLowerCase()} value={item} />
            ))}
          </datalist>
          <Button type="submit" disabled={!title.trim()}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        </form>
        {error ? (
          <p role="alert" className="mt-2 text-[13px] text-[var(--tt-danger)]">
            {error}
          </p>
        ) : null}
      </Surface>

      {tasks.length === 0 ? (
        <EmptyState
          icon={ShoppingBasket}
          title="The grocery list is empty"
          description="Add anything needed for the kitchen or barn above."
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from(groups.entries()).map(([name, items]) => (
          <Surface key={name} className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--tt-ink-3)]">
                {name}
              </h2>
              <StatusPill tone="neutral">{items.length}</StatusPill>
            </div>
            <div className="divide-y divide-[var(--tt-rule)]">
              {items.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => void check(task)}
                  className="group flex min-h-[44px] w-full items-center gap-3 py-2 text-left text-[14.5px] font-medium text-[var(--tt-ink)] transition-colors hover:text-[var(--tt-accent)]"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[var(--tt-rule-strong)] transition-colors group-hover:border-[var(--tt-accent)] group-hover:bg-[var(--tt-accent-soft)]">
                    <Check className="h-3 w-3 text-[var(--tt-accent)] opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span className="truncate">{task.title}</span>
                </button>
              ))}
            </div>
          </Surface>
        ))}
      </div>
    </div>
  )
}
