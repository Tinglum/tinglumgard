'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { BniMark } from '@/components/bnimsp/BniMark'

export default function BnimspLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/bnimsp/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Innlogging feilet')
        return
      }
      router.replace('/bnimsp')
    } catch {
      setError('Noe gikk galt. Prøv igjen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BniMark height={44} />
          <p className="mt-4 text-sm text-[var(--bni-muted)]">
            Trenerportal · Nasjonal MSP 2026
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-[var(--bni-line)] bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="email">
              E-post
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--bni-line)] px-3 py-2 text-sm outline-none focus:border-[var(--bni-red)] focus:ring-2 focus:ring-[var(--bni-red)]/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="password">
              Passord
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--bni-line)] px-3 py-2 text-sm outline-none focus:border-[var(--bni-red)] focus:ring-2 focus:ring-[var(--bni-red)]/20"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--bni-red-dark)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--bni-red)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--bni-red-dark)] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Logg inn
          </button>

          <p className="pt-1 text-center text-xs text-[var(--bni-muted)]">
            Direktørtilgang får du av din nasjonale leder.
          </p>
        </form>
      </div>
    </div>
  )
}
