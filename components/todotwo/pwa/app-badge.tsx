'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'

import { applyAppBadge, countOpenTasks, isBadgePathname } from '@/lib/todotwo/pwa/badge'

/**
 * Keeps the installed icon's badge in step with what is left today. Renders
 * nothing, and does nothing at all on a browser without the Badging API.
 *
 * It watches the DOM rather than subscribing to data, because completion is
 * optimistic inside TaskRow — the tick lands before the server hears about it,
 * and the badge should drop at the same moment, not a round trip later.
 */
export function AppBadge() {
  const pathname = usePathname()

  React.useEffect(() => {
    if (!isBadgePathname(pathname)) return

    const main = document.querySelector('main')
    if (!main) return

    let frame = 0
    const update = () => {
      window.cancelAnimationFrame(frame)
      // One frame of coalescing: completing a task mutates several attributes.
      frame = window.requestAnimationFrame(() => {
        void applyAppBadge(countOpenTasks(main), navigator)
      })
    }

    update()

    const observer = new MutationObserver(update)
    observer.observe(main, { subtree: true, childList: true, attributeFilter: ['aria-pressed'] })

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [pathname])

  return null
}
