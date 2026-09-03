import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import { getTodoTwoClient } from '@/lib/todotwo/db'
import { requireApiRole } from '@/lib/todotwo/auth'

export const dynamic = 'force-dynamic'

// See supabase/migrations/20260909083000_todotwo_quick_add.sql for why
// create_task (and therefore quick-add end to end) is staff-only for now.
const STAFF_ROLES = ['super_admin', 'farm_admin', 'coordinator'] as const

const bodySchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(4000).nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  sectionId: z.string().uuid().nullable().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
    .nullable()
    .optional(),
  assigneePersonId: z.string().uuid().nullable().optional(),
})

/**
 * Creates the task the person confirmed on the quick-add preview screen.
 * Takes the (possibly user-edited) fields directly rather than re-parsing the
 * original text — the person reviewed and can have corrected this exact
 * shape, and a second AI call between preview and create could silently
 * propose something different.
 *
 * Goes through todotwo.create_task, the same staff-gated, security-definer
 * entry point used everywhere else task rows are created from nothing.
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

  const { data: newTaskId, error } = await db.rpc('create_task', {
    p_title: parsed.title,
    p_description: parsed.description ?? null,
    p_project_id: parsed.projectId ?? null,
    p_section_id: parsed.sectionId ?? null,
    p_due_date: parsed.dueDate ?? null,
    p_assignee_person_id: parsed.assigneePersonId ?? null,
  })

  if (error) {
    return NextResponse.json({ error: 'create_failed', message: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, taskId: newTaskId })
}
