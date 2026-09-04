import { describe, expect, it } from 'vitest'

import { canUntick, isCancelled, isFinished, isOutstanding } from '@/lib/todotwo/domain/task-status'

/**
 * These exist because the app used to answer "is this done?" differently in
 * different places — the roster counted awaiting_verification, the task row
 * did not — and two screens disagreeing about the same task is a slow way to
 * lose people's trust in the board.
 */

describe('isFinished', () => {
  it('counts work someone has actually carried out', () => {
    expect(isFinished('completed')).toBe(true)
    expect(isFinished('verified')).toBe(true)
    // The job is done; somebody else has yet to sign it off.
    expect(isFinished('awaiting_verification')).toBe(true)
  })

  it('does not count work still to do', () => {
    for (const status of ['draft', 'unassigned', 'assigned', 'accepted', 'in_progress', 'blocked']) {
      expect(isFinished(status), status).toBe(false)
    }
  })

  it('does not count a task that was called off', () => {
    expect(isFinished('cancelled')).toBe(false)
  })

  it('does not count one explicitly marked not done', () => {
    expect(isFinished('not_completed')).toBe(false)
  })
})

describe('isCancelled', () => {
  it('is kept apart from finished, so a called-off day does not read as productive', () => {
    expect(isCancelled('cancelled')).toBe(true)
    expect(isCancelled('completed')).toBe(false)
    expect(isFinished('cancelled')).toBe(false)
  })
})

describe('isOutstanding', () => {
  it('is everything neither finished nor called off', () => {
    expect(isOutstanding('assigned')).toBe(true)
    expect(isOutstanding('in_progress')).toBe(true)
    expect(isOutstanding('not_completed')).toBe(true)

    expect(isOutstanding('completed')).toBe(false)
    expect(isOutstanding('awaiting_verification')).toBe(false)
    expect(isOutstanding('cancelled')).toBe(false)
  })

  it('never overlaps the other two', () => {
    const statuses = [
      'draft', 'unassigned', 'assigned', 'accepted', 'in_progress', 'blocked',
      'completed', 'awaiting_verification', 'verified', 'not_completed', 'cancelled',
    ]
    for (const status of statuses) {
      const buckets = [isFinished(status), isCancelled(status), isOutstanding(status)]
      expect(buckets.filter(Boolean), status).toHaveLength(1)
    }
  })
})

describe('canUntick', () => {
  it('allows only what uncomplete_task actually accepts', () => {
    // The RPC updates `where status = 'completed'` and raises otherwise, so
    // offering the control for anything else just earns an error.
    expect(canUntick('completed')).toBe(true)
    expect(canUntick('verified')).toBe(false)
    expect(canUntick('awaiting_verification')).toBe(false)
  })

  it('is never true for something that was never finished', () => {
    for (const status of ['assigned', 'in_progress', 'cancelled', 'not_completed']) {
      expect(canUntick(status), status).toBe(false)
    }
  })
})
