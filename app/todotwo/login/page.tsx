import type { Metadata } from 'next'

import { LoginForm } from '@/app/todotwo/login/login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function TodoTwoLoginPage({
  searchParams,
}: {
  searchParams?: { returnTo?: string; error?: string }
}) {
  return (
    <div className="flex min-h-[100svh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--tt-accent)]">
            Tinglumgård
          </p>
          <h1 className="mt-1 text-2xl">TodoTwo</h1>
          <p className="mt-2 text-sm text-[var(--tt-ink-2)]">
            Enter your email address and we will send you a sign-in link.
          </p>
        </div>

        <LoginForm returnTo={searchParams?.returnTo} initialError={searchParams?.error} />
      </div>
    </div>
  )
}
