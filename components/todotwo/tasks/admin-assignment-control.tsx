'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

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
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function change(next: string) {
    setValue(next)
    setSaving(true)
    setError(null)
    const { error: rpcError } = await getTodoTwoBrowserClient().rpc('assign_task', {
      p_task_id: taskId,
      p_person_id: next || null,
    })
    setSaving(false)
    if (rpcError) {
      setValue(currentPersonId ?? '')
      setError(rpcError.message)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`assignment-${taskId}`} className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--tt-ink-3)]">
        Assignment
      </label>
      <div className="flex items-center gap-2">
        <select
          id={`assignment-${taskId}`}
          value={value}
          disabled={saving}
          onChange={(event) => void change(event.target.value)}
          className="min-h-11 flex-1 rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-sm"
        >
          <option value="">Up for grabs</option>
          {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
        {saving ? <Loader2 className="h-4 w-4 animate-spin text-[var(--tt-ink-3)]" aria-label="Saving" /> : null}
      </div>
      {error ? <p className="text-[12px] text-[var(--tt-danger)]">{error}</p> : null}
    </div>
  )
}
