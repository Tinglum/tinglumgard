'use client'

import * as React from 'react'
import { CheckCircle2, KeyRound } from 'lucide-react'

import { Button } from '@/components/todotwo/ui/button'
import { ErrorState } from '@/components/todotwo/ui/states'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { finishSignIn, safeReturnTo } from '@/lib/todotwo/finish-sign-in'

const ERROR_MESSAGES: Record<string, string> = {
  no_code: 'The sign-in link was incomplete. Request a new one.',
  exchange_failed: 'That sign-in link has been used or has expired. Request a new one.',
  no_person: 'This email address does not have access to TodoTwo. Ask Kenneth.',
}

function MagicLinkFallback({ returnTo }: { returnTo?: string }) {
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [status, setStatus] = React.useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = React.useState<string | null>(null)

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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--tt-ink-3)] underline-offset-4 hover:underline"
      >
        First time, or nothing above working? Email me a sign-in link
      </button>
    )
  }

  if (status === 'sent') {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-[var(--tt-rule)] bg-[var(--tt-surface)] p-5">
        <CheckCircle2 className="h-5 w-5 text-[var(--tt-accent)]" aria-hidden="true" />
        <p className="text-sm font-medium">Check your email</p>
        <p className="text-sm text-[var(--tt-ink-2)]">
          We have sent a sign-in link to <strong>{email.trim()}</strong>. It is valid for one hour
          and can only be used once.
        </p>
        <Button variant="ghost" size="sm" onClick={() => setStatus('idle')}>
          Use a different address
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-[var(--tt-rule)] bg-[var(--tt-surface)] p-4" noValidate>
      {error ? <ErrorState title="Sign-in failed" description={error} /> : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="todotwo-magic-email" className="text-sm font-medium">
          Email address
        </label>
        <input
          id="todotwo-magic-email"
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

      <Button type="submit" size="sm" block disabled={status === 'sending'} variant="secondary">
        {status === 'sending' ? 'Sending …' : 'Send sign-in link'}
      </Button>
    </form>
  )
}

function ForgotPassword() {
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [status, setStatus] = React.useState<'idle' | 'sending' | 'sent'>('idle')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return

    setStatus('sending')
    try {
      await fetch('/api/todotwo/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
    } catch {
      // Same vague response regardless — see the route's doc comment.
    }
    setStatus('sent')
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--tt-ink-2)] underline-offset-4 hover:underline"
      >
        Forgot password?
      </button>
    )
  }

  if (status === 'sent') {
    return (
      <p className="text-xs text-[var(--tt-ink-2)]">
        If that address has access, a password reset link is on its way.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="min-h-[36px] flex-1 rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[13px] text-[var(--tt-ink)]"
      />
      <Button type="submit" size="sm" variant="ghost" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending …' : 'Send reset link'}
      </Button>
    </form>
  )
}

export function LoginForm({
  returnTo,
  initialError,
}: {
  returnTo?: string
  initialError?: string
}) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [status, setStatus] = React.useState<'idle' | 'signing-in'>('idle')
  const [error, setError] = React.useState<string | null>(
    initialError ? (ERROR_MESSAGES[initialError] ?? 'Sign-in failed. Try again.') : null
  )
  const [passkeySupported, setPasskeySupported] = React.useState(false)
  const [passkeyBusy, setPaskeyBusy] = React.useState(false)

  React.useEffect(() => {
    void (async () => {
      try {
        const { browserSupportsWebAuthn } = await import('@simplewebauthn/browser')
        setPasskeySupported(browserSupportsWebAuthn())
      } catch {
        setPasskeySupported(false)
      }
    })()
  }, [])

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }

    setStatus('signing-in')

    const supabase = getTodoTwoBrowserClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setStatus('idle')
      setError('Wrong email or password.')
      return
    }

    const failure = await finishSignIn(safeReturnTo(returnTo))
    if (failure) {
      setStatus('idle')
      setError(ERROR_MESSAGES[failure] ?? 'Sign-in failed. Try again.')
    }
  }

  async function handlePasskeyLogin() {
    setError(null)
    setPaskeyBusy(true)

    try {
      const { startAuthentication } = await import('@simplewebauthn/browser')

      const optionsResponse = await fetch('/api/todotwo/auth/passkey/login-options', {
        method: 'POST',
      })
      if (!optionsResponse.ok) throw new Error('options_failed')
      const options = await optionsResponse.json()

      const assertion = await startAuthentication({ optionsJSON: options })

      const verifyResponse = await fetch('/api/todotwo/auth/passkey/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: assertion }),
      })

      if (!verifyResponse.ok) {
        setError('That passkey was not recognized. Try again or use your password.')
        setPaskeyBusy(false)
        return
      }

      const { accessToken, refreshToken } = await verifyResponse.json()
      const supabase = getTodoTwoBrowserClient()
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (setSessionError) {
        setError('Could not complete passkey sign-in. Try again.')
        setPaskeyBusy(false)
        return
      }

      const failure = await finishSignIn(safeReturnTo(returnTo))
      if (failure) {
        setPaskeyBusy(false)
        setError(ERROR_MESSAGES[failure] ?? 'Sign-in failed. Try again.')
      }
    } catch {
      // User cancelled, no passkey available, or the browser does not support
      // WebAuthn — re-enable the button with a soft message rather than a hard
      // failure.
      setPaskeyBusy(false)
      setError(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4" noValidate>
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

        <div className="flex flex-col gap-2">
          <label htmlFor="todotwo-password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="todotwo-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-[44px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[16px] text-[var(--tt-ink)]"
          />
        </div>

        <Button type="submit" block disabled={status === 'signing-in'}>
          {status === 'signing-in' ? 'Signing in …' : 'Sign in'}
        </Button>

        <ForgotPassword />
      </form>

      {passkeySupported ? (
        <Button
          type="button"
          variant="secondary"
          block
          onClick={handlePasskeyLogin}
          disabled={passkeyBusy}
        >
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          {passkeyBusy ? 'Waiting for your passkey …' : 'Sign in with a passkey'}
        </Button>
      ) : null}

      <div className="border-t border-[var(--tt-rule)] pt-4">
        <MagicLinkFallback returnTo={returnTo} />
      </div>
    </div>
  )
}
