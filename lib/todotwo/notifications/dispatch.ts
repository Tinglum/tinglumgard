import { decideRetry, isDue, MAX_ATTEMPTS } from '@/lib/todotwo/notifications/retry'
import { createMailgunSender, getMailerConfig } from '@/lib/todotwo/notifications/mailer'
import { sendPushToPerson } from '@/lib/todotwo/notifications/push-sender'
import type { OutboxRow, Sender } from '@/lib/todotwo/notifications/types'

/**
 * Drains the notification outbox.
 *
 * Shared by the cron handler and the CLI script so both behave identically —
 * the same arrangement generate.ts uses for occurrences.
 *
 * Three properties this is built for:
 *
 *   Nothing is lost. A failure writes attempts, last_error and a later
 *   next_attempt_at. It never deletes the row and never marks it sent.
 *
 *   Nothing is sent twice. Rows are claimed with a conditional update before
 *   the network call, so two overlapping runs cannot both take the same row,
 *   and the unique dedupe key means there was only ever one row to take.
 *
 *   Nothing pretends. With Mailgun unconfigured the run reports skipped and touches
 *   nothing at all. There is no fake send and no silent success.
 */

/** How long a claimed row is hidden from other runs while its send is in flight. */
const LEASE_MINUTES = 15

export interface DispatchResult {
  configured: boolean
  considered: number
  sent: number
  failed: number
  retrying: number
  /** Rows another run had already claimed. Normal, not an error. */
  skipped: number
  errors: { id: string; message: string }[]
  /**
   * Web Push is a second, best-effort channel alongside email for every row —
   * there is only one channel value today (see notification_channel), so
   * "does this row want push" reduces to "does this person have an active
   * subscription", which sendPushToPerson already checks. A push failure
   * never changes the row's status, attempts or retry schedule: email stays
   * the channel of record and this count is purely informational.
   */
  pushSent: number
}

/** Minimal shape so this works with any Supabase client. */
type Db = { from: (table: string) => any }

export async function dispatchOutbox(
  db: Db,
  options: { limit?: number; now?: Date; sender?: Sender } = {}
): Promise<DispatchResult> {
  const now = options.now ?? new Date()
  const limit = options.limit ?? 50

  const result: DispatchResult = {
    configured: true,
    considered: 0,
    sent: 0,
    failed: 0,
    retrying: 0,
    skipped: 0,
    errors: [],
    pushSent: 0,
  }

  let sender = options.sender
  if (!sender) {
    const config = getMailerConfig()
    if (!config) {
      // Inert by design. The queue keeps filling and drains the moment
      // MAILGUN_API_KEY and MAILGUN_DOMAIN are present.
      return { ...result, configured: false }
    }
    sender = createMailgunSender()
  }

  const { data, error } = await db
    .from('notification_outbox')
    .select(
      'id, person_id, channel, recipient_email, subject, body, status, attempts, next_attempt_at, dedupe_key'
    )
    .eq('status', 'pending')
    .lt('attempts', MAX_ATTEMPTS)
    .lte('next_attempt_at', now.toISOString())
    .order('next_attempt_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`Could not read the notification outbox: ${error.message}`)

  const rows = ((data ?? []) as OutboxRow[]).filter((row) => isDue(row, now))
  result.considered = rows.length

  for (const row of rows) {
    // Claim. Matching on attempts as well as status makes this a compare-and-set:
    // if another run got here first the attempts count has already moved and
    // this update matches nothing.
    const leaseUntil = new Date(now.getTime() + LEASE_MINUTES * 60_000).toISOString()

    const { data: claimed, error: claimError } = await db
      .from('notification_outbox')
      .update({ next_attempt_at: leaseUntil })
      .eq('id', row.id)
      .eq('status', 'pending')
      .eq('attempts', row.attempts)
      .select('id')

    if (claimError) {
      result.errors.push({ id: row.id, message: claimError.message })
      continue
    }

    if (!claimed || claimed.length === 0) {
      result.skipped += 1
      continue
    }

    // Best-effort, independent of the email outcome below: a person who
    // enabled push should hear about this even if, say, their email bounces,
    // and a push failure must never touch the outbox row's retry state —
    // email is still the record of what was attempted and whether it worked.
    try {
      const pushResult = await sendPushToPerson(db, row.person_id, {
        title: row.subject,
        body: row.body,
      })
      result.pushSent += pushResult.sent
    } catch {
      // sendPushToPerson already swallows per-subscription errors; this only
      // guards against something unexpected (e.g. a missing table locally).
    }

    const outcome = await sender({
      to: row.recipient_email,
      subject: row.subject,
      text: row.body,
    })

    if (outcome.sent) {
      const { error: updateError } = await db
        .from('notification_outbox')
        .update({
          status: 'sent',
          attempts: row.attempts + 1,
          sent_at: now.toISOString(),
          last_error: null,
          next_attempt_at: now.toISOString(),
        })
        .eq('id', row.id)

      if (updateError) {
        // The message went out but the row still says pending. Recorded rather
        // than swallowed: the lease means it will not be retried for fifteen
        // minutes, which is time enough for a human to see this in the log.
        result.errors.push({ id: row.id, message: `Sent but not recorded: ${updateError.message}` })
        continue
      }

      result.sent += 1
      continue
    }

    const decision = decideRetry({
      attempts: row.attempts,
      error: outcome.error ?? 'Unknown send failure',
      retryable: outcome.retryable,
      now,
    })

    const { error: failError } = await db
      .from('notification_outbox')
      .update({
        status: decision.status,
        attempts: decision.attempts,
        last_error: decision.lastError,
        next_attempt_at: decision.nextAttemptAt.toISOString(),
      })
      .eq('id', row.id)

    if (failError) {
      result.errors.push({ id: row.id, message: failError.message })
      continue
    }

    if (decision.status === 'failed') result.failed += 1
    else result.retrying += 1
  }

  return result
}
