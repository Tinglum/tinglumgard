import { decideRetry, isDue, MAX_ATTEMPTS } from '@/lib/todotwo/notifications/retry'
import { getPushConfig, sendPushToPerson } from '@/lib/todotwo/notifications/push-sender'
import type { OutboxRow } from '@/lib/todotwo/notifications/types'

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
 *   Nothing pretends. With push unconfigured the run reports skipped and touches
 *   nothing at all. There is no fake send and no silent success.
 *
 * Push only. The farm asked for notifications on the phone, not in a mailbox
 * nobody watches while carrying a feed bucket, and email used to fill in
 * whenever push reached nobody — which, with most phones never having turned
 * push on, was most of the time. Now a row reaches a phone or it does not
 * reach anyone, and the outbox says which rather than quietly emailing
 * instead. Sign-in links and password resets are not in this outbox; they
 * still go by email.
 */

/** Sends one notification to every device a person has. Injectable for tests. */
export type PushFn = (
  db: Db,
  personId: string,
  payload: { title: string; body: string; url?: string }
) => Promise<{ attempted: number; sent: number }>

/** Written to last_error when a person has no device to send to. */
export const NO_DEVICE_ERROR =
  'No push device: this person has not turned notifications on. Email is off by choice.'

/** How long a claimed row is hidden from other runs while its send is in flight. */
const LEASE_MINUTES = 15

/** Individual rota changes are represented by one day summary in the inbox. */
const SUPPRESSED_TOPICS = new Set(['assignment-assigned', 'assignment-unassigned', 'daily-digest'])

export interface DispatchResult {
  configured: boolean
  considered: number
  sent: number
  failed: number
  retrying: number
  /** Rows another run had already claimed. Normal, not an error. */
  skipped: number
  errors: { id: string; message: string }[]
  /** Devices reached. One row can reach several devices. */
  pushSent: number
  /** Rows for somebody with no device at all: recorded as failed, not emailed. */
  noDevice: number
}

/** Minimal shape so this works with any Supabase client. */
type Db = { from: (table: string) => any }

export async function dispatchOutbox(
  db: Db,
  options: { limit?: number; now?: Date; push?: PushFn } = {}
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
    noDevice: 0,
  }

  const push: PushFn = options.push ?? sendPushToPerson
  if (!options.push && !getPushConfig()) {
    // Inert by design: without VAPID keys nothing can be delivered, so the
    // queue keeps filling and drains the moment the keys are present.
    return { ...result, configured: false }
  }

  const { data, error } = await db
    .from('notification_outbox')
    .select(
      'id, person_id, channel, recipient_email, subject, body, status, attempts, next_attempt_at, dedupe_key, topic, reference_id'
    )
    .eq('status', 'pending')
    .lt('attempts', MAX_ATTEMPTS)
    .lte('next_attempt_at', now.toISOString())
    .order('next_attempt_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`Could not read the notification outbox: ${error.message}`)

  const dueRows = ((data ?? []) as OutboxRow[]).filter((row) => isDue(row, now))
  const rows = dueRows.filter((row) => !SUPPRESSED_TOPICS.has(row.topic))
  result.considered = rows.length

  // Old database triggers can still enqueue one row per assignment. Consume
  // those rows without contacting a device; getActivityFeed builds the single
  // useful "Friday is ready" summary from the person's current assignments.
  for (const row of dueRows.filter((candidate) => SUPPRESSED_TOPICS.has(candidate.topic))) {
    const { error: suppressError } = await db
      .from('notification_outbox')
      .update({
        status: 'sent',
        attempts: row.attempts + 1,
        sent_at: now.toISOString(),
        last_error: null,
        next_attempt_at: now.toISOString(),
      })
      .eq('id', row.id)
      .eq('status', 'pending')

    if (suppressError) result.errors.push({ id: row.id, message: suppressError.message })
  }

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

    let outcome: { attempted: number; sent: number } = { attempted: 0, sent: 0 }
    let pushError: string | null = null
    try {
      outcome = await push(db, row.person_id, {
        title: row.subject,
        body: row.body,
        url:
          row.reference_id && (row.topic?.startsWith('assignment-') || row.topic?.startsWith('overdue'))
            ? `/todotwo/tasks/${row.reference_id}`
            : row.topic === 'day-ready'
              ? '/todotwo/upcoming'
              : row.topic === 'task_handoff_request'
                ? '/todotwo/swaps'
                : '/todotwo',
      })
    } catch (caught) {
      pushError = caught instanceof Error ? caught.message : 'Push failed'
    }

    result.pushSent += outcome.sent

    if (outcome.sent > 0) {
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
        result.errors.push({ id: row.id, message: `Pushed but not recorded: ${updateError.message}` })
        continue
      }

      result.sent += 1
      continue
    }

    // Nobody to send to. Retrying cannot help — it is a setting on their
    // phone, not a network fault — so this fails now, with a reason a person
    // can read, rather than spending attempts or falling back to email.
    if (!pushError && outcome.attempted === 0) {
      const { error: noDeviceError } = await db
        .from('notification_outbox')
        .update({
          status: 'failed',
          attempts: row.attempts + 1,
          last_error: NO_DEVICE_ERROR,
          next_attempt_at: now.toISOString(),
        })
        .eq('id', row.id)

      if (noDeviceError) {
        result.errors.push({ id: row.id, message: noDeviceError.message })
        continue
      }

      result.failed += 1
      result.noDevice += 1
      continue
    }

    // They have a device and it did not take: that is worth another try.
    const decision = decideRetry({
      attempts: row.attempts,
      error: pushError ?? 'Push reached none of their devices',
      retryable: true,
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
