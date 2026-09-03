'use client'

import * as React from 'react'

import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

/**
 * A person's private scratchpad on a task — "remember to double-check the
 * fence latch here". Distinct from task_comments: nobody else, staff
 * included, can read this. See the RLS policy on todotwo.task_private_notes
 * (task_private_notes_own), which has no is_staff() clause at all.
 *
 * Reads and writes go straight to the table through the RLS-bound browser
 * client rather than through an RPC: the policy already expresses the entire
 * rule ("your own row, full stop"), so there is nothing a security-definer
 * function would need to add.
 *
 * Saves explicitly rather than on every keystroke, to keep this a single
 * upsert per edit rather than a write per character.
 */
export function PrivateNote({ taskId, personId }: { taskId: string; personId: string }) {
  const [value, setValue] = React.useState('')
  const [savedValue, setSavedValue] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [savedAt, setSavedAt] = React.useState<Date | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = getTodoTwoBrowserClient()
      const { data, error: selectError } = await supabase
        .from('task_private_notes')
        .select('note')
        .eq('task_id', taskId)
        .eq('person_id', personId)
        .maybeSingle()

      if (cancelled) return

      if (selectError) {
        setError(selectError.message)
      } else if (data) {
        setValue(data.note as string)
        setSavedValue(data.note as string)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [taskId, personId])

  const dirty = value.trim() !== savedValue.trim()

  async function save() {
    const trimmed = value.trim()
    if (saving || trimmed === savedValue.trim()) return

    setSaving(true)
    setError(null)

    try {
      const supabase = getTodoTwoBrowserClient()

      if (trimmed.length === 0) {
        const { error: deleteError } = await supabase
          .from('task_private_notes')
          .delete()
          .eq('task_id', taskId)
          .eq('person_id', personId)

        if (deleteError) {
          setError(deleteError.message)
          return
        }
        setSavedValue('')
        setValue('')
      } else {
        const { error: upsertError } = await supabase
          .from('task_private_notes')
          .upsert(
            { task_id: taskId, person_id: personId, note: trimmed },
            { onConflict: 'task_id,person_id' }
          )

        if (upsertError) {
          setError(upsertError.message)
          return
        }
        setSavedValue(trimmed)
      }

      setSavedAt(new Date())
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] uppercase tracking-[0.1em] text-[var(--tt-ink-3)]">
        My note (private — only you can see this)
      </span>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder="e.g. ask Amber how she likes this done"
        rows={3}
        className="w-full resize-y rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] p-2 text-[13px] text-[var(--tt-ink)] placeholder:text-[var(--tt-ink-3)]"
      />
      <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--tt-ink-3)]">
        <span>
          {saving
            ? 'Saving…'
            : dirty
              ? 'Unsaved changes'
              : savedAt
                ? 'Saved'
                : savedValue
                  ? 'Saved'
                  : ''}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-md px-2 py-1 text-[12px] font-medium text-[var(--tt-accent)] hover:underline disabled:opacity-40"
        >
          Save
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-[12px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
