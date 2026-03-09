'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { EggOpsDailyCollection } from '@/components/eggops/EggOpsDailyCollection'
import { useLanguage } from '@/contexts/LanguageContext'

type SessionResponse = {
  authenticated: boolean
  user?: {
    role?: 'admin' | 'operations' | 'customer'
    isAdmin?: boolean
  }
}

export default function EggOpsPage() {
  const { lang } = useLanguage()
  const copy = useMemo(
    () =>
      lang === 'en'
        ? {
            title: 'EggOps',
            subtitle: 'Daily egg collection and hatching egg sales preparation.',
            passwordLabel: 'Operations password',
            login: 'Sign in',
            loggingIn: 'Signing in...',
            logout: 'Sign out',
            invalid: 'Invalid password',
            denied: 'You do not have access to EggOps.',
          }
        : {
            title: 'EggOps',
            subtitle: 'Daglig egginnsamling og klargjoring av rugeegg for salg.',
            passwordLabel: 'Driftspassord',
            login: 'Logg inn',
            loggingIn: 'Logger inn...',
            logout: 'Logg ut',
            invalid: 'Ugyldig passord',
            denied: 'Du har ikke tilgang til EggOps.',
          },
    [lang]
  )

  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function checkSession() {
    setChecking(true)
    try {
      const response = await fetch('/api/auth/session')
      if (!response.ok) {
        setAllowed(false)
        return
      }
      const data: SessionResponse = await response.json()
      const role = data?.user?.role
      const isAdmin = Boolean(data?.user?.isAdmin)
      setAllowed(Boolean(data.authenticated && (isAdmin || role === 'operations' || role === 'admin')))
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  async function loginOperations(event: React.FormEvent) {
    event.preventDefault()
    setLoggingIn(true)
    setError(null)
    try {
      const response = await fetch('/api/operations/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!response.ok) {
        setError(copy.invalid)
        return
      }
      await checkSession()
      setPassword('')
    } finally {
      setLoggingIn(false)
    }
  }

  async function logout() {
    await fetch('/api/operations/logout', { method: 'POST' })
    await checkSession()
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <Card className="p-6 w-full max-w-md">
          <p className="text-sm text-neutral-600">Loading...</p>
        </Card>
      </main>
    )
  }

  if (!allowed) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <Card className="p-6 w-full max-w-md border-neutral-200">
          <h1 className="text-2xl font-light text-neutral-900">{copy.title}</h1>
          <p className="text-sm text-neutral-600 mt-1 mb-6">{copy.subtitle}</p>
          <form onSubmit={loginOperations} className="space-y-4">
            <div>
              <Label htmlFor="operations-password">{copy.passwordLabel}</Label>
              <Input
                id="operations-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="mt-2"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loggingIn} className="w-full">
              {loggingIn ? copy.loggingIn : copy.login}
            </Button>
            <p className="text-xs text-neutral-500">{copy.denied}</p>
          </form>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-neutral-900">{copy.title}</h1>
          <p className="text-sm text-neutral-600">{copy.subtitle}</p>
        </div>
        <Button variant="outline" onClick={logout}>
          {copy.logout}
        </Button>
      </div>
      <EggOpsDailyCollection />
    </main>
  )
}
