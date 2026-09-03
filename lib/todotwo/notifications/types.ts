/**
 * Shared shapes for the notification outbox.
 *
 * Kept separate from the logic modules so the pure functions in dedupe.ts and
 * retry.ts can be imported by tests without dragging in a Supabase client or
 * the network.
 */

export const NOTIFICATION_CHANNELS = ['email'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const NOTIFICATION_STATUSES = ['pending', 'sent', 'failed'] as const
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number]

/** The columns the dispatcher reads. Deliberately a subset of the table. */
export interface OutboxRow {
  id: string
  person_id: string
  channel: NotificationChannel
  recipient_email: string
  subject: string
  body: string
  status: NotificationStatus
  attempts: number
  next_attempt_at: string
  dedupe_key: string
}

export interface SendResult {
  /** The provider accepted the message. */
  sent: boolean
  /** Provider message id, when it gave one. */
  providerId?: string
  error?: string
  /**
   * Whether trying again could plausibly work. A 5xx or a socket error is
   * retryable; a rejected address or an unverified sending domain is not, and
   * hammering it just burns the queue's attempts for nothing.
   */
  retryable: boolean
}

/**
 * What a sender looks like to the dispatcher. Injected rather than imported so
 * the dispatch logic is testable without a network and without a real key.
 */
export type Sender = (message: {
  to: string
  subject: string
  text: string
}) => Promise<SendResult>
