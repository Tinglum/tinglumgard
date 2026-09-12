import { describe, expect, it } from 'vitest'

import {
  NUDGE_FROM_HOUR,
  OVERDUE_FROM_MINUTES,
  farmHour,
  farmMinutes,
} from '@/lib/todotwo/queries-nudge'

/**
 * The evening prompts are timed in Norway, not on the server clock.
 *
 * Netlify runs in UTC, so reading the hour off `new Date()` would ask people
 * at 20:30 in summer and 19:30 in winter — and it would never throw, never log
 * anything, and only ever be noticed by somebody wondering why the app nags
 * them at the wrong time of night. Hence tests on both sides of the clock
 * change rather than on one arbitrary date.
 */

describe('the farm clock', () => {
  it('reads Norwegian summer time, not UTC', () => {
    // 12 September, CEST, UTC+2.
    const summerEvening = new Date('2026-09-12T16:30:00Z')
    expect(farmMinutes(summerEvening)).toBe(18 * 60 + 30)
    expect(farmHour(summerEvening)).toBe(18)
  })

  it('reads Norwegian winter time, not UTC', () => {
    // 12 January, CET, UTC+1. The same wall-clock moment is an hour earlier
    // in UTC, and the answer must be identical.
    const winterEvening = new Date('2026-01-12T17:30:00Z')
    expect(farmMinutes(winterEvening)).toBe(18 * 60 + 30)
    expect(farmHour(winterEvening)).toBe(18)
  })

  it('puts the two prompts either side of their thresholds', () => {
    const justBefore = new Date('2026-09-12T16:29:00Z') // 18:29 Oslo
    const justAfter = new Date('2026-09-12T16:30:00Z') // 18:30 Oslo
    expect(farmMinutes(justBefore) < OVERDUE_FROM_MINUTES).toBe(true)
    expect(farmMinutes(justAfter) < OVERDUE_FROM_MINUTES).toBe(false)

    const beforeEleven = new Date('2026-09-12T20:59:00Z') // 22:59 Oslo
    const afterEleven = new Date('2026-09-12T21:00:00Z') // 23:00 Oslo
    expect(farmHour(beforeEleven) < NUDGE_FROM_HOUR).toBe(true)
    expect(farmHour(afterEleven) < NUDGE_FROM_HOUR).toBe(false)
  })

  it('does not roll over at UTC midnight', () => {
    // 23:30 UTC is already half past one the next morning in Oslo. Neither
    // prompt should think it is still the evening.
    const lateUtc = new Date('2026-09-12T23:30:00Z')
    expect(farmMinutes(lateUtc)).toBe(60 + 30)
    expect(farmHour(lateUtc)).toBe(1)
  })
})
