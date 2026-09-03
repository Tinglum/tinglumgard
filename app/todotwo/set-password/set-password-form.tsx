'use client'

import * as React from 'react'

import { Button } from '@/components/todotwo/ui/button'
import { ErrorState } from '@/components/todotwo/ui/states'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { safeReturnTo } from '@/lib/todotwo/finish-sign-in'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

export function SetPasswordForm({ returnTo }: { returnTo?: string }) {
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [status, setStatus] = React.useState<'checking' | 'idle' | 'saving'>('checking')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    void (async () => {
      const supabase = getTodoTwoBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.replace(todoTwoRoutes.login())
        return
      }

      // A recovery or invite link lands here seconds after the server-side
      // middleware last touched this same session's cookies (it refreshes on
      // every TodoTwo request — see lib/todotwo/middleware.ts). That refresh
      // and this page's own client-side session can momentarily disagree
      // about which access/refresh token pair is current, and updateUser()
      // is strict about it: getUser() above already succeeded (it only needs
      // a still-valid access token), but a password change can land in that
      // narrow window and fail with a 403 even though the session is fine a
      // moment later. Forcing a refresh here, before the form is usable,
      // settles the client on the newest token pair so the real submission
      // doesn't race it.
      await supabase.auth.refreshSession()

      setStatus('idle')
    })()
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setStatus('saving')

    const supabase = getTodoTwoBrowserClient()

    let { error: updateError } = await supabase.auth.updateUser({ password })

    // Belt and braces alongside the refresh in the effect above: if the
    // session was still mid-transition, one refresh-and-retry almost always
    // clears it without bothering the person with an error for something
    // that was never really their password.
    if (updateError) {
      await supabase.auth.refreshSession()
      ;({ error: updateError } = await supabase.auth.updateUser({ password }))
    }

    if (updateError) {
      setStatus('idle')
      setError('Could not set that password. Try again.')
      return
    }

    const { error: rpcError } = await supabase.rpc('mark_password_set')
    if (rpcError) {
      setStatus('idle')
      setError('Password was set, but something went wrong finishing up. Try signing in again.')
      return
    }

    window.location.replace(safeReturnTo(returnTo))
  }

  if (status === 'checking') {
    return <p className="text-sm text-[var(--tt-ink-2)]">Checking your session …</p>
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <ErrorState title="Could not set password" description={error} /> : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="tt-password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="tt-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-[44px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[16px] text-[var(--tt-ink)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="tt-password-confirm" className="text-sm font-medium">
          Confirm password
        </label>
        <input
          id="tt-password-confirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="min-h-[44px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[16px] text-[var(--tt-ink)]"
        />
      </div>

      <Button type="submit" block disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving …' : 'Set password'}
      </Button>
    </form>
  )
}
