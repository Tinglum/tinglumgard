'use client'

import * as React from 'react'
import { Bell, BellOff } from 'lucide-react'

import { Button } from '@/components/todotwo/ui/button'
import { ErrorState, Surface } from '@/components/todotwo/ui/states'
import { defaultPushEnv, disablePush, enablePush, getPushStatus } from '@/lib/todotwo/pwa/push'

/**
 * Enable/disable Web Push for this browser.
 *
 * State is read from the browser itself (Notification.permission, the active
 * subscription) rather than from any local flag, so this always reflects
 * reality even if the user cleared site data or revoked the permission from
 * the OS since the last visit.
 *
 * VAPID_PUBLIC_KEY comes in as a prop from the server component so it can be
 * read once via getVapidPublicKey() there — this file stays a plain client
 * component with no config import of its own.
 */

type Status = 'checking' | 'unsupported' | 'disabled' | 'denied' | 'enabled'

export function PushNotificationsManager({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [status, setStatus] = React.useState<Status>('checking')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Everything below goes through lib/todotwo/pwa/push.ts, the same helper
  // the onboarding prompt uses — they previously checked one registration and
  // subscribed through another, which is why "enabled" never stuck.
  const refresh = React.useCallback(async () => {
    if (!vapidPublicKey) {
      setStatus('unsupported')
      return
    }
    setStatus(await getPushStatus(defaultPushEnv()))
  }, [vapidPublicKey])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleEnable() {
    setError(null)
    setBusy(true)
    const result = await enablePush(defaultPushEnv(), vapidPublicKey)
    setBusy(false)
    if (result.ok) {
      setStatus('enabled')
      return
    }
    if (result.reason === 'denied') {
      setStatus('denied')
      return
    }
    setError(result.message)
    setStatus('disabled')
  }

  async function handleDisable() {
    setError(null)
    setBusy(true)
    try {
      await disablePush(defaultPushEnv())
      setStatus('disabled')
    } catch {
      setError('Could not turn off notifications. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <ErrorState title="Notifications" description={error} /> : null}

      <Surface className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-medium">Push notifications</p>
          <p className="text-xs text-[var(--tt-ink-3)]">
            {status === 'checking' && 'Checking…'}
            {status === 'unsupported' && 'Not available on this browser or device.'}
            {status === 'denied' &&
              'Blocked in your browser settings. Allow notifications for this site to turn it on.'}
            {status === 'disabled' && 'Get a notification here for handoffs and reminders, on top of email.'}
            {status === 'enabled' && 'On for this device.'}
          </p>
        </div>

        {status === 'enabled' ? (
          <Button type="button" variant="secondary" size="sm" onClick={handleDisable} disabled={busy}>
            <BellOff className="h-4 w-4" aria-hidden="true" />
            Turn off
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleEnable}
            disabled={busy || status === 'unsupported' || status === 'denied' || status === 'checking'}
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            Enable
          </Button>
        )}
      </Surface>
    </div>
  )
}
