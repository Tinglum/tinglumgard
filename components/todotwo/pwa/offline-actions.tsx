'use client'

import * as React from 'react'
import Link from 'next/link'

import { Button } from '@/components/todotwo/ui/button'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

/**
 * The two things that are actually useful on the offline screen: try again, and
 * go to Today, which is the screen most likely to be in the cache.
 *
 * The retry button reports the browser's own view of connectivity rather than
 * pretending — `navigator.onLine` is only ever trustworthy in the negative, so
 * the copy says "try" instead of "you are online".
 */
export function OfflineActions() {
  const [online, setOnline] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => window.location.reload()} size="lg" block>
          Try again
        </Button>
        <Button asChild variant="secondary" size="lg" block>
          <Link href={TODOTWO_BASE}>Go to Today</Link>
        </Button>
      </div>

      {online === false ? (
        <p className="text-[13px] text-[var(--tt-ink-3)]">
          Your phone still reports no connection.
        </p>
      ) : null}
    </div>
  )
}
