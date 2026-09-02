'use client'

import * as React from 'react'

import { Button } from '@/components/todotwo/ui/button'

/**
 * TodoTwo's error boundary. Scoped to this segment so a fault here never takes
 * down the storefront's own error handling.
 */
export default function TodoTwoError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // Message only — never the stack or any payload, which can carry personal data.
    console.error('[todotwo] render error', { digest: error.digest, message: error.message })
  }, [error])

  return (
    <div className="flex min-h-[60svh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--tt-rule)] bg-[var(--tt-surface)] p-6">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-[var(--tt-ink-2)]">
          TodoTwo could not display this page. Try again — if it keeps happening, tell Kenneth.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-[var(--tt-ink-3)]">Reference: {error.digest}</p>
        ) : null}
        <Button onClick={reset} className="mt-5">
          Try again
        </Button>
      </div>
    </div>
  )
}
