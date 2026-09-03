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

    const { error: updateError } = await supabase.auth.updateUser({ password })
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
