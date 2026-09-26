'use client'

import * as React from 'react'

import { ensureTodoTwoRegistration } from '@/lib/todotwo/pwa/push'

/**
 * Registers the TodoTwo service worker. Renders nothing.
 *
 * Registration is deliberately late (`requestIdleCallback`, or a timeout where
 * that does not exist) so the worker never competes with the first paint on a
 * phone on farm 4G.
 *
 * A failed registration is not an error worth showing anyone: the app works
 * without it, only without an offline copy. It is logged to the console and
 * otherwise ignored.
 */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    let cancelled = false

    const register = () => {
      if (cancelled) return
      // Shared with push setup (lib/todotwo/pwa/push.ts) so the two can never
      // end up talking about different registrations. In production this
      // lands on scope /todotwo/ — Netlify does not send Service-Worker-Allowed
      // for a static file — which is fine: push does not need the page to be
      // controlled, only the registration to exist.
      ensureTodoTwoRegistration({ serviceWorker: navigator.serviceWorker })
        .then((registration) => {
          // A new worker that is already waiting means the app was updated
          // while a tab stayed open. Take it immediately — TodoTwo has no
          // client state worth preserving across a version change.
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'TODOTWO_SKIP_WAITING' })
          }
        })
        .catch((error) => {
          console.warn('[todotwo] service worker registration failed', error)
        })
    }

    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback
    const handle = idle ? idle(register) : window.setTimeout(register, 1500)

    return () => {
      cancelled = true
      if (!idle) window.clearTimeout(handle)
    }
  }, [])

  return null
}
