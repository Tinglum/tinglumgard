'use client'

import { useEffect, useRef, useState } from 'react'
import { Pencil, Loader2, AlertCircle } from 'lucide-react'

interface Props {
  value: string
  editable: boolean
  onSave: (next: string) => Promise<void> | void
  placeholder?: string
  className?: string
}

// A prose field that becomes a textarea on click when the user may edit.
// Saves on blur (and Cmd/Ctrl+Enter); Escape cancels. Autosaves while editing (debounced).
export function EditableText({ value, editable, onSave, placeholder = 'Ikke fylt ut ennå.', className = '' }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      ref.current.selectionStart = ref.current.value.length
      autosize(ref.current)
    }
  }, [editing])

  async function commit() {
    if (draft === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(draft)
      setEditing(false)
    } catch (err) {
      // Keep the textarea open and show error. User can fix or Escape to cancel.
      setSaveError(err instanceof Error ? err.message : 'Lagring mislyktes. Prøv igjen eller trykk Escape for å avbryte.')
    } finally {
      setSaving(false)
    }
  }

  function autosave() {
    if (draft === value) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    setSaving(true)
    setSaveError(null)
    autosaveTimer.current = setTimeout(async () => {
      const optimisticValue = draft
      try {
        await onSave(draft)
      } catch (err) {
        // Rollback on failure: revert to last-known-good value.
        setDraft(value)
        setSaveError(err instanceof Error ? err.message : 'Lagring mislyktes. Endringene dine ble gjenopprettet.')
      } finally {
        setSaving(false)
      }
    }, 1200)
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            autosize(e.target)
            autosave()
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
              setDraft(value)
              setSaveError(null)
              setEditing(false)
            }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
              commit()
            }
          }}
          className="w-full resize-none rounded-lg border border-[var(--bni-red)] bg-white p-2 text-sm leading-relaxed outline-none ring-2 ring-[var(--bni-red)]/20"
          rows={3}
        />
        {saveError && (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />
            {saveError}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={() => editable && setEditing(true)}
      className={`group/edit relative ${editable ? 'cursor-text rounded-lg p-2 -m-2 transition-colors hover:bg-[var(--bni-red)]/5' : ''}`}
    >
      <div className={`bni-prose text-[var(--bni-ink)] ${className || 'text-sm'}`} data-empty={placeholder}>
        {value}
      </div>
      {editable && (
        <span className="pointer-events-none absolute right-1 top-1 opacity-0 transition-opacity group-hover/edit:opacity-100">
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--bni-muted)]" />
          ) : (
            <Pencil className="h-3.5 w-3.5 text-[var(--bni-muted)]" />
          )}
        </span>
      )}
    </div>
  )
}

function autosize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
