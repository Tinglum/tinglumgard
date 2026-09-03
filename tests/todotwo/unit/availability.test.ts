import { describe, expect, it } from 'vitest'

import {
  TimeOffValidationError,
  dateInRange,
  rangesOverlap,
  validateTimeOffRange,
} from '@/lib/todotwo/domain/availability'

describe('validateTimeOffRange', () => {
  const today = '2026-09-03'

  it('accepts a well-formed same-day request', () => {
    expect(() => validateTimeOffRange({ start: today, end: today }, today)).not.toThrow()
  })

  it('accepts a multi-day request', () => {
    expect(() =>
      validateTimeOffRange({ start: '2026-09-10', end: '2026-09-14' }, today)
    ).not.toThrow()
  })

  it('rejects an end date before the start date', () => {
    expect(() =>
      validateTimeOffRange({ start: '2026-09-10', end: '2026-09-05' }, today)
    ).toThrow(TimeOffValidationError)
  })

  it('rejects a start date in the past', () => {
    expect(() =>
      validateTimeOffRange({ start: '2026-08-01', end: '2026-08-05' }, today)
    ).toThrow(TimeOffValidationError)
  })

  it('rejects malformed dates', () => {
    expect(() => validateTimeOffRange({ start: '10/09/2026', end: today }, today)).toThrow(
      TimeOffValidationError
    )
  })
})

describe('rangesOverlap', () => {
  it('is true when ranges share a day', () => {
    expect(
      rangesOverlap({ start: '2026-09-01', end: '2026-09-05' }, { start: '2026-09-05', end: '2026-09-10' })
    ).toBe(true)
  })

  it('is true when one range contains the other', () => {
    expect(
      rangesOverlap({ start: '2026-09-01', end: '2026-09-10' }, { start: '2026-09-03', end: '2026-09-04' })
    ).toBe(true)
  })

  it('is false when ranges do not touch', () => {
    expect(
      rangesOverlap({ start: '2026-09-01', end: '2026-09-05' }, { start: '2026-09-06', end: '2026-09-10' })
    ).toBe(false)
  })
})

describe('dateInRange', () => {
  it('is true for the boundary days', () => {
    const range = { start: '2026-09-01', end: '2026-09-05' }
    expect(dateInRange('2026-09-01', range)).toBe(true)
    expect(dateInRange('2026-09-05', range)).toBe(true)
  })

  it('is false just outside the boundary', () => {
    const range = { start: '2026-09-01', end: '2026-09-05' }
    expect(dateInRange('2026-08-31', range)).toBe(false)
    expect(dateInRange('2026-09-06', range)).toBe(false)
  })
})
