import { describe, expect, it } from 'vitest'
import {
  ROTATION_ANCHOR,
  breaksFor,
  dayOffSchedule,
  daysOffPair,
  isWeeklyDaysOffPair,
  rotaParticipants,
  type RotaParticipant,
} from '@/lib/todotwo/domain/days-off'
import { addFarmDays } from '@/lib/todotwo/time'

const crew = (n: number, away: Record<string, string[]> = {}): RotaParticipant[] =>
  ['a', 'b', 'c', 'd', 'e', 'f', 'g'].slice(0, n).map((id) => ({
    id,
    name: id.toUpperCase(),
    unavailableDates: away[id] ?? [],
  }))

const offIds = (participants: RotaParticipant[], from = ROTATION_ANCHOR, days = 14) =>
  dayOffSchedule(participants, from, days).map((day) => day.off?.id ?? null)

describe('headcount days off', () => {
  it('six people: exactly one off every day, each in consecutive pairs', () => {
    const schedule = dayOffSchedule(crew(6), ROTATION_ANCHOR, 14)
    expect(schedule.every((day) => day.off !== null && day.available === 6)).toBe(true)
    expect(offIds(crew(6))).toEqual(['a', 'a', 'b', 'b', 'c', 'c', 'd', 'd', 'e', 'e', 'f', 'f', 'a', 'a'])
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) {
      for (const period of breaksFor(schedule, id)) expect(addFarmDays(period.from, 1)).toBe(period.to)
    }
  })

  it('five people: still one off every day', () => {
    expect(offIds(crew(5))).toEqual(['a', 'a', 'b', 'b', 'c', 'c', 'd', 'd', 'e', 'e', 'a', 'a', 'b', 'b'])
  })

  it('four people: nobody off', () => {
    expect(offIds(crew(4)).every((id) => id === null)).toBe(true)
  })

  it('a stand-in covers a block whose owner is on time off, and headcount is re-checked', () => {
    // Anchor+0/+1 is A's block. A is on holiday: six on the books, five can
    // work, so one of the five (B, next in order) is off.
    const away = { a: [ROTATION_ANCHOR, addFarmDays(ROTATION_ANCHOR, 1)] }
    expect(offIds(crew(6, away), ROTATION_ANCHOR, 4)).toEqual(['b', 'b', 'b', 'b'])
    // With five on the books the holiday drops the farm to four: nobody off.
    expect(offIds(crew(5, away), ROTATION_ANCHOR, 4)).toEqual([null, null, 'b', 'b'])
  })

  it('time off landing mid-block only moves that one day', () => {
    const away = { b: [addFarmDays(ROTATION_ANCHOR, 3)] }
    expect(offIds(crew(6, away), ROTATION_ANCHOR, 4)).toEqual(['a', 'a', 'b', 'c'])
  })

  it('is a function of the date: later windows agree with earlier ones', () => {
    const from = addFarmDays(ROTATION_ANCHOR, 37)
    const twice = [offIds(crew(6), from), offIds(crew(6), from)]
    expect(twice[0]).toEqual(twice[1])
    expect(offIds(crew(6), addFarmDays(from, 3), 11)).toEqual(offIds(crew(6), from).slice(3))
    // Dates before the anchor rotate too, rather than breaking.
    expect(offIds(crew(6), addFarmDays(ROTATION_ANCHOR, -2), 2)).toEqual(['f', 'f'])
  })

  it('does not depend on input order', () => {
    expect(offIds([...crew(6)].reverse())).toEqual(offIds(crew(6)))
  })
})

describe('who is in the rotation', () => {
  it('drops nonparticipants and marks the onboarding ramp unavailable', () => {
    const participants = rotaParticipants([
      { id: 'k', name: 'Kenneth', farmStartDate: null, nonparticipant: true, awayDates: [] },
      { id: 'n', name: 'New', farmStartDate: '2026-10-01', nonparticipant: false, awayDates: ['2026-10-09'] },
    ], '2026-09-28', 14)
    expect(participants.map((p) => p.id)).toEqual(['n'])
    expect(participants[0].unavailableDates).toEqual([
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-09',
    ])
  })
})

describe('legacy weekly pairs', () => {
  it('wraps Sunday into Monday', () => {
    expect(daysOffPair('SU')).toEqual(['SU', 'MO'])
  })

  it('recognises only the two-consecutive-weekday shape', () => {
    expect(isWeeklyDaysOffPair(['SA', 'SU'])).toBe(true)
    expect(isWeeklyDaysOffPair(['SU', 'MO'])).toBe(true)
    expect(isWeeklyDaysOffPair(['MO', 'TH'])).toBe(false)
    expect(isWeeklyDaysOffPair(['MO'])).toBe(false)
    expect(isWeeklyDaysOffPair(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).toBe(false)
  })
})

describe('feeding the solver', () => {
  it('the person off gets nothing that day', async () => {
    const { buildAssignmentPlan } = await import('@/lib/todotwo/domain/assignment')
    const participants = crew(6)
    const schedule = dayOffSchedule(participants, ROTATION_ANCHOR, 4)
    const tasks = schedule.flatMap((day) => Array.from({ length: 12 }, (_, i) => ({
      id: `${day.date}-${i}`, date: day.date, weekday: 'MO' as const, title: `Job ${i}`, groupLabel: null,
    })))
    const plan = buildAssignmentPlan(tasks, participants, schedule.flatMap((day) =>
      day.off ? [{ kind: 'unavailable_dates' as const, personId: day.off.id, dates: [day.date] }] : []))
    for (const day of schedule) {
      const onDay = plan.assignments.filter((a) => a.taskId.startsWith(day.date))
      expect(onDay).toHaveLength(12)
      expect(onDay.some((a) => a.personId === day.off!.id)).toBe(false)
    }
  })

  it('reads approved time off into away dates', async () => {
    const { awayDatesByPerson } = await import('@/lib/todotwo/domain/days-off')
    const away = awayDatesByPerson(
      [{ personId: 'a', startDate: '2026-09-27', endDate: '2026-09-29' }],
      [],
      { from: '2026-09-28', to: '2026-10-11' },
      ['a']
    )
    expect(away.get('a')).toEqual(['2026-09-28', '2026-09-29'])
  })
})

describe('releasing work held on a day off', () => {
  it('releases only auto-assigned open work on a future day off', async () => {
    const { assignmentsToRelease } = await import('@/lib/todotwo/domain/days-off')
    const today = '2026-09-26'
    const schedule = [
      { date: '2026-09-26', available: 5, off: { id: 'theo', name: 'Theo' } },
      { date: '2026-09-27', available: 5, off: { id: 'theo', name: 'Theo' } },
      { date: '2026-09-28', available: 4, off: null },
    ]
    const row = (assignmentId: string, over: Record<string, unknown> = {}) => ({
      assignmentId, taskId: `t-${assignmentId}`, personId: 'theo', assignedByPersonId: null,
      role: 'assignee', unassignedAt: null, dueDate: '2026-09-27', taskStatus: 'assigned', ...over,
    })
    const held = [
      row('auto'),
      row('by-coordinator', { assignedByPersonId: 'coord' }),
      row('self-claimed', { assignedByPersonId: 'theo' }),
      row('completed', { taskStatus: 'completed' }),
      row('today', { dueDate: '2026-09-26' }),
      row('someone-else', { personId: 'miguel' }),
      row('nobody-off', { dueDate: '2026-09-28' }),
      row('ended', { unassignedAt: '2026-09-25T10:00:00Z' }),
      row('helper', { role: 'helper' }),
    ]
    expect(assignmentsToRelease(held, schedule, today).map((r) => r.assignmentId))
      .toEqual(['auto', 'by-coordinator'])
  })
})

describe('leave dates', () => {
  it('keeps somebody off the rota from the day they leave, and every day after', () => {
    const [leaver] = rotaParticipants(
      [
        {
          id: 'l',
          name: 'Leaver',
          farmStartDate: null,
          nonparticipant: false,
          awayDates: [],
          leaveDate: '2026-10-02',
        },
      ],
      '2026-09-30',
      5
    )
    // Working 30 Sep and 1 Oct; gone from 2 Oct, leaving day included.
    expect(leaver.unavailableDates).toEqual(['2026-10-02', '2026-10-03', '2026-10-04'])
  })

  it('counts a leaver out of the headcount, so days off follow', () => {
    const base = ['a', 'b', 'c', 'd', 'e'].map((id) => ({
      id,
      name: id,
      farmStartDate: null,
      nonparticipant: false,
      awayDates: [] as string[],
    }))
    // Five available until "e" leaves on 2 Oct, then four: nobody can be off.
    const rota = rotaParticipants(
      [...base.slice(0, 4), { ...base[4], leaveDate: '2026-10-02' }],
      '2026-09-30',
      4
    )
    const schedule = dayOffSchedule(rota, '2026-09-30', 4)
    expect(schedule.map((d) => d.available)).toEqual([5, 5, 4, 4])
    expect(schedule[2].off).toBeNull()
    expect(schedule[3].off).toBeNull()
  })
})
