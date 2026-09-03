import type { NotificationChannel } from '@/lib/todotwo/notifications/types'

/**
 * The idempotency key for a notification.
 *
 * This is the single thing standing between the farm and a duplicate email, so
 * it is a pure function with one definition and a test that pins the exact
 * string. The database mirrors it in todotwo.notification_dedupe_key(), because
 * announcements fan out from a SQL trigger; tests/todotwo/rls asserts the two
 * produce the same output for the same input.
 *
 * Format: `<topic>:<referenceId or ->:<personId>:<channel>`
 *
 * Topic is lower-cased and trimmed so 'Announcement' and 'announcement ' are
 * the same notification rather than two. Nothing else is normalised: ids come
 * from the database and are already canonical.
 */
export function notificationDedupeKey(input: {
  topic: string
  referenceId?: string | null
  personId: string
  channel: NotificationChannel
}): string {
  const topic = input.topic.trim().toLowerCase()

  if (topic.length === 0) throw new Error('A notification needs a topic')
  if (input.personId.trim().length === 0) throw new Error('A notification needs a recipient')

  const reference = input.referenceId?.trim() ? input.referenceId.trim() : '-'

  return `${topic}:${reference}:${input.personId}:${input.channel}`
}
