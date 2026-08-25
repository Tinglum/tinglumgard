'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { BniMark } from '@/components/bnimsp/BniMark'

export default function BnimspResetPasswordPage() {
  const token = useSearchParams().get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) return setError('Passordene er ikke like.')
    setBusy(true)
    try {
      const response = await fetch('/api/bnimsp/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) return setError(data.error || 'Kunne ikke endre passordet.')
      setComplete(true)
    } catch {
      setError('Noe gikk galt. Prøv igjen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BniMark height={44} />
          <p className="mt-4 text-sm text-[var(--bni-muted)]">Velg nytt passord</p>
        </div>
        <div className="rounded-2xl border border-[var(--bni-line)] bg-white p-6 shadow-sm">
          {complete ? (
            <div className="space-y-4 text-center">
              <h1 className="text-lg font-semibold">Passordet er endret</h1>
              <p className="text-sm text-[var(--bni-muted)]">Du kan nå logge inn med det nye passordet.</p>
              <Link href="/bnimsp/login" className="block rounded-lg bg-[var(--bni-red)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--bni-red-dark)]">Gå til innlogging</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {!token && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--bni-red-dark)]">Lenken mangler eller er ugyldig.</p>}
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="new-password">Nytt passord</label>
                <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-[var(--bni-line)] px-3 py-2 text-sm outline-none focus:border-[var(--bni-red)] focus:ring-2 focus:ring-[var(--bni-red)]/20" />
                <p className="mt-1 text-xs text-[var(--bni-muted)]">Minst 8 tegn.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="confirm-password">Gjenta passord</label>
                <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-lg border border-[var(--bni-line)] px-3 py-2 text-sm outline-none focus:border-[var(--bni-red)] focus:ring-2 focus:ring-[var(--bni-red)]/20" />
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--bni-red-dark)]">{error}</p>}
              <button type="submit" disabled={busy || !token} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--bni-red)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--bni-red-dark)] disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Endre passord</button>
              <Link href="/bnimsp/login" className="block text-center text-xs font-semibold text-[var(--bni-red)] hover:underline">Tilbake til innlogging</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

