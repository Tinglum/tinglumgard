'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Plus } from 'lucide-react'

import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import type { TaskRow } from '@/lib/todotwo/queries'

const CATEGORIES = [
  { name: 'Produce', words: /apple|banana|berry|fruit|vegetable|potato|onion|garlic|tomato|salad|lettuce|carrot|cucumber/i },
  { name: 'Dairy & eggs', words: /milk|cheese|cream|butter|yogh?urt|egg/i },
  { name: 'Bread & pantry', words: /bread|flour|rice|pasta|oil|sugar|salt|coffee|tea|cereal|tin|can/i },
  { name: 'Household', words: /soap|paper|clean|bag|detergent|sponge|toilet|battery/i },
]

function category(title: string) {
  return CATEGORIES.find((entry) => entry.words.test(title))?.name ?? 'Other'
}

export function GroceryList({ tasks }: { tasks: TaskRow[] }) {
  const router = useRouter()
  const [title, setTitle] = React.useState('')
  const [busy, setBusy] = React.useState<string | null>(null)
  const [refreshing, startRefresh] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const groups = tasks.reduce((result, task) => {
    const name = category(task.title)
    result.set(name, [...(result.get(name) ?? []), task])
    return result
  }, new Map<string, TaskRow[]>())

  async function addItem(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    setBusy('add')
    setError(null)
    const response = await fetch('/api/farm/groceries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const result = (await response.json().catch(() => ({}))) as { error?: string }
    setBusy(null)
    if (!response.ok) return setError(result.error ?? 'Could not add the item.')
    setTitle('')
    startRefresh(() => router.refresh())
  }

  async function check(task: TaskRow) {
    setBusy(task.id)
    setError(null)
    const db = getTodoTwoBrowserClient()
    if (!task.assignee) {
      const { error: claimError } = await db.rpc('claim_task', { p_task_id: task.id })
      if (claimError && !/already has/i.test(claimError.message)) {
        setBusy(null); setError(claimError.message); return
      }
    }
    const { error: completeError } = await db.rpc('complete_task', {
      p_task_id: task.id, p_actual_minutes: null, p_has_enough_food: null,
    })
    setBusy(null)
    if (completeError) return setError(completeError.message)
    startRefresh(() => router.refresh())
  }

  return <div className="flex flex-col gap-5">
    <form onSubmit={addItem} className="flex gap-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add milk, apples, soap…" className="min-h-11 flex-1 rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-sm" />
      <button disabled={busy === 'add' || refreshing || !title.trim()} className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-[var(--tt-accent)] px-4 text-sm font-medium text-[var(--tt-on-accent)] disabled:opacity-50">
        {busy === 'add' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
      </button>
    </form>
    {error ? <p className="text-sm text-[var(--tt-danger)]">{error}</p> : null}
    {tasks.length === 0 ? <p className="rounded-lg border border-dashed border-[var(--tt-rule-strong)] p-6 text-center text-sm text-[var(--tt-ink-3)]">The list is empty.</p> : null}
    {Array.from(groups.entries()).map(([name, items]) => <section key={name} className="flex flex-col gap-2">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--tt-ink-3)]">{name}</h2>
      <div className="overflow-hidden rounded-lg border border-[var(--tt-rule)] bg-[var(--tt-surface)]">
        {items.map((task) => <button key={task.id} onClick={() => void check(task)} disabled={busy !== null || refreshing} className="flex min-h-12 w-full items-center gap-3 border-b border-[var(--tt-rule)] px-4 text-left text-sm last:border-b-0 disabled:opacity-60">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--tt-rule-strong)]">{busy === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 opacity-0" />}</span>
          <span>{task.title}</span>
        </button>)}
      </div>
    </section>)}
  </div>
}
