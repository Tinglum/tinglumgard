'use client'

import * as React from 'react'
import { RefreshCw, X } from 'lucide-react'

const MIN_CHECK_INTERVAL_MS = 2 * 60 * 1000

/**
 * Detects when a newer Netlify deploy is live while the user has TodoTwo open
 * (including iOS/Android home-screen PWAs that stay suspended in memory for
 * days) and offers a sleek one-tap refresh banner.
 */
export function AppUpdateBanner({ currentVersion }: { currentVersion: string }) {
  const [updateAvailable, setUpdateAvailable] = React.useState(false)
  const [dismissed, setDismissed] = React.useState(false)
  const [reloading, setReloading] = React.useState(false)
  const lastCheckedRef = React.useRef<number>(Date.now())

  React.useEffect(() => {
    if (!currentVersion || currentVersion === 'dev') return

    let active = true

    async function checkForUpdate() {
      if (!active || updateAvailable) return
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      const now = Date.now()
      if (now - lastCheckedRef.current < MIN_CHECK_INTERVAL_MS) return
      lastCheckedRef.current = now

      try {
        const res = await fetch('/api/todotwo/version', {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        if (!res.ok) return
        const data = (await res.json()) as { version?: string }
        if (
          active &&
          data.version &&
          data.version !== 'dev' &&
          data.version !== currentVersion
        ) {
          setUpdateAvailable(true)
        }
      } catch {
        // Offline or transient network blip — ignore silently.
      }
    }

    function onVisibilityOrFocus() {
      if (document.visibilityState === 'visible') {
        void checkForUpdate()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)

    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
    }
  }, [currentVersion, updateAvailable])

  if (!updateAvailable || dismissed) return null

  function handleReload() {
    setReloading(true)
    window.location.reload()
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-[var(--tt-accent-ring)] bg-[var(--tt-ink)] px-4 py-3 text-[var(--tt-surface)] shadow-[var(--tt-shadow-float)] md:bottom-6"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--tt-accent)] text-[var(--tt-on-accent)]">
          <RefreshCw
            className={reloading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold">New update ready</p>
          <p className="truncate text-[12px] opacity-80">Tap to load the latest TodoTwo</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={handleReload}
          disabled={reloading}
          className="rounded-xl bg-[var(--tt-accent)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--tt-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {reloading ? 'Updating…' : 'Update'}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss update notice"
          className="flex h-7 w-7 items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
