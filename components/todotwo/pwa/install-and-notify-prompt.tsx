'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Download, Settings, X } from 'lucide-react'

import { Button } from '@/components/todotwo/ui/button'
import {
  consumeInstallPrompt,
  isIos,
  isStandalone,
  onInstallPromptChange,
  type InstallPromptEvent,
} from '@/lib/todotwo/pwa/install-prompt'
import { defaultPushEnv, enablePush, getPushStatus } from '@/lib/todotwo/pwa/push'
import { isSnoozed, snoozeUntil } from '@/lib/todotwo/pwa/prompt-snooze'

/**
 * Getting TodoTwo onto the phone, and notifications actually switched on.
 *
 * Modelled on the LocalVIP onboarding prompt, including the bug that one was
 * fixed for: `beforeinstallprompt` fires ONCE and early. A component that only
 * mounts after sign-in has already missed it, and the install button can then
 * never work — so this is mounted in the TodoTwo layout, above the login page
 * as well as the app.
 *
 * Two stages, because they are two different permissions and asking for both
 * at once gets both refused:
 *
 *   install — Android and desktop Chrome can be prompted directly. iOS cannot:
 *             Safari has no install API, so the Share → Add to Home Screen
 *             route is spelled out instead.
 *   notify  — only offered once the app is installed. On iOS, web push does
 *             not exist at all until the app is on the Home Screen, so asking
 *             beforehand would be asking for something the browser cannot give.
 */

/**
 * "Not now" is remembered on the device, for a while.
 *
 * It used to last for the session only. An installed PWA — iOS especially —
 * starts a fresh session nearly every time it is opened, so "Not now" meant
 * "until you next open the app", and the prompt came back again and again.
 * Now it is a dated snooze in localStorage (see prompt-snooze.ts): a few days
 * for installing, two weeks for notifications. Settings is always there for
 * somebody who changes their mind sooner.
 */
const SNOOZE_KEY = 'todotwo:pwa-onboarding-snooze:v3'
const INSTALL_SNOOZE_DAYS = 3
const NOTIFY_SNOOZE_DAYS = 14

/** True once the browser has refused outright; nagging cannot undo that. */
const NOTIFY_DENIED = 'todotwo:pwa-notify-denied:v1'

/**
 * Screens this must never cover.
 *
 * The prompt is a full-screen overlay, and on the login page it sat directly
 * on top of the form: every tap meant for "Sign in" hit the backdrop instead,
 * so people simply could not get in. Nothing about the prompt was visibly
 * broken, which is what made it nasty.
 *
 * The listener still has to live above the login page — beforeinstallprompt
 * fires once and early, and a component mounted after sign-in has already
 * missed it. So the event is still captured here; only the modal is withheld
 * until somebody is actually through the door, which is also the first moment
 * "put this on your phone" means anything to them.
 */
const AUTH_SCREENS = ['/todotwo/login', '/todotwo/auth', '/todotwo/set-password']

function isAuthScreen(pathname: string | null): boolean {
  if (!pathname) return false
  return AUTH_SCREENS.some((base) => pathname === base || pathname.startsWith(`${base}/`))
}

export function InstallAndNotifyPrompt({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const pathname = usePathname()
  const onAuthScreen = isAuthScreen(pathname)
  const [installEvent, setInstallEvent] = React.useState<InstallPromptEvent | null>(null)
  const [open, setOpen] = React.useState(false)
  const [stage, setStage] = React.useState<'install' | 'notify'>('install')
  const [ios, setIos] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [blocked, setBlocked] = React.useState(false)
  const [note, setNote] = React.useState<string | null>(null)

  // The install offer is held by lib/todotwo/pwa/install-prompt, which starts
  // listening at module load. beforeinstallprompt fires once and only reaches
  // whoever is listening at that moment, so a component that owns the listener
  // privately also owns installing — and when it stays closed, nothing else
  // can offer it. Settings reads the same store.
  React.useEffect(() => {
    setIos(isIos())

    const stopWatching = onInstallPromptChange(setInstallEvent)

    const installed = () => {
      setStage('notify')
      setOpen(true)
    }
    window.addEventListener('appinstalled', installed)

    return () => {
      stopWatching()
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    // Never over the sign-in form. See isAuthScreen.
    if (onAuthScreen) return
    if (isSnoozed(window.localStorage, SNOOZE_KEY)) return

    let cancelled = false
    let timeout: number | undefined

    void (async () => {
      const standalone = isStandalone()

      if (standalone) {
        const env = defaultPushEnv()
        if (!env) return
        // A hard refusal cannot be undone from here, so asking again every
        // visit would only be noise.
        if (env.permission() === 'denied') {
          window.localStorage.setItem(NOTIFY_DENIED, '1')
          return
        }
        // Already on for this device: stop. This looks at TodoTwo's OWN
        // registration (not the storefront worker that may control Today) and
        // re-sends the subscription to the server, so a device the server
        // forgot is healed silently instead of re-prompting.
        if ((await getPushStatus(env)) === 'enabled') return
        if (cancelled) return
        setStage('notify')
      } else {
        setStage('install')
      }

      // A moment's grace so it does not land on top of a page still painting.
      timeout = window.setTimeout(() => {
        if (!cancelled) setOpen(true)
      }, 1200)
    })()

    return () => {
      cancelled = true
      if (timeout) window.clearTimeout(timeout)
    }
  }, [onAuthScreen])

  function close() {
    if (typeof window !== 'undefined') {
      snoozeUntil(
        window.localStorage,
        SNOOZE_KEY,
        stage === 'notify' ? NOTIFY_SNOOZE_DAYS : INSTALL_SNOOZE_DAYS
      )
    }
    setOpen(false)
  }

  async function install() {
    if (installEvent) {
      await installEvent.prompt()
      const choice = await installEvent.userChoice
      consumeInstallPrompt()
      if (choice.outcome === 'accepted') setStage('notify')
      return
    }

    // No install API here. On iOS that is expected; elsewhere it usually means
    // the browser has decided the app is not installable yet.
    setNote(
      ios
        ? 'Tap the Share button below, then choose “Add to Home Screen”.'
        : 'Open your browser menu and choose “Install app”.'
    )
  }

  async function enableNotifications() {
    setBusy(true)
    setNote(null)
    setBlocked(false)

    // Shared with Settings → Notifications, so the two cannot diverge again.
    const result = await enablePush(defaultPushEnv(), vapidPublicKey)
    setBusy(false)

    if (result.ok) {
      setOpen(false)
      return
    }
    if (result.reason === 'denied') {
      setBlocked(true)
      window.localStorage.setItem(NOTIFY_DENIED, '1')
      return
    }
    setNote(result.message)
  }

  // Belt and braces: even if something else opened it, it never covers sign-in.
  if (!open || onAuthScreen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="todotwo-pwa-title"
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--tt-rule)] bg-[var(--tt-surface)] p-5 shadow-xl">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-2 text-[var(--tt-ink-3)] hover:bg-[var(--tt-surface-2)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {stage === 'install' ? (
          <div className="flex flex-col gap-3">
            <h2 id="todotwo-pwa-title" className="text-xl">
              Put TodoTwo on your phone
            </h2>
            <p className="text-sm text-[var(--tt-ink-2)]">
              The day&rsquo;s work, one tap away — and it is the only way to get a nudge when
              something lands on you.
              {ios ? ' On iPhone this has to be done from the Share menu.' : ''}
            </p>

            <Button onClick={install} block>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {ios ? 'How to add it' : 'Install TodoTwo'}
            </Button>
            <Button variant="ghost" onClick={close} block>
              Not now
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 id="todotwo-pwa-title" className="text-xl">
              Get a nudge when work changes
            </h2>
            <p className="text-sm text-[var(--tt-ink-2)]">
              A quiet notification when something is given to you, taken off you, or somebody asks
              the group for help. Nothing else.
            </p>

            {blocked ? (
              <div className="flex flex-col gap-2 rounded-md bg-[var(--tt-warn-soft)] p-3">
                <p className="text-[13px] font-medium">Notifications are blocked</p>
                <p className="text-[13px] text-[var(--tt-ink-2)]">
                  {ios
                    ? 'Open Settings, find TodoTwo, and turn Allow Notifications on. Then come back and try again.'
                    : 'Allow notifications for this site in your browser settings, then try again.'}
                </p>
                <Button variant="secondary" onClick={enableNotifications} disabled={busy} block>
                  <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                  Try again
                </Button>
              </div>
            ) : (
              <Button onClick={enableNotifications} disabled={busy} block>
                <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
                {busy ? 'Turning on …' : 'Turn on notifications'}
              </Button>
            )}

            <Button variant="ghost" onClick={close} block>
              Not now
            </Button>
          </div>
        )}

        {note ? <p className="mt-3 text-[13px] text-[var(--tt-ink-2)]">{note}</p> : null}

        <p className="mt-3 text-[12px] text-[var(--tt-ink-3)]">
          You can change this any time in Settings → Notifications.
        </p>
      </div>
    </div>
  )
}
