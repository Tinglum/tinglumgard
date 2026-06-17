'use client'

import { useEffect, useRef, useState } from 'react'
import { Pencil, Loader2 } from 'lucide-react'

interface Props {
  value: string
  editable: boolean
  onSave: (next: string) => Promise<void> | void
  placeholder?: string
  className?: string
}

// A prose field that becomes a textarea on click when the user may edit.
// Saves on blur (and Cmd/Ctrl+Enter); Escape cancels.
export function EditableText({ value, editable, onSave, placeholder = 'Ikke fylt ut ennå.', className = '' }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

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
    setEditing(false)
    if (draft === value) return
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => { setDraft(e.target.value); autosize(e.target) }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit() }
        }}
        className="w-full resize-none rounded-lg border border-[var(--bni-red)] bg-white p-2 text-sm leading-relaxed outline-none ring-2 ring-[var(--bni-red)]/20"
        rows={3}
      />
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
