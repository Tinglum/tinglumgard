import { addFarmDays, type FarmDate } from '@/lib/todotwo/time'
import { weekdayOfDate } from './recurrence'

export function farmWeek(today: FarmDate): { start: FarmDate; end: FarmDate } {
  const offset = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].indexOf(weekdayOfDate(today))
  const start = addFarmDays(today, -offset)
  return { start, end: addFarmDays(start, 6) }
}

export function weeklyProjectSeries(series: { id: string; rrule: string }[]): Set<string> {
  return new Set(series.filter(row => /(?:^|;)FREQ=WEEKLY(?:;|$)/i.test(row.rrule.replace(/^RRULE:/i, ''))).map(row => row.id))
}
