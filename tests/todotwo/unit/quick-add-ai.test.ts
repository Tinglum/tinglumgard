import { describe, expect, it } from 'vitest'

import {
  resolvePersonId,
  resolveProjectId,
  resolveQuickAdd,
  type QuickAddContext,
  type RawQuickAddResult,
} from '@/lib/todotwo/domain/quick-add-ai'

/**
 * These test the resolution layer only — matching a (stubbed) model's
 * name/label output against real people/projects, and the "never invent an
 * id" discipline described in quick-add-ai.ts. The real Claude call is never
 * made here.
 */

const context: QuickAddContext = {
  people: [
    { id: 'amber-id', name: 'Amber' },
    { id: 'robert-id', name: 'Robert' },
  ],
  projects: [
    { id: 'fence-id', name: 'Fencing' },
    { id: 'animals-id', name: 'Animal Care' },
  ],
  today: '2026-09-03',
}

function raw(overrides: Partial<RawQuickAddResult>): RawQuickAddResult {
  return {
    title: 'Check the fence',
    description: null,
    dueDate: null,
    assigneeName: null,
    projectName: null,
    ...overrides,
  }
}

describe('resolvePersonId', () => {
  it('matches exactly, case-insensitively', () => {
    expect(resolvePersonId('amber', context.people)).toBe('amber-id')
  })

  it('matches a unique prefix', () => {
    expect(resolvePersonId('Rob', context.people)).toBe('robert-id')
  })

  it('returns null for null input', () => {
    expect(resolvePersonId(null, context.people)).toBeNull()
  })

  it('returns null for a name nobody on the roster matches — never guesses', () => {
    expect(resolvePersonId('Someone Else Entirely', context.people)).toBeNull()
  })
})

describe('resolveProjectId', () => {
  it('matches exactly, case-insensitively', () => {
    expect(resolveProjectId('fencing', context.projects)).toBe('fence-id')
  })

  it('returns null for an unrecognized project — never invents one', () => {
    expect(resolveProjectId('Some Made Up Project', context.projects)).toBeNull()
  })
})

describe('resolveQuickAdd', () => {
  it('resolves a valid assignee and project by name', () => {
    const result = resolveQuickAdd(
      raw({ assigneeName: 'Amber', projectName: 'Fencing', dueDate: '2026-09-04' }),
      context
    )
    expect(result).toEqual({
      title: 'Check the fence',
      description: null,
      dueDate: '2026-09-04',
      assigneePersonId: 'amber-id',
      projectId: 'fence-id',
    })
  })

  it('nulls out an assignee name that does not match any real person', () => {
    const result = resolveQuickAdd(raw({ assigneeName: 'Nobody Real' }), context)
    expect(result.assigneePersonId).toBeNull()
  })

  it('nulls out a project name that does not match any real project', () => {
    const result = resolveQuickAdd(raw({ projectName: 'Imaginary Project' }), context)
    expect(result.projectId).toBeNull()
  })

  it('falls back to a placeholder title if the model somehow returns blank', () => {
    const result = resolveQuickAdd(raw({ title: '   ' }), context)
    expect(result.title).toBe('Untitled task')
  })

  it('trims a blank description down to null', () => {
    const result = resolveQuickAdd(raw({ description: '   ' }), context)
    expect(result.description).toBeNull()
  })

  it('passes through a real description untouched', () => {
    const result = resolveQuickAdd(raw({ description: 'Extra detail' }), context)
    expect(result.description).toBe('Extra detail')
  })
})
