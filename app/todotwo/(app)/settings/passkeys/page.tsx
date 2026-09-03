import type { Metadata } from 'next'

import { PasskeyManager } from '@/components/todotwo/settings/passkey-manager'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const metadata: Metadata = { title: 'Passkeys' }
export const dynamic = 'force-dynamic'

export default async function TodoTwoPasskeysPage() {
  await requireTodoTwoUser(`${TODOTWO_BASE}/settings/passkeys`)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Passkeys</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          Sign in with Face ID, Touch ID, or Windows Hello instead of typing a password.
        </p>
      </header>

      <PasskeyManager />
    </div>
  )
}
