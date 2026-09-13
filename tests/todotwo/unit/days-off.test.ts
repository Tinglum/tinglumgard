import { describe, expect, it } from 'vitest'
import { daysOffCalendar, daysOffPair, nextBreaksFor } from '@/lib/todotwo/domain/days-off'

describe('two consecutive days off', () => {
  it('wraps Sunday into Monday', () => {
    expect(daysOffPair('SU')).toEqual(['SU', 'MO'])
  })

  it('shows dated breaks across week boundaries', () => {
    expect(nextBreaksFor('SA', '2026-09-13', 14)).toEqual([
      { from: '2026-09-12', to: '2026-09-13' },
      { from: '2026-09-19', to: '2026-09-20' },
      { from: '2026-09-26', to: '2026-09-27' },
    ])
  })

  it('groups everybody who is off on each date', () => {
    const calendar = daysOffCalendar([
      { id: 'a', name: 'Aleksandra', daysOffStart: 'MO' },
      { id: 'm', name: 'Miguel', daysOffStart: 'SU' },
    ], '2026-09-13', 2)
    expect(calendar.map((day) => day.people.map((person) => person.name))).toEqual([
      ['Miguel'],
      ['Aleksandra', 'Miguel'],
    ])
  })
})
