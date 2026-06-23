'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Database, UploadCloud, Users, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

interface DiffItem {
  n: number
  title: string
  type: 'slide' | 'appendix'
}

// Editor-only control strip: shows the data source and one-time setup actions.
export function AdminBar({ source }: { source: 'db' | 'seed' }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [showDirectors, setShowDirectors] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [diffs, setDiffs] = useState<DiffItem[]>([])

  async function call(path: string, label: string) {
    setBusy(label)
    setMsg(null)
    try {
      const res = await fetch(path, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ kind: 'err', text: data.error || 'Handlingen feilet' })
      } else if (data.skipped) {
        setMsg({ kind: 'ok', text: 'Allerede importert.' })
      } else {
        setMsg({ kind: 'ok', text: 'Ferdig.' })
        router.refresh()
      }
    } catch {
      setMsg({ kind: 'err', text: 'Nettverksfeil' })
    } finally {
      setBusy(null)
    }
  }

  async function showPublishDiff() {
    setMsg(null)
    setBusy('diff')
    try {
      const res = await fetch('/api/bnimsp/publish-diff')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ kind: 'err', text: data.error || 'Kunne ikke laste diff' })
      } else {
        setDiffs(data.diffs || [])
        setShowDiff(true)
      }
    } catch {
      setMsg({ kind: 'err', text: 'Nettverksfeil' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-900">
          <Database className="h-4 w-4" />
          Datakilde:{' '}
          <span className="rounded bg-white px-1.5 py-0.5 text-xs">
            {source === 'db' ? 'database' : 'seed-fil (skrivebeskyttet)'}
          </span>
        </span>

        {source === 'seed' && (
          <button
            onClick={() => call('/api/bnimsp/seed', 'seed')}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bni-ink)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy === 'seed' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
            Importer innhold til database
          </button>
        )}

        <button
          onClick={() => showPublishDiff()}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          {busy === 'diff' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
          Publiser endringer
        </button>

        <button
          onClick={() => setShowDirectors((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
        >
          <Users className="h-3.5 w-3.5" />
          AD-er
        </button>

        {msg && (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              msg.kind === 'ok' ? 'text-green-700' : 'text-[var(--bni-red-dark)]'
            }`}
          >
            {msg.kind === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {msg.text}
          </span>
        )}
      </div>

      {showDirectors && <DirectorForm onDone={() => setMsg({ kind: 'ok', text: 'AD lagret.' })} />}

      {showDiff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold text-[var(--bni-ink)]">Forhåndsvis publisering</h2>
            {diffs.length === 0 ? (
              <p className="text-sm text-[var(--bni-muted)]">Ingen endringer å publisere.</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-[var(--bni-muted)]">
                  {diffs.length} element{diffs.length !== 1 ? 'er' : ''} vil bli publisert:
                </p>
                <ul className="space-y-2">
                  {diffs.map((d) => (
                    <li key={`${d.type}-${d.n}`} className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs">
                      <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-amber-400" />
                      <div>
                        <div className="font-semibold text-amber-900">{d.title}</div>
                        <div className="text-amber-700">{d.type === 'slide' ? `Slide ${d.n}` : 'Appendix'}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => setShowDiff(false)}
                    className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-50"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={() => {
                      setShowDiff(false)
                      call('/api/bnimsp/publish', 'publish')
                    }}
                    disabled={!!busy}
                    className="flex-1 rounded-lg bg-[var(--bni-ink)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {busy === 'publish' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Publiser nå'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {source === 'seed' && (
        <p className="mt-2 text-xs text-amber-800">
          Redigering, publisering og AD-innlogging krever databasen. Kjør migrasjonen
          <code className="mx-1 rounded bg-white px-1">20260617000000_bnimsp_train_the_trainer.sql</code>
          og trykk «Importer innhold til database».
        </p>
      )}
    </div>
  )
}

function DirectorForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const res = await fetch('/api/bnimsp/directors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(data.error || 'Kunne ikke lagre')
      } else {
        setEmail(''); setName(''); setPassword('')
        onDone()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2 border-t border-amber-200 pt-3">
      <label className="text-xs font-medium text-amber-900">
        Navn
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="mt-1 block rounded-lg border border-amber-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium text-amber-900">
        E-post
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block rounded-lg border border-amber-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium text-amber-900">
        Passord (min. 8)
        <input type="text" required value={password} onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block rounded-lg border border-amber-300 px-2 py-1.5 text-sm" />
      </label>
      <button type="submit" disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bni-red)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--bni-red-dark)] disabled:opacity-50">
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Lagre AD
      </button>
      {err && <span className="text-xs font-medium text-[var(--bni-red-dark)]">{err}</span>}
    </form>
  )
}
