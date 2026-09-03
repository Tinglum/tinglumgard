'use client'

import * as React from 'react'
import { CloudOff, RefreshCw, WifiOff } from 'lucide-react'

import { describeCacheAge, type CacheAge } from '@/lib/todotwo/pwa/staleness'

/**
 * The honesty layer.
 *
 * Two different truths, never conflated:
 *
 *   1. "You are offline."  — the network is gone. Nothing you tick will save.
 *   2. "This is a saved copy." — the service worker served this document from
 *      cache, so what is on screen is as of a stated moment, not now.
 *
 * (2) is decided by `window.__TODOTWO_CACHED_AT__`, which only the service
 * worker sets, and only on a response it took out of the cache. A live document
 * never has it. There is no guessing, so cached work is never presented as
 * current.
 *
 * The banner sits above the content rather than floating over it, because a
 * notice that covers the first task is a notice people learn to ignore.
 */
export function ConnectionBanner() {
  const [online, setOnline] = React.useState(true)
  const [age, setAge] = React.useState<CacheAge | null>(null)
  const [reloading, setReloading] = React.useState(false)

  const cachedAt = React.useRef<string | null>(null)

  React.useEffect(() => {
    cachedAt.current = window.__TODOTWO_CACHED_AT__ || null
    setOnline(navigator.onLine)
    setAge(describeCacheAge(cachedAt.current))

    const sync = () => setOnline(navigator.onLine)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)

    // The label has to keep counting up. A stale notice that froze at
    // "2 minutes ago" an hour ago is worse than none.
    const timer = window.setInterval(() => setAge(describeCacheAge(cachedAt.current)), 30_000)

    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
      window.clearInterval(timer)
    }
  }, [])

  if (age) {
    return (
      <Bar
        tone={age.stale ? 'warn' : 'neutral'}
        icon={CloudOff}
        title={age.stale ? 'Saved copy, and not a recent one' : 'Saved copy'}
        detail={`Last refreshed ${age.label}.${online ? '' : ' You are offline.'}`}
        action={
          online
            ? {
                label: reloading ? 'Refreshing …' : 'Refresh',
                disabled: reloading,
                onClick: () => {
                  setReloading(true)
                  window.location.reload()
                },
              }
            : undefined
        }
      />
    )
  }

  if (!online) {
    return (
      <Bar
        tone="warn"
        icon={WifiOff}
        title="No connection"
        detail="This page is still the live version you loaded. Nothing you change will save until you are back online."
      />
    )
  }

  return null
}

function Bar({
  tone,
  icon: Icon,
  title,
  detail,
  action,
}: {
  tone: 'warn' | 'neutral'
  icon: typeof WifiOff
  title: string
  detail: string
  action?: { label: string; disabled?: boolean; onClick: () => void }
}) {
  const warn = tone === 'warn'

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 border-b px-4 py-3 text-[13px]"
      style={{
        borderColor: 'var(--tt-rule)',
        backgroundColor: warn ? 'var(--tt-warn-soft)' : 'var(--tt-surface-2)',
        color: warn ? 'var(--tt-warn)' : 'var(--tt-ink-2)',
        // Notched phones in standalone mode: the banner is the topmost thing on
        // screen, so it owns the inset.
        paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
      }}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5" style={{ color: 'var(--tt-ink-2)' }}>
          {detail}
        </p>
      </div>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          className="-my-1 flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium underline underline-offset-2 disabled:opacity-60"
          style={{ color: 'var(--tt-accent)' }}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {action.label}
        </button>
      ) : null}
    </div>
  )
}
