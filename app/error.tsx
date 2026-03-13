'use client'

import { useEffect, useMemo } from 'react'

type AppErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

const CHUNK_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
]

function isChunkLoadError(message: string): boolean {
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

export default function AppError({ error, reset }: AppErrorProps) {
  const message = String(error?.message || '')
  const chunkError = useMemo(() => isChunkLoadError(message), [message])

  useEffect(() => {
    // Keep this visible in browser logs while also surfacing the digest for server traces.
    console.error('Unhandled client error in app route', {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
    })

    if (typeof window !== 'undefined') {
      const payload = {
        message: error?.message || null,
        digest: error?.digest || null,
        stack: error?.stack || null,
        pathname: window.location.pathname,
        search: window.location.search,
        href: window.location.href,
        timestamp: new Date().toISOString(),
      }

      const body = JSON.stringify(payload)
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/client-error', new Blob([body], { type: 'application/json' }))
      } else {
        void fetch('/api/client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => null)
      }
    }

    // Hotfix: recover automatically from stale deploy chunks once per session.
    if (chunkError && typeof window !== 'undefined') {
      const key = '__tg_chunk_reload_once__'
      const alreadyReloaded = window.sessionStorage.getItem(key) === '1'
      if (!alreadyReloaded) {
        window.sessionStorage.setItem(key, '1')
        window.location.reload()
      }
    }
  }, [chunkError, error])

  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center px-4">
      <div className="max-w-xl w-full rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-3">Noe gikk galt</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Siden fikk en uventet feil. Prøv igjen. Hvis feilen fortsetter, kontakt oss så hjelper vi deg.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl bg-neutral-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-neutral-800"
          >
            Prøv igjen
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 text-neutral-900 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
          >
            Gå til forsiden
          </a>
        </div>
      </div>
    </div>
  )
}
