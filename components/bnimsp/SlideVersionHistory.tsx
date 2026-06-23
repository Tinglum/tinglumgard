'use client'

import { useState } from 'react'
import { ChevronDown, RotateCcw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Version {
  id: number
  publishedAt: string
  publishedBy: string
  title?: string
}

interface Props {
  slideN: number
}

export function SlideVersionHistory({ slideN }: Props) {
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [reverting, setReverting] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function loadVersions() {
    if (versions.length > 0) {
      setOpen(!open)
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/bnimsp/slides/${slideN}/versions`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ kind: 'err', text: data.error || 'Kunne ikke laste versjoner' })
      } else {
        setVersions(data.versions || [])
        setOpen(true)
      }
    } catch {
      setMsg({ kind: 'err', text: 'Nettverksfeil' })
    } finally {
      setLoading(false)
    }
  }

  async function revert(versionId: number) {
    setReverting(versionId)
    setMsg(null)
    try {
      const res = await fetch(`/api/bnimsp/slides/${slideN}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ kind: 'err', text: data.error || 'Kunne ikke gjenopprette' })
      } else {
        setMsg({ kind: 'ok', text: data.message || 'Gjenopprettet.' })
        setVersions([])
        setOpen(false)
      }
    } catch {
      setMsg({ kind: 'err', text: 'Nettverksfeil' })
    } finally {
      setReverting(null)
    }
  }

  return (
    <div className="text-xs">
      <button
        onClick={loadVersions}
        disabled={loading}
        className="inline-flex items-center gap-1 text-[var(--bni-muted)] hover:text-[var(--bni-ink)] disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
        Versjonhistorikk
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-[var(--bni-line)] bg-zinc-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-[var(--bni-ink)]">Tidligere versjoner</span>
            <button
              onClick={() => setOpen(false)}
              className="text-[var(--bni-muted)] hover:text-[var(--bni-ink)]"
            >
              <ChevronDown className="h-3 w-3 rotate-180" />
            </button>
          </div>

          {versions.length === 0 ? (
            <p className="text-[var(--bni-muted)]">Ingen tidligere versjoner.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {versions.map((v) => (
                <div key={v.id} className="flex items-start justify-between gap-2 rounded-lg bg-white p-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--bni-ink)] truncate">{v.title || 'Untitled'}</div>
                    <div className="text-[var(--bni-muted)] text-[10px]">
                      {new Date(v.publishedAt).toLocaleString('nb-NO')}
                      {v.publishedBy && ` – ${v.publishedBy}`}
                    </div>
                  </div>
                  <button
                    onClick={() => revert(v.id)}
                    disabled={reverting === v.id}
                    className="flex-shrink-0 rounded-lg border border-amber-300 bg-white px-2 py-1 hover:bg-amber-50 disabled:opacity-50 text-[var(--bni-ink)]"
                  >
                    {reverting === v.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {msg && (
            <div className="mt-2 flex items-start gap-1.5 text-[10px]">
              {msg.kind === 'ok' ? (
                <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-green-600" />
              ) : (
                <AlertCircle className="h-3 w-3 flex-shrink-0 text-[var(--bni-red)]" />
              )}
              <span className={msg.kind === 'ok' ? 'text-green-700' : 'text-[var(--bni-red)]'}>
                {msg.text}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
