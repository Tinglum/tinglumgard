'use client'

import { useCallback, useEffect, useState } from 'react'

type SessionSummary = {
  id: string
  name: string
  join_code_label: string
  status: 'active' | 'paused' | 'ended'
  released_section: number
  results_released: boolean
  created_at: string
  participant_count: number
  submitted_count: number
  average_total: number
  average_sections: number[]
  is_current: boolean
}

const LABEL = 'text-xs font-semibold uppercase tracking-[.16em] text-emerald-800'

const STATUS_STYLES: Record<SessionSummary['status'], string> = {
  active: 'bg-emerald-50 text-emerald-900',
  paused: 'bg-amber-50 text-amber-900',
  ended: 'bg-neutral-100 text-neutral-600',
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function SessionPicker({
  onSelect,
  selectedId,
}: {
  onSelect: (id: string | null) => void
  selectedId: string | null
}) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/quest/admin/sessions', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Could not load sessions')
      setSessions(Array.isArray(payload?.sessions) ? (payload.sessions as SessionSummary[]) : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load sessions')
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const archived = sessions.filter((session) => !session.is_current)

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={LABEL}>Archive</p>
          <h2 className="mt-1 text-xl font-medium">Sessions</h2>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-[#173f2b] bg-white px-4 py-2 text-sm font-medium disabled:opacity-40"
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      <ul className="space-y-3">
        <li>
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-current={selectedId === null ? 'true' : undefined}
            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
              selectedId === null
                ? 'border-[#173f2b] bg-[#edf3e9]'
                : 'border-neutral-200 bg-white hover:border-[#173f2b]'
            }`}
          >
            <span className="block text-sm font-medium">Current session</span>
            <span className="mt-1 block text-xs text-neutral-500">Return to the live view</span>
          </button>
        </li>

        {loading && !sessions.length ? (
          <li className="rounded-2xl bg-[#f3f0e8] px-4 py-6 text-center text-sm text-neutral-500">
            Loading sessions…
          </li>
        ) : null}

        {!loading && !error && !archived.length ? (
          <li className="rounded-2xl bg-[#f3f0e8] px-4 py-6 text-center text-sm text-neutral-500">
            No previous sessions yet
          </li>
        ) : null}

        {archived.map((session) => {
          const selected = selectedId === session.id
          return (
            <li key={session.id}>
              <button
                type="button"
                onClick={() => onSelect(session.id)}
                aria-current={selected ? 'true' : undefined}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selected
                    ? 'border-[#173f2b] bg-[#edf3e9]'
                    : 'border-neutral-200 bg-white hover:border-[#173f2b]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{session.name}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[session.status] || STATUS_STYLES.ended}`}
                  >
                    {session.status}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                  <span className="tracking-[.16em]">{session.join_code_label}</span>
                  <span>{formatDate(session.created_at)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                  <span>
                    {session.submitted_count}/{session.participant_count} submitted
                  </span>
                  <span>Avg {session.average_total}/100</span>
                  {session.results_released ? <span>Results released</span> : null}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default SessionPicker
