import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import { getTodoTwoClient } from '@/lib/todotwo/db'
import { requireApiRole } from '@/lib/todotwo/auth'

export const dynamic = 'force-dynamic'

const STAFF_ROLES = ['super_admin', 'farm_admin', 'coordinator'] as const

const bodySchema = z.object({
  assignments: z
    .array(
      z.object({
        taskId: z.string().uuid(),
        personId: z.string().uuid(),
      })
    )
    .min(1)
    .max(500),
})

/**
 * Applies a previously-previewed plan.
 *
 * Deliberately takes the exact {taskId, personId} pairs the preview produced
 * rather than re-running text-to-constraints itself — the coordinator saw and
 * approved this plan, and a second AI call between preview and apply could
 * approve a different one without anyone noticing.
 *
 * Each assignment goes through todotwo.assign_task, the same security-definer
 * function the single-task and rota UIs use, so it gets the same staff check
 * and audit trail. There is no cross-row transaction here — Postgres RPCs
 * called one at a time from a route handler cannot share one — so a failure
 * partway through is reported per-row rather than silently rolled back.
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

  const applied: { taskId: string; personId: string }[] = []
  const failed: { taskId: string; personId: string; message: string }[] = []

  for (const assignment of parsed.assignments) {
    const { error } = await db.rpc('assign_task', {
      p_task_id: assignment.taskId,
      p_person_id: assignment.personId,
    })

    if (error) {
      failed.push({ ...assignment, message: error.message })
    } else {
      applied.push(assignment)
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    appliedCount: applied.length,
    failed,
  })
}
