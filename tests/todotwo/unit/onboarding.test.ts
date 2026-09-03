import { describe, expect, it } from 'vitest'

import {
  RAMP_COMBINED_TASK_CAP,
  rampPhaseForDayOffset,
  selectHandoffCandidates,
  type OccurrenceCandidate,
} from '@/lib/todotwo/domain/onboarding'

describe('rampPhaseForDayOffset', () => {
  it('is shadowing on day 0 and 1', () => {
    expect(rampPhaseForDayOffset(0)).toBe('shadowing')
    expect(rampPhaseForDayOffset(1)).toBe('shadowing')
  })

  it('is ramping on day 2 and 3', () => {
    expect(rampPhaseForDayOffset(2)).toBe('ramping')
    expect(rampPhaseForDayOffset(3)).toBe('ramping')
  })

  it('is normal from day 4 onward', () => {
    expect(rampPhaseForDayOffset(4)).toBe('normal')
    expect(rampPhaseForDayOffset(5)).toBe('normal')
    expect(rampPhaseForDayOffset(100)).toBe('normal')
  })
})

describe('selectHandoffCandidates', () => {
  const make = (overrides: Partial<OccurrenceCandidate>): OccurrenceCandidate => ({
    taskId: 't1',
    holderPersonId: 'p1',
    holderLoadInWindow: 1,
    dueDate: '2026-01-01',
    ...overrides,
  })

  it('respects the combined cap of 2 across both days', () => {
    expect(RAMP_COMBINED_TASK_CAP).toBe(2)
    const candidates = [make({ taskId: 'a' }), make({ taskId: 'b' }), make({ taskId: 'c' })]
    expect(selectHandoffCandidates(candidates, 0)).toHaveLength(2)
  })

  it('offers nothing once the cap is already met', () => {
    const candidates = [make({ taskId: 'a' }), make({ taskId: 'b' })]
    expect(selectHandoffCandidates(candidates, 2)).toEqual([])
  })

  it('offers only the remaining amount when partially used', () => {
    const candidates = [make({ taskId: 'a' }), make({ taskId: 'b' }), make({ taskId: 'c' })]
    expect(selectHandoffCandidates(candidates, 1)).toHaveLength(1)
  })

  it('prefers occurrences held by whoever has the most load, to spread work', () => {
    const candidates = [
      make({ taskId: 'low', holderPersonId: 'a', holderLoadInWindow: 1, dueDate: '2026-01-01' }),
      make({ taskId: 'high', holderPersonId: 'b', holderLoadInWindow: 5, dueDate: '2026-01-02' }),
    ]
    const [first] = selectHandoffCandidates(candidates, 1)
    expect(first.taskId).toBe('high')
  })

  it('breaks ties by soonest due date', () => {
    const candidates = [
      make({ taskId: 'later', holderLoadInWindow: 3, dueDate: '2026-01-05' }),
      make({ taskId: 'sooner', holderLoadInWindow: 3, dueDate: '2026-01-02' }),
    ]
    const [first] = selectHandoffCandidates(candidates, 1)
    expect(first.taskId).toBe('sooner')
  })

  it('is deterministic for equal load and date, ordered by taskId', () => {
    const candidates = [
      make({ taskId: 'zzz', holderLoadInWindow: 2, dueDate: '2026-01-01' }),
      make({ taskId: 'aaa', holderLoadInWindow: 2, dueDate: '2026-01-01' }),
    ]
    const [first] = selectHandoffCandidates(candidates, 1)
    expect(first.taskId).toBe('aaa')
  })
})
