import { NextRequest, NextResponse } from 'next/server'

import { requireApiRole } from '@/lib/todotwo/auth'
import { getTodoTwoClient } from '@/lib/todotwo/db'

export const dynamic = 'force-dynamic'

/**
 * Editing a one-off task: its text and its steps.
 *
 * A one-off task's steps are not task_series_steps — they are child tasks
 * hanging off parent_task_id, which is how the Todoist import brought subtasks
 * across and how getTaskDetail still reads them. So "add a step" here means
 * "insert a child task", and the two editors cannot share a code path however
 * similar they look on screen.
 *
 * Occurrences of a routine are deliberately not editable through here. Their
 * text belongs to the series — that is what makes one edit change every future
 * day — and letting somebody override a single Wednesday from the task screen
 * would quietly break that promise. Those go through
 * /api/todotwo/routines/[id].
 *
 * Caller's own session throughout, so RLS decides. Staff may write tasks;
 * nobody else may.
 */

interface StepInput {
  id?: string
  title?: unknown
  description?: unknown
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(['super_admin', 'farm_admin', 'coordinator'])
  if (!auth.ok) return auth.response

  const body = (await request.json().catch(() => null)) as {
    title?: unknown
    description?: unknown
    steps?: unknown
  } | null
  if (!body) return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 })

  const title = cleanText(body.title)
  if (!title) return NextResponse.json({ error: 'A task needs a name.' }, { status: 400 })

  const description = cleanText(body.description)

  const db = getTodoTwoClient()

  const { data: task, error: readError } = await db
    .from('tasks')
    .select('id, series_id, project_id, section_id, due_date')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
  if (!task) return NextResponse.json({ error: 'No such task.' }, { status: 404 })

  if (task.series_id) {
    return NextResponse.json(
      {
        error:
          'This day belongs to a recurring routine. Edit the routine so every future day changes with it.',
      },
      { status: 409 }
    )
  }

  const { error: updateError } = await db
    .from('tasks')
    .update({ title, description })
    .eq('id', params.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const rawSteps = Array.isArray(body.steps) ? (body.steps as StepInput[]) : []
  const steps = rawSteps
    .map((step) => ({
      id: typeof step.id === 'string' && step.id ? step.id : null,
      title: cleanText(step.title),
      description: cleanText(step.description),
    }))
    .filter((step): step is { id: string | null; title: string; description: string | null } =>
      step.title !== null
    )

  const { data: currentChildren } = await db
    .from('tasks')
    .select('id')
    .eq('parent_task_id', params.id)
    .is('deleted_at', null)

  const keptIds = new Set(steps.flatMap((step) => (step.id ? [step.id] : [])))
  const removed = ((currentChildren ?? []) as { id: string }[])
    .map((row) => row.id)
    .filter((id) => !keptIds.has(id))

  // Soft delete: deleting a child task outright needs admin, and would throw
  // away the record of it having been done. Withdrawn is enough.
  if (removed.length > 0) {
    const { error } = await db
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', removed)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]
    const sort_order = (index + 1) * 10

    const { error } = step.id
      ? await db
          .from('tasks')
          .update({ title: step.title, description: step.description, sort_order })
          .eq('id', step.id)
      : await db.from('tasks').insert({
          parent_task_id: params.id,
          title: step.title,
          description: step.description,
          // A step rides with its parent: same project, same day. It is part of
          // that job, not a separate one somebody could be assigned on its own.
          project_id: task.project_id,
          section_id: task.section_id,
          due_date: task.due_date,
          all_day: true,
          priority: 4,
          status: 'unassigned' as const,
          sort_order,
        })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
