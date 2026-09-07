'use client'

import * as React from 'react'
import { Button } from '@/components/todotwo/ui/button'

export function FenceReadingDialog({ taskId, onSaved, onCancel }: { taskId: string; onSaved: () => void | Promise<void>; onCancel: () => void }) {
  const [goat, setGoat] = React.useState('')
  const [pig, setPig] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true); setError(null)
    const response = await fetch('/api/farm/fence-readings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId, goatVolts: Number(goat), pigVolts: Number(pig) }) })
    const result = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) { setError(result.error ?? 'Could not save readings.'); setSaving(false); return }
    await onSaved()
  }
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center">
    <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-[var(--tt-surface)] p-5 shadow-xl">
      <h2 className="text-lg font-semibold">Record fence voltage</h2>
      <p className="mt-1 text-sm text-[var(--tt-ink-2)]">Test both fences now. Enter the meter reading in kV before finishing.</p>
      <div className="mt-4 grid gap-4">
        <label className="grid gap-1 text-sm">Goat Fence <span className="text-[12px] text-[var(--tt-ink-3)]">Back of the barn</span><input required inputMode="decimal" type="number" min="0" max="20" step="0.1" value={goat} onChange={(e) => setGoat(e.target.value)} className="min-h-11 rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3" /></label>
        <label className="grid gap-1 text-sm">Pig fence <span className="text-[12px] text-[var(--tt-ink-3)]">Workshop</span><input required inputMode="decimal" type="number" min="0" max="20" step="0.1" value={pig} onChange={(e) => setPig(e.target.value)} className="min-h-11 rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3" /></label>
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--tt-danger)]">{error}</p> : null}
      <div className="mt-5 flex gap-2"><Button type="submit" disabled={saving || !goat || !pig}>Save readings</Button><Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button></div>
    </form>
  </div>
}


