import { describe, expect, it } from 'vitest'

import { describeCacheAge, STALE_AFTER_MINUTES } from '@/lib/todotwo/pwa/staleness'

// Fixed instants in Europe/Oslo. 2026-06-15 is CEST (UTC+2).
const NOW = new Date('2026-06-15T12:00:00Z') // 14:00 farm time

describe('describeCacheAge', () => {
  it('returns null when there is no timestamp, so nothing claims freshness', () => {
    expect(describeCacheAge(null, NOW)).toBeNull()
    expect(describeCacheAge(undefined, NOW)).toBeNull()
    expect(describeCacheAge('', NOW)).toBeNull()
  })

  it('returns null for an unparseable timestamp rather than guessing', () => {
    expect(describeCacheAge('not a date', NOW)).toBeNull()
  })

  it('describes seconds as less than a minute', () => {
    expect(describeCacheAge('2026-06-15T11:59:40Z', NOW)).toMatchObject({
      minutes: 0,
      stale: false,
      label: 'less than a minute ago',
    })
  })

  it('singularises one minute', () => {
    expect(describeCacheAge('2026-06-15T11:59:00Z', NOW)?.label).toBe('1 minute ago')
  })

  it('counts whole minutes below the hour', () => {
    expect(describeCacheAge('2026-06-15T11:36:00Z', NOW)).toMatchObject({
      minutes: 24,
      label: '24 minutes ago',
    })
  })

  it('adds the farm-local clock time once past an hour on the same day', () => {
    // 09:00Z is 11:00 in Oslo, three hours before NOW.
    expect(describeCacheAge('2026-06-15T09:00:00Z', NOW)?.label).toBe('3 hours ago at 11:00')
  })

  it('names yesterday by calendar day in Europe/Oslo, not by 24 hours', () => {
    // 22:30Z on the 14th is 00:30 on the 15th in Oslo — still today.
    expect(describeCacheAge('2026-06-14T22:30:00Z', NOW)?.label).toBe('13 hours ago at 00:30')
    // 20:30Z on the 14th is 22:30 on the 14th in Oslo — yesterday.
    expect(describeCacheAge('2026-06-14T20:30:00Z', NOW)?.label).toBe('yesterday at 22:30')
  })

  it('falls back to a date for anything older', () => {
    expect(describeCacheAge('2026-06-11T06:05:00Z', NOW)?.label).toBe('11 Jun at 08:05')
  })

  it('marks anything at or beyond the stale threshold', () => {
    const justUnder = new Date(NOW.getTime() - (STALE_AFTER_MINUTES - 1) * 60_000)
    const atThreshold = new Date(NOW.getTime() - STALE_AFTER_MINUTES * 60_000)

    expect(describeCacheAge(justUnder.toISOString(), NOW)?.stale).toBe(false)
    expect(describeCacheAge(atThreshold.toISOString(), NOW)?.stale).toBe(true)
  })

  it('never reports a future cache write as negative age', () => {
    const ahead = new Date(NOW.getTime() + 10 * 60_000)
    expect(describeCacheAge(ahead.toISOString(), NOW)).toMatchObject({
      minutes: 0,
      stale: false,
      label: 'less than a minute ago',
    })
  })
})
