import type { Metadata } from 'next'

import { SetPasswordForm } from '@/app/todotwo/set-password/set-password-form'

export const metadata: Metadata = { title: 'Set a password' }

export default function TodoTwoSetPasswordPage({
  searchParams,
}: {
  searchParams?: { returnTo?: string }
}) {
  return (
    <div className="flex min-h-[100svh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--tt-accent)]">
            Tinglumgård
          </p>
          <h1 className="mt-1 text-2xl">Set a password</h1>
          <p className="mt-2 text-sm text-[var(--tt-ink-2)]">
            You are signed in. Choose a password so you can sign in directly next time — a
            sign-in link will always work too if you ever forget it.
          </p>
        </div>

        <SetPasswordForm returnTo={searchParams?.returnTo} />
      </div>
    </div>
  )
}
