import { describe, expect, it } from 'vitest'
import { plannedThisWeek, projectPlanLabel } from '@/lib/todotwo/domain/project-planning'
import { navItemsForRoles } from '@/components/todotwo/shell/navigation'

describe('project planning', () => {
  it('keeps planned weeks independent of deadlines and undated later work', () => {
    expect(plannedThisWeek({ planned_week: '2026-11-02', due_date: null }, '2026-11-06')).toBe(true)
    expect(plannedThisWeek({ planned_week: '2026-11-09', due_date: null }, '2026-11-06')).toBe(false)
    expect(plannedThisWeek({ planned_week: '2026-11-09', due_date: '2026-11-08' }, '2026-11-06')).toBe(true)
    expect(plannedThisWeek({ due_date: null }, '2026-11-06')).toBe(false)
    expect(projectPlanLabel({ due_date: null })).toContain('To do later')
    expect(projectPlanLabel({ due_date: '2026-11-08', due_date_certainty: 'approximate' })).toContain('Approximate target')
    expect(projectPlanLabel({ due_date: '2026-11-08', due_date_certainty: 'definite' })).toContain('Definite deadline')
  })

  it('makes recipes and project planning accessible to farm members', () => {
    const links = navItemsForRoles(['workawayer']).map(item => item.label)
    expect(links).toContain('Recipes')
    expect(links).toContain('Projects')
  })
})
