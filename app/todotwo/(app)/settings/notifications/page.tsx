import type { Metadata } from 'next'

import { PushNotificationsManager } from '@/components/todotwo/settings/push-notifications-manager'
import { requireTodoTwoUser } from '@/lib/todotwo/auth'
import { getVapidPublicKey } from '@/lib/todotwo/config'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

export const metadata: Metadata = { title: 'Notifications' }
export const dynamic = 'force-dynamic'

export default async function TodoTwoNotificationsSettingsPage() {
  await requireTodoTwoUser(`${TODOTWO_BASE}/settings/notifications`)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Notifications</h1>
        <p className="text-sm text-[var(--tt-ink-2)]">
          TodoTwo emails you for handoffs and reminders. Turn on push here to also see them show up
          right on this device.
        </p>
      </header>

      <PushNotificationsManager vapidPublicKey={getVapidPublicKey()} />
    </div>
  )
}
