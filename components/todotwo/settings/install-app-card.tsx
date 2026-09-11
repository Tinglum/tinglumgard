'use client'

import * as React from 'react'

import { Button } from '@/components/todotwo/ui/button'
import {
  consumeInstallPrompt,
  isIos,
  isStandalone,
  onInstallPromptChange,
  type InstallPromptEvent,
} from '@/lib/todotwo/pwa/install-prompt'

/**
 * Installing the app, somewhere you can always find it.
 *
 * The onboarding modal offers this too, but it is a one-shot: it withholds
 * itself on the sign-in screens, stays quiet for the rest of the session once
 * anybody taps "Not now", and Chrome only offers the install event once per
 * page. When it does not appear there was previously nowhere else to go, which
 * is exactly what happened to somebody signing in on Android and finding no
 * prompt and no button.
 *
 * This says the same thing without any of those conditions attached. It also
 * tells the truth per platform rather than showing a button that cannot work:
 * iOS has no install API at all, so the Share-sheet route is spelled out
 * instead of being hidden behind a dead control.
 */
export function InstallAppCard() {
  const [installEvent, setInstallEvent] = React.useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = React.useState(false)
  const [ios, setIos] = React.useState(false)
  const [note, setNote] = React.useState<string | null>(null)

  React.useEffect(() => {
    setInstalled(isStandalone())
    setIos(isIos())
    return onInstallPromptChange(setInstallEvent)
  }, [])

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    consumeInstallPrompt()
    setNote(
      choice.outcome === 'accepted'
        ? 'Installed. Open TodoTwo from your home screen from now on.'
        : 'Not installed. You can do it any time from here.'
    )
  }

  if (installed) {
    return (
      <section className="flex flex-col gap-1 rounded-md border border-[var(--tt-rule)] p-4">
        <h2 className="text-[15px] font-semibold">The app is installed</h2>
        <p className="text-[13px] text-[var(--tt-ink-2)]">
          You are using the installed version on this device. Nothing else to do here.
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-2 rounded-md border border-[var(--tt-rule)] p-4">
      <h2 className="text-[15px] font-semibold">Put TodoTwo on your phone</h2>
      <p className="text-[13px] text-[var(--tt-ink-2)]">
        The day’s work one tap away, and it keeps working when the signal does not.
      </p>

      {installEvent ? (
        <Button size="sm" className="self-start" onClick={install}>
          Install TodoTwo
        </Button>
      ) : (
        <p className="text-[13px] text-[var(--tt-ink-2)]">
          {ios ? (
            <>
              On iPhone: tap the <strong>Share</strong> button at the bottom of Safari, then{' '}
              <strong>Add to Home Screen</strong>. Notifications only work once it is on the home
              screen — that is an Apple restriction, not a setting here.
            </>
          ) : (
            <>
              Open your browser menu (⋮) and choose <strong>Install app</strong> or{' '}
              <strong>Add to Home screen</strong>. On Android you can also turn notifications on
              below without installing anything.
            </>
          )}
        </p>
      )}

      {note ? <p className="text-[13px] text-[var(--tt-ink-2)]">{note}</p> : null}
    </section>
  )
}
