import { CloudOff } from 'lucide-react'

import { OfflineActions } from '@/components/todotwo/pwa/offline-actions'
import { Surface } from '@/components/todotwo/ui/states'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Offline' }

/**
 * The fallback the service worker serves when a screen was never cached.
 *
 * It lives behind authentication like every other TodoTwo screen, which is why
 * the worker fetches and caches it while the session is still live rather than
 * at install time.
 *
 * Reachable online too, and that is on purpose: a page nobody can open is a
 * page nobody can check.
 */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--tt-accent)]">TodoTwo</p>
        <h1 className="text-2xl">Nothing saved for this screen</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          You are looking at this because there is no signal and TodoTwo has no copy of the screen
          you asked for.
        </p>
      </header>

      <Surface className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-[var(--tt-ink-3)]" aria-hidden="true" />
          <div className="flex flex-col gap-2 text-[14px] text-[var(--tt-ink-2)]">
            <p>
              TodoTwo keeps a copy of every screen you have opened with a signal. Today is the one
              worth opening before you walk out — it will still be there in the barn.
            </p>
            <p>
              Offline is read-only. Ticking a task off needs the network, so anything you complete
              out here has to be entered when you are back in range.
            </p>
          </div>
        </div>

        <OfflineActions />
      </Surface>
    </div>
  )
}
