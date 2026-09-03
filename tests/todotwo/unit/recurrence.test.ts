import { describe, expect, it } from 'vitest'

import {
  RecurrenceError,
  describeRule,
  expandSeries,
  parseRrule,
  weekdayOfDate,
} from '@/lib/todotwo/domain/recurrence'

describe('parsing', () => {
  it('reads the rules the importer emits', () => {
    expect(parseRrule('RRULE:FREQ=DAILY')).toEqual({
      freq: 'DAILY', byDay: [], hour: null, minute: null,
    })
    expect(parseRrule('RRULE:FREQ=DAILY;BYHOUR=7;BYMINUTE=0')).toEqual({
      freq: 'DAILY', byDay: [], hour: 7, minute: 0,
    })
    expect(parseRrule('RRULE:FREQ=WEEKLY;BYDAY=MO,WE')).toEqual({
      freq: 'WEEKLY', byDay: ['MO', 'WE'], hour: null, minute: null,
    })
  })

  it('works without the RRULE: prefix', () => {
    expect(parseRrule('FREQ=DAILY').freq).toBe('DAILY')
  })

  it('refuses what it cannot honour rather than guessing', () => {
    expect(() => parseRrule('RRULE:FREQ=MONTHLY')).toThrow(RecurrenceError)
    expect(() => parseRrule('RRULE:FREQ=WEEKLY')).toThrow(/requires BYDAY/)
    expect(() => parseRrule('RRULE:FREQ=WEEKLY;BYDAY=XX')).toThrow(/Unsupported BYDAY/)
    expect(() => parseRrule('RRULE:FREQ=DAILY;BYHOUR=25')).toThrow(/Invalid BYHOUR/)
    expect(() => parseRrule('')).toThrow(RecurrenceError)
  })
})

describe('weekday of a calendar date', () => {
  it('is correct regardless of the machine timezone', () => {
    expect(weekdayOfDate('2026-09-03')).toBe('TH')
    expect(weekdayOfDate('2026-09-07')).toBe('MO')
    expect(weekdayOfDate('2026-09-13')).toBe('SU')
  })
})

describe('expansion', () => {
  const base = { startsOn: '2026-09-01', from: '2026-09-01', to: '2026-09-07' }

  it('produces every day for a daily rule', () => {
    const out = expandSeries({ ...base, rrule: 'RRULE:FREQ=DAILY' })
    expect(out).toHaveLength(7)
    expect(out[0].date).toBe('2026-09-01')
    expect(out[6].date).toBe('2026-09-07')
  })

  it('produces only the named days for a weekly rule', () => {
    const out = expandSeries({ ...base, rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE' })
    expect(out.map((o) => o.date)).toEqual(['2026-09-02', '2026-09-07'])
  })

  it('never produces anything before the series began', () => {
    const out = expandSeries({
      rrule: 'RRULE:FREQ=DAILY',
      startsOn: '2026-09-05',
      from: '2026-09-01',
      to: '2026-09-07',
    })
    expect(out[0].date).toBe('2026-09-05')
    expect(out).toHaveLength(3)
  })

  it('stops at the series end', () => {
    const out = expandSeries({ ...base, rrule: 'RRULE:FREQ=DAILY', endsOn: '2026-09-03' })
    expect(out.map((o) => o.date)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03'])
  })

  it('skips exceptions without disturbing the rest', () => {
    const out = expandSeries({
      ...base,
      rrule: 'RRULE:FREQ=DAILY',
      exceptions: ['2026-09-03', '2026-09-04'],
    })
    expect(out).toHaveLength(5)
    expect(out.map((o) => o.date)).not.toContain('2026-09-03')
    expect(out.map((o) => o.date)).toContain('2026-09-05')
  })

  it('leaves at null for an all-day routine', () => {
    const out = expandSeries({ ...base, rrule: 'RRULE:FREQ=DAILY' })
    expect(out[0].at).toBeNull()
  })
})

describe('daylight saving', () => {
  // Europe/Oslo: forward 2027-03-28, back 2027-10-31.
  it('keeps a 07:00 routine at 07:00 across the spring change', () => {
    const out = expandSeries({
      rrule: 'RRULE:FREQ=DAILY;BYHOUR=7;BYMINUTE=0',
      startsOn: '2027-03-27',
      from: '2027-03-27',
      to: '2027-03-29',
    })

    expect(out.map((o) => o.at?.toISOString())).toEqual([
      '2027-03-27T06:00:00.000Z', // CET, UTC+1
      '2027-03-28T05:00:00.000Z', // transition day, already CEST
      '2027-03-29T05:00:00.000Z', // CEST, UTC+2
    ])
  })

  it('keeps a 07:00 routine at 07:00 across the autumn change', () => {
    const out = expandSeries({
      rrule: 'RRULE:FREQ=DAILY;BYHOUR=7;BYMINUTE=0',
      startsOn: '2027-10-30',
      from: '2027-10-30',
      to: '2027-11-01',
    })

    expect(out.map((o) => o.at?.toISOString())).toEqual([
      '2027-10-30T05:00:00.000Z',
      '2027-10-31T06:00:00.000Z',
      '2027-11-01T06:00:00.000Z',
    ])
  })

  it('produces exactly one occurrence on each transition day', () => {
    for (const day of ['2027-03-28', '2027-10-31']) {
      const out = expandSeries({
        rrule: 'RRULE:FREQ=DAILY;BYHOUR=7;BYMINUTE=0',
        startsOn: day,
        from: day,
        to: day,
      })
      expect(out, day).toHaveLength(1)
    }
  })

  it('does not drift a weekly routine across a transition', () => {
    const out = expandSeries({
      rrule: 'RRULE:FREQ=WEEKLY;BYDAY=SU;BYHOUR=10;BYMINUTE=0',
      startsOn: '2027-03-21',
      from: '2027-03-21',
      to: '2027-04-04',
    })
    // Every occurrence is a Sunday, whatever the clocks did.
    expect(out.map((o) => weekdayOfDate(o.date))).toEqual(['SU', 'SU', 'SU'])
  })
})

describe('safety', () => {
  it('honours the limit rather than running away', () => {
    const out = expandSeries({
      rrule: 'RRULE:FREQ=DAILY',
      startsOn: '2026-01-01',
      from: '2026-01-01',
      to: '2099-01-01',
      limit: 10,
    })
    expect(out).toHaveLength(10)
  })

  it('returns nothing when the window is before the start', () => {
    const out = expandSeries({
      rrule: 'RRULE:FREQ=DAILY',
      startsOn: '2026-09-10',
      from: '2026-09-01',
      to: '2026-09-05',
    })
    expect(out).toEqual([])
  })
})

describe('descriptions', () => {
  it('reads naturally', () => {
    expect(describeRule('RRULE:FREQ=DAILY')).toBe('Every day')
    expect(describeRule('RRULE:FREQ=DAILY;BYHOUR=7;BYMINUTE=0')).toBe('Every day at 07:00')
    expect(describeRule('RRULE:FREQ=WEEKLY;BYDAY=MO')).toBe('Every Monday')
    expect(describeRule('RRULE:FREQ=WEEKLY;BYDAY=TH,SA')).toBe('Every Thursday and Saturday')
    expect(describeRule('RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')).toBe('Weekdays')
    expect(describeRule('RRULE:FREQ=WEEKLY;BYDAY=SA,SU')).toBe('Weekends')
  })

  it('degrades gracefully on a rule it cannot read', () => {
    expect(describeRule('RRULE:FREQ=MONTHLY')).toBe('Custom schedule')
  })
})
