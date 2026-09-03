'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, Info, Megaphone } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/todotwo/ui/button'
import { Surface } from '@/components/todotwo/ui/states'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import type { AnnouncementView } from '@/lib/todotwo/notifications/queries'

/**
 * One notice, with the button that records having read it.
 *
 * Acknowledging writes straight through the session-bound browser client. The
 * insert policy checks that the row is your own and that the announcement is
 * actually published, so there is nothing here for a route handler to add
 * beyond a round trip.
 *
 * Acknowledgement is one-way. There is no undo, because the whole value of the
 * table is being able to say who had seen the thing about the vet.
 */

const URGENCY = {
  info: { label: 'Info', icon: Info, tone: 'text-[var(--tt-ink-3)]' },
  important: { label: 'Important', icon: Megaphone, tone: 'text-[var(--tt-accent)]' },
  urgent: { label: 'Urgent', icon: AlertTriangle, tone: 'text-[var(--tt-danger)]' },
} as const

function formatWhen(iso: string | null): string {
  if (!iso) return 'Draft'
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Oslo',
  }).format(new Date(iso))
}

export function AnnouncementCard({
  announcement,
  personId,
}: {
  announcement: AnnouncementView
  personId: string
}) {
  const router = useRouter()
  const [acknowledged, setAcknowledged] = React.useState(announcement.acknowledgedByMe)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const urgency = URGENCY[announcement.urgency]
  const Icon = urgency.icon

  async function acknowledge() {
    setPending(true)
    setError(null)
    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: insertError } = await supabase
        .from('announcement_acknowledgements')
        .insert({ announcement_id: announcement.id, person_id: personId })

      // 23505 is the unique violation: already acknowledged, in another tab or
      // on another day. That is the desired state, not a failure.
      if (insertError && insertError.code !== '23505') {
        setError(insertError.message)
        return
      }

      setAcknowledged(true)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <Surface className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]',
              urgency.tone
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {urgency.label}
          </span>
          <h2 className="text-[17px] font-semibold leading-snug">{announcement.title}</h2>
          <p className="text-[12px] text-[var(--tt-ink-3)]">
            {formatWhen(announcement.publishedAt)}
            {announcement.authorName ? ` · ${announcement.authorName}` : ''}
          </p>
        </div>

        {acknowledged ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[13px] text-[var(--tt-accent)]">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Read
          </span>
        ) : null}
      </div>

      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--tt-ink-2)]">
        {announcement.body}
      </p>

      {announcement.publishedAt && !acknowledged ? (
        <div>
          <Button size="sm" variant="secondary" onClick={acknowledge} disabled={pending}>
            {pending ? 'Saving …' : 'Mark as read'}
          </Button>
        </div>
      ) : null}

      {announcement.reach ? (
        <p className="border-t border-[var(--tt-rule)] pt-3 text-[12px] text-[var(--tt-ink-3)]">
          {announcement.reach.acknowledgedCount} read
          {' · '}
          {announcement.reach.notificationsSent} emailed
          {announcement.reach.notificationsPending > 0
            ? ` · ${announcement.reach.notificationsPending} queued`
            : ''}
          {announcement.reach.notificationsFailed > 0
            ? ` · ${announcement.reach.notificationsFailed} could not be delivered`
            : ''}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
    </Surface>
  )
}
