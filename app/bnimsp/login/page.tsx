'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { BniMark } from '@/components/bnimsp/BniMark'

type Mode = 'login' | 'register'

export default function BnimspLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isRegister = mode === 'register'

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const endpoint = isRegister ? '/api/bnimsp/auth/register' : '/api/bnimsp/auth/login'
      const payload = isRegister ? { name, email, password } : { email, password }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || (isRegister ? 'Registrering feilet' : 'Innlogging feilet'))
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
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BniMark height={44} />
          <p className="mt-4 text-sm text-[var(--bni-muted)]">Trenerportal · Nasjonal MSP 2026</p>
        </div>

        {/* Segmented toggle */}
        <div className="mb-4 flex rounded-xl border border-[var(--bni-line)] bg-white p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 rounded-lg py-2 transition-colors ${
              !isRegister ? 'bg-[var(--bni-red)] text-white' : 'text-[var(--bni-muted)] hover:text-[var(--bni-ink)]'
            }`}
          >
            Logg inn
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 rounded-lg py-2 transition-colors ${
              isRegister ? 'bg-[var(--bni-red)] text-white' : 'text-[var(--bni-muted)] hover:text-[var(--bni-ink)]'
            }`}
          >
            Ny AD
          </button>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-[var(--bni-line)] bg-white p-6 shadow-sm"
        >
          {isRegister && (
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="name">
                Navn
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[var(--bni-line)] px-3 py-2 text-sm outline-none focus:border-[var(--bni-red)] focus:ring-2 focus:ring-[var(--bni-red)]/20"
              />
            </div>
          )}
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
            {isRegister && (
              <p className="mt-1 text-xs text-[var(--bni-muted)]">Bruk din @bni.com-adresse.</p>
            )}
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium" htmlFor="password">Passord</label>
              {!isRegister && <Link href="/bnimsp/forgot-password" className="text-xs font-semibold text-[var(--bni-red)] hover:underline">Glemt passord?</Link>}
            </div>
            <input
              id="password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isRegister ? 8 : undefined}
              className="w-full rounded-lg border border-[var(--bni-line)] px-3 py-2 text-sm outline-none focus:border-[var(--bni-red)] focus:ring-2 focus:ring-[var(--bni-red)]/20"
            />
            {isRegister && (
              <p className="mt-1 text-xs text-[var(--bni-muted)]">Minst 8 tegn.</p>
            )}
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
            {isRegister ? 'Opprett innlogging' : 'Logg inn'}
          </button>

          <p className="pt-1 text-center text-xs text-[var(--bni-muted)]">
            {isRegister ? (
              <>Har du allerede en konto?{' '}
                <button type="button" onClick={() => switchMode('login')} className="font-semibold text-[var(--bni-red)] hover:underline">
                  Logg inn
                </button>
              </>
            ) : (
              <>Ny AD?{' '}
                <button type="button" onClick={() => switchMode('register')} className="font-semibold text-[var(--bni-red)] hover:underline">
                  Opprett innlogging
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  )
}
