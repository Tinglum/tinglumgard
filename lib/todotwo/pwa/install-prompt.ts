'use client'

/**
 * One place that remembers Chrome's install offer.
 *
 * `beforeinstallprompt` fires once, early, and only ever reaches whoever is
 * listening at that moment. That made the onboarding modal the sole owner of
 * installing: if it did not appear — dismissed earlier in the session, opened
 * on a screen it withholds itself from, or simply missed — there was no other
 * way to install the app anywhere in the UI, and no way to ask for it again.
 * Aleksandra signed in on Android and never saw it, and there was nothing to
 * point her at.
 *
 * So the event is captured here at module load, held, and handed to anybody
 * who asks. Listeners are told when it arrives so a card rendered before the
 * event can still light up.
 */

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<(event: InstallPromptEvent | null) => void>()

function announce() {
  listeners.forEach((listener) => listener(deferred))
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Held rather than shown: the app decides when to ask, not the browser.
    event.preventDefault()
    deferred = event as InstallPromptEvent
    announce()
  })

  window.addEventListener('appinstalled', () => {
    deferred = null
    announce()
  })
}

export function getInstallPrompt(): InstallPromptEvent | null {
  return deferred
}

/** Returns an unsubscribe function. Fires immediately with current state. */
export function onInstallPromptChange(
  listener: (event: InstallPromptEvent | null) => void
): () => void {
  listeners.add(listener)
  listener(deferred)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Chrome will not hand out a second event for the same page, so an offer that
 * has been used is spent and must not be shown as available again.
 */
export function consumeInstallPrompt(): void {
  deferred = null
  announce()
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own flag, which predates the standard.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
