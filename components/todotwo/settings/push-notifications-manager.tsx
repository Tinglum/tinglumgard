'use client'

import * as React from 'react'
import { Bell, BellOff } from 'lucide-react'

import { Button } from '@/components/todotwo/ui/button'
import { ErrorState, Surface } from '@/components/todotwo/ui/states'
import { TODOTWO_SW_URL } from '@/lib/todotwo/pwa/constants'

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

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export function PushNotificationsManager({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [status, setStatus] = React.useState<Status>('checking')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!vapidPublicKey || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration(TODOTWO_SW_URL)
      const subscription = await registration?.pushManager.getSubscription()
      setStatus(subscription ? 'enabled' : 'disabled')
    } catch {
      setStatus('disabled')
    }
  }, [vapidPublicKey])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleEnable() {
    if (!vapidPublicKey) return
    setError(null)
    setBusy(true)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'disabled')
        setBusy(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      const json = subscription.toJSON()
      const response = await fetch('/api/todotwo/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      })

      if (!response.ok) throw new Error('subscribe_failed')

      setStatus('enabled')
    } catch {
      setError('Could not enable notifications. Try again.')
      setStatus('disabled')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setError(null)
    setBusy(true)

    try {
      const registration = await navigator.serviceWorker.getRegistration(TODOTWO_SW_URL)
      const subscription = await registration?.pushManager.getSubscription()

      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()
        await fetch('/api/todotwo/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        }).catch(() => undefined)
      }

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
