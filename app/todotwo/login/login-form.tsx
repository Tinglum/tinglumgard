'use client'

import * as React from 'react'
import { CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/todotwo/ui/button'
import { ErrorState } from '@/components/todotwo/ui/states'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

const ERROR_MESSAGES: Record<string, string> = {
  no_code: 'Innloggingslenken manglet informasjon. Be om en ny.',
  exchange_failed: 'Innloggingslenken er brukt opp eller utløpt. Be om en ny.',
  no_person: 'E-postadressen har ikke tilgang til TodoTwo. Ta kontakt med Kenneth.',
}

export function LoginForm({
  returnTo,
  initialError,
}: {
  returnTo?: string
  initialError?: string
}) {
  const [email, setEmail] = React.useState('')
  const [status, setStatus] = React.useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = React.useState<string | null>(
    initialError ? (ERROR_MESSAGES[initialError] ?? 'Innloggingen mislyktes. Prøv igjen.') : null
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmed = email.trim()
    if (!trimmed) {
      setError('Skriv inn e-postadressen din.')
      return
    }

    setStatus('sending')

    try {
      const supabase = getTodoTwoBrowserClient()
      const callback = new URL(todoTwoRoutes.authCallback(), window.location.origin)
      if (returnTo) callback.searchParams.set('returnTo', returnTo)

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: callback.toString(),
          // Accounts are created by an administrator. A stranger who guesses
          // the URL must not be able to make one for themselves.
          shouldCreateUser: false,
        },
      })

      if (signInError) {
        setStatus('idle')
        setError(
          signInError.status === 422
            ? 'Denne e-postadressen har ikke tilgang til TodoTwo.'
            : 'Kunne ikke sende innloggingslenken. Prøv igjen om litt.'
        )
        return
      }

      setStatus('sent')
    } catch {
      setStatus('idle')
      setError('Kunne ikke sende innloggingslenken. Prøv igjen om litt.')
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-[var(--tt-rule)] bg-[var(--tt-surface)] p-5">
        <CheckCircle2 className="h-5 w-5 text-[var(--tt-accent)]" aria-hidden="true" />
        <p className="text-sm font-medium">Sjekk e-posten din</p>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Vi har sendt en innloggingslenke til <strong>{email.trim()}</strong>. Lenken er gyldig i
          én time og kan bare brukes én gang.
        </p>
        <Button variant="ghost" size="sm" onClick={() => setStatus('idle')}>
          Bruk en annen adresse
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <ErrorState title="Innlogging mislyktes" description={error} /> : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="todotwo-email" className="text-sm font-medium">
          E-postadresse
        </label>
        <input
          id="todotwo-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="deg@example.com"
          className="min-h-[44px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[16px] text-[var(--tt-ink)] placeholder:text-[var(--tt-ink-3)]"
        />
      </div>

      <Button type="submit" block disabled={status === 'sending'}>
        {status === 'sending' ? 'Sender …' : 'Send innloggingslenke'}
      </Button>

      <p className="text-xs text-[var(--tt-ink-3)]">
        Ingen passord. Kontoer opprettes av gårdsansvarlig.
      </p>
    </form>
  )
}
