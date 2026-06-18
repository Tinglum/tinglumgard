'use client'

import { useState } from 'react'
import { Pencil, X, Loader2, CheckCircle2 } from 'lucide-react'
import { Markdown } from './Markdown'

// Renders an appendix page as styled markdown. Admins can toggle a markdown
// editor (the body is authored in markdown: ## headings, - lists, | tables |,
// > [!NINJA|KEY|WARN|NOTE|TIP] callouts, - [ ] checklists).
export function AppendixBody({ slug, initialBody, canEdit }: { slug: string; initialBody: string; canEdit: boolean }) {
  const [body, setBody] = useState(initialBody)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialBody)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/bnimsp/appendix/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      })
      if (res.ok) {
        setBody(draft)
        setEditing(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--bni-muted)]">
            Markdown · ## overskrift · - liste · | tabell | · &gt; [!NINJA] callout · - [ ] sjekkpunkt
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setDraft(body); setEditing(false) }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--bni-line)] px-3 py-1.5 text-sm font-medium hover:bg-zinc-100"
            >
              <X className="h-4 w-4" /> Avbryt
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bni-red)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--bni-red-dark)] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Lagre utkast
            </button>
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-[60vh] w-full resize-y rounded-xl border border-[var(--bni-line)] bg-white p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-[var(--bni-red)] focus:ring-2 focus:ring-[var(--bni-red)]/15"
        />
      </div>
    )
  }

  return (
    <div className="relative">
      {canEdit && (
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => { setDraft(body); setEditing(true) }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--bni-line)] px-3 py-1.5 text-sm font-medium text-[var(--bni-muted)] hover:bg-zinc-100 hover:text-[var(--bni-ink)]"
          >
            <Pencil className="h-3.5 w-3.5" /> Rediger
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Lagret som utkast
            </span>
          )}
        </div>
      )}
      <Markdown content={body} />
    </div>
  )
}
