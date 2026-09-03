import type { OutboxRow } from '@/lib/todotwo/notifications/types'

/**
 * When to try again, and when to stop.
 *
 * Pure and separately tested, because getting this wrong is expensive in both
 * directions: too eager and a broken provider gets hammered while the queue
 * burns its attempts in a minute; too timid and an announcement about tomorrow
 * morning arrives on Thursday.
 *
 * The backoff is a fixed ladder rather than computed, so the behaviour is
 * legible in the table above and cannot drift with a floating-point change.
 * Steps are in minutes, indexed by attempts already made.
 */
export const RETRY_BACKOFF_MINUTES = [5, 30, 120, 360] as const

/** After this many failed attempts a row is given up on and marked failed. */
export const MAX_ATTEMPTS = 5

/**
 * A row is due when it is still pending, has attempts left, and its backoff has
 * elapsed. Nothing else: status is the authority, and a sent row is never
 * reconsidered however it got there.
 */
export function isDue(row: Pick<OutboxRow, 'status' | 'attempts' | 'next_attempt_at'>, now: Date): boolean {
  if (row.status !== 'pending') return false
  if (row.attempts >= MAX_ATTEMPTS) return false

  const next = Date.parse(row.next_attempt_at)
  // An unparseable timestamp means something is wrong with the row, not that it
  // is due. Leaving it alone makes it visible rather than sending it in a loop.
  if (Number.isNaN(next)) return false

  return next <= now.getTime()
}

export interface RetryDecision {
  status: 'pending' | 'failed'
  attempts: number
  nextAttemptAt: Date
  lastError: string
}

/**
 * What to write back after a send did not work.
 *
 * A non-retryable failure — a rejected address, an unverified sending domain —
 * fails immediately rather than spending four more attempts proving the same
 * point. Either way the error text is kept: a failed notification is a record,
 * not a deletion.
 */
export function decideRetry(input: {
  attempts: number
  error: string
  retryable: boolean
  now: Date
}): RetryDecision {
  const attempts = input.attempts + 1
  const exhausted = attempts >= MAX_ATTEMPTS

  if (!input.retryable || exhausted) {
    return {
      status: 'failed',
      attempts,
      nextAttemptAt: input.now,
      lastError: input.error,
    }
  }

  const index = Math.min(attempts - 1, RETRY_BACKOFF_MINUTES.length - 1)
  const delayMs = RETRY_BACKOFF_MINUTES[index] * 60_000

  return {
    status: 'pending',
    attempts,
    nextAttemptAt: new Date(input.now.getTime() + delayMs),
    lastError: input.error,
  }
}
