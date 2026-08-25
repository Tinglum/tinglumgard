'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { BniMark } from '@/components/bnimsp/BniMark'

export default function BnimspForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const response = await fetch('/api/bnimsp/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) return setError(data.error || 'Kunne ikke sende e-post.')
      setMessage(data.message)
    } catch {
      setError('Noe gikk galt. Prøv igjen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center"><BniMark height={44} /><p className="mt-4 text-sm text-[var(--bni-muted)]">Tilbakestill passord</p></div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[var(--bni-line)] bg-white p-6 shadow-sm">
          <p className="text-sm text-[var(--bni-muted)]">Skriv inn e-postadressen din, så sender vi en lenke for å velge nytt passord.</p>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="email">E-post</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-[var(--bni-line)] px-3 py-2 text-sm outline-none focus:border-[var(--bni-red)] focus:ring-2 focus:ring-[var(--bni-red)]/20" />
          </div>
          {message && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--bni-red-dark)]">{error}</p>}
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--bni-red)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--bni-red-dark)] disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Send lenke</button>
          <Link href="/bnimsp/login" className="block text-center text-xs font-semibold text-[var(--bni-red)] hover:underline">Tilbake til innlogging</Link>
        </form>
      </div>
    </div>
  )
}
