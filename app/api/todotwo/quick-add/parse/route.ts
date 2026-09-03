import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import { getTodoTwoClient } from '@/lib/todotwo/db'
import { requireApiRole } from '@/lib/todotwo/auth'
import { farmToday } from '@/lib/todotwo/time'
import {
  QuickAddAiUnavailableError,
  parseQuickAdd,
  type QuickAddPerson,
  type QuickAddProject,
} from '@/lib/todotwo/domain/quick-add-ai'

export const dynamic = 'force-dynamic'

// See supabase/migrations/20260909083000_todotwo_quick_add.sql for why
// create_task (and therefore quick-add end to end) is staff-only for now.
const STAFF_ROLES = ['super_admin', 'farm_admin', 'coordinator'] as const

const bodySchema = z.object({
  text: z.string().trim().min(1).max(1000),
})

/**
 * Preview only. Loads active people and projects through the RLS client,
 * asks Claude to turn the free text into a structured proposal, and returns
 * it for the UI to show as a confirmation step. Nothing is written here —
 * see /api/todotwo/quick-add/create for that.
 */
export async function POST(request: NextRequest) {
  if (!isTodoTwoEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const authResult = await requireApiRole([...STAFF_ROLES])
  if (!authResult.ok) return authResult.response

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        message: error instanceof z.ZodError ? error.issues[0]?.message : 'Invalid request body.',
      },
      { status: 400 }
    )
  }

  const db = getTodoTwoClient()

  const [{ data: peopleRows, error: peopleError }, { data: projectRows, error: projectError }] = await Promise.all([
    db
      .from('people')
      .select('id, full_name, preferred_name')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('full_name'),
    db.from('projects').select('id, name').order('name'),
  ])

  if (peopleError) {
    return NextResponse.json(
      { error: 'load_failed', message: `Could not load people: ${peopleError.message}` },
      { status: 500 }
    )
  }

  if (projectError) {
    return NextResponse.json(
      { error: 'load_failed', message: `Could not load projects: ${projectError.message}` },
      { status: 500 }
    )
  }

  const people: QuickAddPerson[] = ((peopleRows ?? []) as { id: string; full_name: string; preferred_name: string | null }[]).map(
    (p) => ({ id: p.id, name: p.preferred_name || p.full_name })
  )
  const projects: QuickAddProject[] = ((projectRows ?? []) as { id: string; name: string }[]).map((p) => ({
    id: p.id,
    name: p.name,
  }))

  const today = farmToday()

  let result
  try {
    result = await parseQuickAdd(parsed.text, { people, projects, today })
  } catch (error) {
    if (error instanceof QuickAddAiUnavailableError) {
      return NextResponse.json({ error: 'ai_unavailable', message: error.message }, { status: 503 })
    }
    throw error
  }

  return NextResponse.json({
    ok: true,
    parsed: result,
    people,
    projects,
  })
}
