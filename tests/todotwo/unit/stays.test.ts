import { describe, expect, it } from 'vitest'

import {
  deriveStayStatus,
  findConflictingAssignment,
  rangesOverlap,
} from '@/lib/todotwo/domain/stays'

describe('deriveStayStatus', () => {
  it('is upcoming before arrival', () => {
    expect(
      deriveStayStatus({ arrivalDate: '2026-10-01', departureDate: null }, '2026-09-03', 'upcoming')
    ).toBe('upcoming')
  })

  it('is current between arrival and today with no departure yet', () => {
    expect(
      deriveStayStatus({ arrivalDate: '2026-08-01', departureDate: null }, '2026-09-03', 'upcoming')
    ).toBe('current')
  })

  it('is current on the arrival day itself', () => {
    expect(
      deriveStayStatus({ arrivalDate: '2026-09-03', departureDate: null }, '2026-09-03', 'upcoming')
    ).toBe('current')
  })

  it('is completed once departure has passed', () => {
    expect(
      deriveStayStatus(
        { arrivalDate: '2026-08-01', departureDate: '2026-09-01' },
        '2026-09-03',
        'current'
      )
    ).toBe('completed')
  })

  it('is current on the departure day itself (still here)', () => {
    expect(
      deriveStayStatus(
        { arrivalDate: '2026-08-01', departureDate: '2026-09-03' },
        '2026-09-03',
        'current'
      )
    ).toBe('current')
  })

  it('never un-cancels a cancelled stay', () => {
    expect(
      deriveStayStatus(
        { arrivalDate: '2026-01-01', departureDate: null },
        '2026-09-03',
        'cancelled'
      )
    ).toBe('cancelled')
  })
})

describe('rangesOverlap', () => {
  it('detects a plain overlap', () => {
    expect(
      rangesOverlap({ start: '2026-06-01', end: '2026-06-10' }, { start: '2026-06-05', end: '2026-06-15' })
    ).toBe(true)
  })

  it('is false for adjacent-but-not-overlapping ranges', () => {
    expect(
      rangesOverlap({ start: '2026-06-01', end: '2026-06-10' }, { start: '2026-06-11', end: '2026-06-20' })
    ).toBe(false)
  })

  it('treats a shared boundary day as overlapping (inclusive ranges)', () => {
    expect(
      rangesOverlap({ start: '2026-06-01', end: '2026-06-10' }, { start: '2026-06-10', end: '2026-06-20' })
    ).toBe(true)
  })

  it('treats an open-ended range as conflicting with anything after its start', () => {
    expect(rangesOverlap({ start: '2026-06-01', end: null }, { start: '2027-01-01', end: '2027-01-05' })).toBe(
      true
    )
  })

  it('two open-ended ranges always overlap', () => {
    expect(rangesOverlap({ start: '2026-01-01', end: null }, { start: '2030-01-01', end: null })).toBe(true)
  })
})

describe('findConflictingAssignment', () => {
  const existing = [
    { startDate: '2026-06-01', endDate: '2026-06-10' },
    { startDate: '2026-07-01', endDate: null },
  ]

  it('finds a conflict against a fixed booking', () => {
    const conflict = findConflictingAssignment({ startDate: '2026-06-05', endDate: '2026-06-08' }, existing)
    expect(conflict).toEqual(existing[0])
  })

  it('finds a conflict against an open-ended booking', () => {
    const conflict = findConflictingAssignment({ startDate: '2026-08-01', endDate: '2026-08-05' }, existing)
    expect(conflict).toEqual(existing[1])
  })

  it('returns null when the date range is free', () => {
    const conflict = findConflictingAssignment({ startDate: '2026-06-11', endDate: '2026-06-20' }, existing)
    expect(conflict).toBeNull()
  })
})
