'use client'

import * as React from 'react'
import { CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/todotwo/ui/button'
import { ErrorState } from '@/components/todotwo/ui/states'

const ERROR_MESSAGES: Record<string, string> = {
  no_code: 'The sign-in link was incomplete. Request a new one.',
  exchange_failed: 'That sign-in link has been used or has expired. Request a new one.',
  no_person: 'This email address does not have access to TodoTwo. Ask Kenneth.',
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
    initialError ? (ERROR_MESSAGES[initialError] ?? 'Sign-in failed. Try again.') : null
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmed = email.trim()
    if (!trimmed) {
      setError('Enter your email address.')
      return
    }

    setStatus('sending')

    try {
      // Sign-in mail goes through Mailgun like everything else the farm sends,
      // so the link is generated and posted server-side rather than by
      // Supabase's built-in mailer. The route answers the same way whether or
      // not the address has access, so nothing here can be used to work out who
      // is on the farm.
      const response = await fetch('/api/todotwo/auth/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, returnTo }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null
        setStatus('idle')
        setError(body?.message ?? 'Could not send the sign-in link. Try again shortly.')
        return
      }

      setStatus('sent')
    } catch {
      setStatus('idle')
      setError('Could not send the sign-in link. Try again shortly.')
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-[var(--tt-rule)] bg-[var(--tt-surface)] p-5">
        <CheckCircle2 className="h-5 w-5 text-[var(--tt-accent)]" aria-hidden="true" />
        <p className="text-sm font-medium">Check your email</p>
        <p className="text-sm text-[var(--tt-ink-2)]">
          We have sent a sign-in link to <strong>{email.trim()}</strong>. It is valid for one hour and can
          only be used once.
        </p>
        <Button variant="ghost" size="sm" onClick={() => setStatus('idle')}>
          Use a different address
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <ErrorState title="Sign-in failed" description={error} /> : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="todotwo-email" className="text-sm font-medium">
          Email address
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
          placeholder="you@example.com"
          className="min-h-[44px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[16px] text-[var(--tt-ink)] placeholder:text-[var(--tt-ink-3)]"
        />
      </div>

      <Button type="submit" block disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending …' : 'Send sign-in link'}
      </Button>

      <p className="text-xs text-[var(--tt-ink-3)]">
        No passwords. Accounts are created by the farm administrator.
      </p>
    </form>
  )
}
