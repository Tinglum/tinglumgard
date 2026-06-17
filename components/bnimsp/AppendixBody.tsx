'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { EditableText } from './EditableText'

// Renders an appendix page body; editable (click-to-edit, saves to draft) for admins.
export function AppendixBody({ slug, initialBody, canEdit }: { slug: string; initialBody: string; canEdit: boolean }) {
  const [body, setBody] = useState(initialBody)
  const [saved, setSaved] = useState(false)

  async function save(next: string) {
    setBody(next)
    const res = await fetch(`/api/bnimsp/appendix/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: next }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--bni-line)] bg-white p-6">
      {canEdit && saved && (
        <span className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> Lagret som utkast
        </span>
      )}
      <EditableText value={body} editable={canEdit} onSave={save} placeholder="Ikke fylt ut ennå." />
    </div>
  )
}
