import { describe, expect, it } from 'vitest'

import {
  FARM_TZ,
  addFarmDays,
  farmDateTimeToInstant,
  farmDayEnd,
  farmDayStart,
  farmDaysBetween,
  farmToday,
  isFarmDate,
  isFarmTime,
  toFarmDate,
  toFarmTime,
} from '@/lib/todotwo/time'

/**
 * The process runs in UTC (see setup.ts), matching Netlify. Every assertion
 * below would pass trivially if the test machine happened to sit in Oslo, so
 * pinning TZ is what gives these teeth.
 */

describe('farm timezone', () => {
  it('is Europe/Oslo', () => {
    expect(FARM_TZ).toBe('Europe/Oslo')
  })
})

describe('DST — the 07:00 morning routine', () => {
  // Norway: CET (UTC+1) in winter, CEST (UTC+2) in summer.
  it('maps 07:00 to 06:00Z the day before spring forward', () => {
    const instant = farmDateTimeToInstant('2027-03-27', '07:00')
    expect(instant.toISOString()).toBe('2027-03-27T06:00:00.000Z')
  })

  it('maps 07:00 to 05:00Z the day after spring forward', () => {
    const instant = farmDateTimeToInstant('2027-03-29', '07:00')
    expect(instant.toISOString()).toBe('2027-03-29T05:00:00.000Z')
  })

  it('maps 07:00 to 05:00Z the day before autumn fall back', () => {
    const instant = farmDateTimeToInstant('2027-10-30', '07:00')
    expect(instant.toISOString()).toBe('2027-10-30T05:00:00.000Z')
  })

  it('maps 07:00 to 06:00Z the day after autumn fall back', () => {
    const instant = farmDateTimeToInstant('2027-11-01', '07:00')
    expect(instant.toISOString()).toBe('2027-11-01T06:00:00.000Z')
  })

  it('keeps the local wall clock at 07:00 across both transitions', () => {
    for (const date of ['2027-03-27', '2027-03-29', '2027-10-30', '2027-11-01']) {
      expect(toFarmTime(farmDateTimeToInstant(date, '07:00'))).toBe('07:00')
    }
  })

  it('handles the 2026 transitions too', () => {
    // Spring forward 2026-03-29, fall back 2026-10-25.
    expect(farmDateTimeToInstant('2026-03-28', '07:00').toISOString()).toBe(
      '2026-03-28T06:00:00.000Z'
    )
    expect(farmDateTimeToInstant('2026-03-30', '07:00').toISOString()).toBe(
      '2026-03-30T05:00:00.000Z'
    )
  })
})

describe('farm days', () => {
  it('reports the farm-local date for an instant near midnight UTC', () => {
    // 22:30Z on 30 June is already 1 July in Oslo (UTC+2 in summer).
    expect(toFarmDate(new Date('2026-06-30T22:30:00.000Z'))).toBe('2026-07-01')
  })

  it('reports the farm-local date for an instant near midnight in winter', () => {
    // 23:30Z on 30 December is already 31 December in Oslo (UTC+1).
    expect(toFarmDate(new Date('2026-12-30T23:30:00.000Z'))).toBe('2026-12-31')
  })

  it('starts a day at local midnight, not UTC midnight', () => {
    expect(farmDayStart('2026-07-01').toISOString()).toBe('2026-06-30T22:00:00.000Z')
  })

  it('ends a day at the start of the next one', () => {
    expect(farmDayEnd('2026-07-01').toISOString()).toBe(farmDayStart('2026-07-02').toISOString())
  })

  it('gives a 23-hour day on spring forward and 25 on fall back', () => {
    const spring = farmDayEnd('2027-03-28').getTime() - farmDayStart('2027-03-28').getTime()
    const autumn = farmDayEnd('2027-10-31').getTime() - farmDayStart('2027-10-31').getTime()
    expect(spring / 3_600_000).toBe(23)
    expect(autumn / 3_600_000).toBe(25)
  })

  it('adds days as calendar arithmetic, unaffected by DST', () => {
    expect(addFarmDays('2027-03-27', 1)).toBe('2027-03-28')
    expect(addFarmDays('2027-03-28', 1)).toBe('2027-03-29')
    expect(addFarmDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addFarmDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('counts days between dates across a transition', () => {
    expect(farmDaysBetween('2027-03-27', '2027-03-29')).toBe(2)
    expect(farmDaysBetween('2027-03-29', '2027-03-27')).toBe(-2)
    expect(farmDaysBetween('2026-01-01', '2026-01-01')).toBe(0)
  })

  it('resolves today from an instant rather than the server clock', () => {
    // 22:30Z in August is 00:30 the next day in Oslo (UTC+2).
    expect(farmToday(new Date('2026-08-31T22:30:00.000Z'))).toBe('2026-09-01')
    // 21:30Z is still 23:30 the same day.
    expect(farmToday(new Date('2026-08-31T21:30:00.000Z'))).toBe('2026-08-31')
  })
})

describe('validation', () => {
  it('accepts well-formed dates and times', () => {
    expect(isFarmDate('2026-08-31')).toBe(true)
    expect(isFarmTime('07:00')).toBe(true)
    expect(isFarmTime('23:59')).toBe(true)
    expect(isFarmTime('00:00')).toBe(true)
  })

  it('rejects malformed values', () => {
    expect(isFarmDate('31-08-2026')).toBe(false)
    expect(isFarmDate('2026-8-31')).toBe(false)
    expect(isFarmTime('24:00')).toBe(false)
    expect(isFarmTime('7:00')).toBe(false)
    expect(isFarmTime('07:60')).toBe(false)
  })

  it('throws rather than guessing', () => {
    expect(() => farmDateTimeToInstant('nonsense')).toThrow(/Invalid farm date/)
    expect(() => farmDateTimeToInstant('2026-08-31', '25:00')).toThrow(/Invalid farm time/)
  })
})
