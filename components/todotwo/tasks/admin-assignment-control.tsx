'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

export function AdminAssignmentControl({
  taskId,
  currentPersonId,
  people,
}: {
  taskId: string
  currentPersonId: string | null
  people: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [value, setValue] = React.useState(currentPersonId ?? '')
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => setValue(currentPersonId ?? ''), [currentPersonId])

  async function change(next: string) {
    const prev = value
    setValue(next)
    setSaved(false)
    setError(null)
    const { error: rpcError } = await getTodoTwoBrowserClient().rpc('assign_task', {
      p_task_id: taskId,
      p_person_id: next || null,
    })
    if (rpcError) {
      setValue(prev)
      setError(rpcError.message)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={`assignment-${taskId}`}
          className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--tt-ink-3)]"
        >
          Assigned to
        </label>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--tt-accent)]">
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        ) : null}
      </div>
      <select
        id={`assignment-${taskId}`}
        value={value}
        onChange={(event) => void change(event.target.value)}
        className="min-h-[42px] w-full rounded-xl border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-sm font-medium text-[var(--tt-ink)] focus:border-[var(--tt-accent)] focus:outline-none"
      >
        <option value="">Up for grabs (unassigned)</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
      {error ? <p className="text-[12px] text-[var(--tt-danger)]">{error}</p> : null}
    </div>
  )
}
