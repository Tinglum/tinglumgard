import { describe, expect, it, vi } from 'vitest'
import { farmWeek, weeklyProjectSeries } from '@/lib/todotwo/domain/weekly-projects'

const { from } = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/lib/todotwo/db', () => ({ getTodoTwoClient: () => ({ from }) }))
import { getToday } from '@/lib/todotwo/queries'

describe('the weekly project plan', () => {
  it('opens the entire Monday–Sunday week across year and DST boundaries', () => {
    expect(farmWeek('2026-11-02')).toEqual({ start: '2026-11-02', end: '2026-11-08' })
    expect(farmWeek('2026-11-08')).toEqual({ start: '2026-11-02', end: '2026-11-08' })
    expect(farmWeek('2027-01-01')).toEqual({ start: '2026-12-28', end: '2027-01-03' })
    expect(farmWeek('2026-10-25')).toEqual({ start: '2026-10-19', end: '2026-10-25' })
    expect(Array.from(weeklyProjectSeries([{ id: 'weekly', rrule: 'RRULE:FREQ=WEEKLY;BYDAY=FR' }, { id: 'daily', rrule: 'FREQ=DAILY' }]))).toEqual(['weekly'])
  })

  it('shows Friday projects on Monday, carries missed work, and keeps daily work separate', async () => {
    const task = (id: string, date: string | null, series: string | null, project: string | null = null, status = 'unassigned') => ({
      id, title: id, due_date: date, due_at: null, series_id: series, project_id: project, status, priority: 4,
    })
    const calls: { table: string; method: string; args: unknown[] }[] = []
    const answers: Record<string, unknown[]> = {
      tasks_resolved: [
        { data: [task('morning goats', '2026-11-02', 'daily'), task('Friday cleanup', '2026-11-06', 'weekly'), task('missed workshop', '2026-10-27', 'weekly'), task('Friday goats', '2026-11-06', 'daily')] },
        { data: [task('done project', '2026-11-02', 'weekly', null, 'completed')] },
        { count: 0 },
        { data: [task('build shelving', null, null, 'farm')] },
      ],
      task_series: [{ data: [{ id: 'daily', rrule: 'FREQ=DAILY' }, { id: 'weekly', rrule: 'FREQ=WEEKLY;BYDAY=FR' }] }],
      projects: [{ data: { id: 'farm' } }],
      task_assignments: [{ data: [] }], people_roster: [{ data: [] }],
    }
    from.mockImplementation((table: string) => {
      const result = answers[table].shift()
      const builder: Record<string, unknown> = {}
      for (const method of ['select', 'is', 'gte', 'lte', 'in', 'eq', 'not', 'lt', 'maybeSingle']) {
        builder[method] = (...args: unknown[]) => { calls.push({ table, method, args }); return builder }
      }
      builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
      return builder
    })
    const day = await getToday('reader', '2026-11-02')
    expect(day.weeklyProjects.map(row => row.id).sort()).toEqual(['Friday cleanup', 'build shelving', 'done project', 'missed workshop'].sort())
    expect(day.unclaimed.map(row => row.id)).toEqual(['morning goats'])
    expect(day.mine).toEqual([])
    expect(calls).toContainEqual({ table: 'tasks_resolved', method: 'lte', args: ['due_date', '2026-11-08'] })
  })
})
