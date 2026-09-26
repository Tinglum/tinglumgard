import { describe, expect, it, vi } from 'vitest'

import { notificationDedupeKey } from '@/lib/todotwo/notifications/dedupe'
import { NO_DEVICE_ERROR, dispatchOutbox, type PushFn } from '@/lib/todotwo/notifications/dispatch'
import { isRetryableError } from '@/lib/todotwo/notifications/mailer'
import { MAX_ATTEMPTS, RETRY_BACKOFF_MINUTES, decideRetry, isDue } from '@/lib/todotwo/notifications/retry'

const PERSON = '11111111-1111-1111-1111-111111111111'
const REFERENCE = '22222222-2222-2222-2222-222222222222'

describe('dedupe key', () => {
  it('pins the exact format the database mirrors', () => {
    expect(
      notificationDedupeKey({
        topic: 'announcement',
        referenceId: REFERENCE,
        personId: PERSON,
        channel: 'email',
      })
    ).toBe(`announcement:${REFERENCE}:${PERSON}:email`)
  })

  it('uses a placeholder when there is nothing to reference', () => {
    expect(notificationDedupeKey({ topic: 'digest', personId: PERSON, channel: 'email' })).toBe(
      `digest:-:${PERSON}:email`
    )
    expect(
      notificationDedupeKey({ topic: 'digest', referenceId: null, personId: PERSON, channel: 'email' })
    ).toBe(`digest:-:${PERSON}:email`)
    expect(
      notificationDedupeKey({ topic: 'digest', referenceId: '  ', personId: PERSON, channel: 'email' })
    ).toBe(`digest:-:${PERSON}:email`)
  })

  it('normalises the topic so casing cannot create a second key', () => {
    const a = notificationDedupeKey({ topic: ' Announcement ', referenceId: REFERENCE, personId: PERSON, channel: 'email' })
    const b = notificationDedupeKey({ topic: 'announcement', referenceId: REFERENCE, personId: PERSON, channel: 'email' })
    expect(a).toBe(b)
  })

  it('separates two people on the same announcement', () => {
    const other = '33333333-3333-3333-3333-333333333333'
    expect(
      notificationDedupeKey({ topic: 'announcement', referenceId: REFERENCE, personId: PERSON, channel: 'email' })
    ).not.toBe(
      notificationDedupeKey({ topic: 'announcement', referenceId: REFERENCE, personId: other, channel: 'email' })
    )
  })

  it('refuses a key it cannot make meaningful', () => {
    expect(() => notificationDedupeKey({ topic: '  ', personId: PERSON, channel: 'email' })).toThrow()
    expect(() => notificationDedupeKey({ topic: 'x', personId: '', channel: 'email' })).toThrow()
  })
})

describe('what is due', () => {
  const now = new Date('2026-09-04T10:00:00Z')

  it('takes a pending row whose backoff has elapsed', () => {
    expect(isDue({ status: 'pending', attempts: 0, next_attempt_at: '2026-09-04T09:59:00Z' }, now)).toBe(true)
  })

  it('takes a row due exactly now', () => {
    expect(isDue({ status: 'pending', attempts: 1, next_attempt_at: '2026-09-04T10:00:00Z' }, now)).toBe(true)
  })

  it('leaves a row whose backoff has not elapsed', () => {
    expect(isDue({ status: 'pending', attempts: 1, next_attempt_at: '2026-09-04T10:00:01Z' }, now)).toBe(false)
  })

  it('never reconsiders a sent or failed row', () => {
    expect(isDue({ status: 'sent', attempts: 1, next_attempt_at: '2026-01-01T00:00:00Z' }, now)).toBe(false)
    expect(isDue({ status: 'failed', attempts: 5, next_attempt_at: '2026-01-01T00:00:00Z' }, now)).toBe(false)
  })

  it('stops at the attempt ceiling even if the row still says pending', () => {
    expect(
      isDue({ status: 'pending', attempts: MAX_ATTEMPTS, next_attempt_at: '2026-01-01T00:00:00Z' }, now)
    ).toBe(false)
  })

  it('treats an unreadable timestamp as not due rather than as due now', () => {
    expect(isDue({ status: 'pending', attempts: 0, next_attempt_at: 'not a date' }, now)).toBe(false)
  })
})

describe('retry decisions', () => {
  const now = new Date('2026-09-04T10:00:00Z')

  it('walks the backoff ladder', () => {
    for (let attempts = 0; attempts < RETRY_BACKOFF_MINUTES.length; attempts += 1) {
      const decision = decideRetry({ attempts, error: 'boom', retryable: true, now })
      expect(decision.status).toBe('pending')
      expect(decision.attempts).toBe(attempts + 1)
      expect(decision.nextAttemptAt.getTime() - now.getTime()).toBe(
        RETRY_BACKOFF_MINUTES[attempts] * 60_000
      )
    }
  })

  it('gives up at the ceiling', () => {
    const decision = decideRetry({ attempts: MAX_ATTEMPTS - 1, error: 'boom', retryable: true, now })
    expect(decision.status).toBe('failed')
    expect(decision.attempts).toBe(MAX_ATTEMPTS)
  })

  it('does not spend attempts on something retrying cannot fix', () => {
    const decision = decideRetry({ attempts: 0, error: 'domain not verified', retryable: false, now })
    expect(decision.status).toBe('failed')
    expect(decision.attempts).toBe(1)
  })

  it('always keeps the error text', () => {
    expect(decideRetry({ attempts: 0, error: 'Mailgun 500: upstream', retryable: true, now }).lastError).toBe(
      'Mailgun 500: upstream'
    )
    expect(decideRetry({ attempts: 0, error: 'Mailgun 422: rejected address', retryable: false, now }).lastError).toBe(
      'Mailgun 422: rejected address'
    )
  })
})

describe('which provider failures are worth repeating', () => {
  it('retries transient ones', () => {
    for (const error of [
      'Mailgun 429: rate limited',
      'Mailgun 500: internal error',
      'Mailgun 502: bad gateway',
      'Mailgun 503: unavailable',
      'Mailgun 408: timeout',
      'fetch failed',
      'ECONNRESET',
      'network error',
    ]) {
      expect(isRetryableError(error), error).toBe(true)
    }
  })

  it('does not retry something that will fail identically forever', () => {
    for (const error of [
      'Mailgun 400: bad request',
      'Mailgun 401: unauthorized',
      'Mailgun 403: domain not verified',
      'Mailgun 404: no such domain',
      'Mailgun 422: rejected address',
      'Email service not configured',
    ]) {
      expect(isRetryableError(error), error).toBe(false)
    }
  })

  it('treats an absent error as nothing to retry', () => {
    expect(isRetryableError(undefined)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The dispatcher, against a stand-in for the database.
//
// Not a mock of Supabase in general — just enough of the builder to record what
// the dispatcher asked for. The point is the decisions, not the wire format.
// ---------------------------------------------------------------------------

interface FakeRow {
  id: string
  person_id: string
  channel: 'email'
  recipient_email: string
  subject: string
  body: string
  status: string
  attempts: number
  next_attempt_at: string
  dedupe_key: string
  topic: string
  reference_id: string | null
}

function fakeDb(rows: FakeRow[]) {
  const updates: { id: string; patch: Record<string, unknown> }[] = []

  function table() {
    const state: { patch?: Record<string, unknown>; filters: Record<string, unknown> } = { filters: {} }

    const builder: any = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        state.filters[column] = value
        return builder
      },
      lt: () => builder,
      lte: () => builder,
      order: () => builder,
      limit: () => builder,
      update: (patch: Record<string, unknown>) => {
        state.patch = patch
        return builder
      },
      then: (resolve: (value: { data: unknown; error: null }) => unknown) => {
        if (!state.patch) return resolve({ data: rows, error: null })

        const target = rows.find((row) => row.id === state.filters.id)
        const attemptsMatch =
          state.filters.attempts === undefined || target?.attempts === state.filters.attempts
        const statusMatch =
          state.filters.status === undefined || target?.status === state.filters.status

        if (!target || !attemptsMatch || !statusMatch) return resolve({ data: [], error: null })

        updates.push({ id: target.id, patch: state.patch })
        Object.assign(target, state.patch)
        return resolve({ data: [{ id: target.id }], error: null })
      },
    }

    return builder
  }

  return { db: { from: () => table() }, updates }
}

function row(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: 'row-1',
    person_id: 'person-1',
    channel: 'email',
    recipient_email: 'someone@todotwo.invalid',
    subject: 'The vet comes Thursday',
    body: 'Be in the barn at eight.',
    status: 'pending',
    attempts: 0,
    next_attempt_at: '2026-09-04T09:00:00Z',
    dedupe_key: 'announcement:a:b:email',
    topic: 'announcement',
    reference_id: null,
    ...overrides,
  }
}

describe('dispatching the outbox', () => {
  const now = new Date('2026-09-04T10:00:00Z')
  const reached = (sent: number, attempted = sent): PushFn => vi.fn(async () => ({ attempted, sent }))

  it('is inert without push keys and touches nothing', async () => {
    const previous = process.env.TODOTWO_VAPID_PRIVATE_KEY
    delete process.env.TODOTWO_VAPID_PRIVATE_KEY
    try {
      const { db, updates } = fakeDb([row()])
      const result = await dispatchOutbox(db, { now })
      expect(result.configured).toBe(false)
      expect(updates).toEqual([])
    } finally {
      if (previous !== undefined) process.env.TODOTWO_VAPID_PRIVATE_KEY = previous
    }
  })

  it('marks a pushed notification sent, once', async () => {
    const rows = [row()]
    const { db, updates } = fakeDb(rows)
    const push = reached(1)

    const result = await dispatchOutbox(db, { now, push })

    expect(result.sent).toBe(1)
    expect(push).toHaveBeenCalledTimes(1)
    expect(rows[0].status).toBe('sent')
    expect(updates).toHaveLength(2) // claim, then the final write
    expect(updates[1].patch.sent_at).toBe(now.toISOString())
  })

  it('fails at once, without emailing, for somebody with no device', async () => {
    // Push only: no fallback to email, and no point retrying a phone setting.
    const rows = [row()]
    const { db } = fakeDb(rows)

    const result = await dispatchOutbox(db, { now, push: reached(0, 0) })

    expect(result.noDevice).toBe(1)
    expect(result.failed).toBe(1)
    expect(rows[0].status).toBe('failed')
    expect((rows[0] as unknown as { last_error: string }).last_error).toBe(NO_DEVICE_ERROR)
  })

  it('retries when a device exists but did not take it', async () => {
    const rows = [row()]
    const { db } = fakeDb(rows)

    const result = await dispatchOutbox(db, { now, push: reached(0, 1) })

    expect(result.retrying).toBe(1)
    expect(rows[0].status).toBe('pending')
    expect(rows[0].attempts).toBe(1)
    expect(rows[0].next_attempt_at).toBe(new Date(now.getTime() + 5 * 60_000).toISOString())
  })

  it('never throws a failure away at the attempt ceiling', async () => {
    const rows = [row({ attempts: MAX_ATTEMPTS - 1 })]
    const { db } = fakeDb(rows)

    const result = await dispatchOutbox(db, { now, push: reached(0, 1) })

    expect(result.failed).toBe(1)
    expect(rows[0].status).toBe('failed')
    expect((rows[0] as unknown as { last_error: string }).last_error).toMatch(/none of their devices/)
  })

  it('claims a row before sending, so a second run cannot take it', async () => {
    const rows = [row()]
    const { db } = fakeDb(rows)

    const claimingPush: PushFn = async () => {
      const second = await dispatchOutbox(db, { now, push: reached(1) })
      expect(second.sent).toBe(0)
      return { attempted: 1, sent: 1 }
    }

    const result = await dispatchOutbox(db, { now, push: claimingPush })
    expect(result.sent).toBe(1)
  })

  it('does nothing for an empty queue', async () => {
    const { db, updates } = fakeDb([])
    const result = await dispatchOutbox(db, { now, push: reached(1) })

    expect(result.considered).toBe(0)
    expect(updates).toEqual([])
  })

  it('consumes per-task assignment notices without delivering them', async () => {
    const rows = [row({ topic: 'assignment-assigned' })]
    const { db } = fakeDb(rows)
    const push = reached(1)

    const result = await dispatchOutbox(db, { now, push })

    expect(result.considered).toBe(0)
    expect(result.sent).toBe(0)
    expect(push).not.toHaveBeenCalled()
    expect(rows[0].status).toBe('sent')
  })
})
