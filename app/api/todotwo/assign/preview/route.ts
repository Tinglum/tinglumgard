import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import { getTodoTwoClient } from '@/lib/todotwo/db'
import { requireApiRole } from '@/lib/todotwo/auth'
import {
  AssignmentAiUnavailableError,
  parseConstraints,
  type RosterPerson,
  type RosterTask,
} from '@/lib/todotwo/domain/assignment-ai'
import {
  EMPTY_PRESETS,
  presetsToConstraints,
  type PresetState,
} from '@/lib/todotwo/domain/assignment-presets'
import {
  buildAssignmentPlan,
  fairnessSpread,
  type AssignableTask,
  type Weekday,
} from '@/lib/todotwo/domain/assignment'

export const dynamic = 'force-dynamic'

const STAFF_ROLES = ['super_admin', 'farm_admin', 'coordinator'] as const

const weekdaySchema = z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])

/** The ticked constraints. Validated here, but built into Constraint objects by
 *  the pure mapper in domain/assignment-presets.ts — no model call for these. */
const presetsSchema = z.object({
  daysOff: z
    .array(
      z.object({
        id: z.string().max(64),
        personId: z.string().uuid(),
        weekdays: z.array(weekdaySchema).max(7),
      })
    )
    .max(50),
  taskExclusions: z
    .array(
      z.object({
        id: z.string().max(64),
        personId: z.string().uuid(),
        taskGroupLabel: z.string().trim().max(200),
      })
    )
    .max(50),
  maxPerDay: z
    .object({
      personId: z.string().uuid().nullable(),
      limit: z.number().int().min(1).max(100),
    })
    .nullable(),
})

const bodySchema = z.object({
  text: z.string().trim().max(2000),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  projectId: z.string().uuid().optional(),
  presets: presetsSchema.optional(),
})

const WEEKDAY_CODES: Weekday[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

/** The weekday of a calendar date, treated as a plain calendar day (no timezone conversion — a farm-local
 *  YYYY-MM-DD is already the day it names). */
function weekdayOf(date: string): Weekday {
  const [year, month, day] = date.split('-').map(Number)
  return WEEKDAY_CODES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
}

/**
 * Preview only. Loads the open tasks and active people in the window, asks
 * Claude to translate the free text into constraints, runs the deterministic
 * solver, and returns the resulting plan. Nothing is written to the database
 * — see /api/todotwo/assign/apply for that.
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

  if (parsed.from > parsed.to) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'The start of the window must not be after the end.' },
      { status: 400 }
    )
  }

  const db = getTodoTwoClient()

  const { data: peopleRows, error: peopleError } = await db
    .from('people')
    .select('id, full_name, preferred_name')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('full_name')

  if (peopleError) {
    return NextResponse.json(
      { error: 'load_failed', message: `Could not load people: ${peopleError.message}` },
      { status: 500 }
    )
  }

  let taskQuery = db
    .from('tasks_resolved')
    .select('id, title, due_date, status, project_id, series_id')
    .is('parent_task_id', null)
    .in('status', ['draft', 'unassigned'])
    .gte('due_date', parsed.from)
    .lte('due_date', parsed.to)

  if (parsed.projectId) {
    taskQuery = taskQuery.eq('project_id', parsed.projectId)
  }

  const { data: taskRows, error: taskError } = await taskQuery

  if (taskError) {
    return NextResponse.json(
      { error: 'load_failed', message: `Could not load tasks: ${taskError.message}` },
      { status: 500 }
    )
  }

  const rows = (taskRows ?? []) as {
    id: string
    title: string
    due_date: string | null
    status: string
    project_id: string | null
    series_id: string | null
  }[]

  const openTasks = rows.filter((row): row is typeof row & { due_date: string } => row.due_date !== null)

  const [{ data: projectRows }, { data: seriesRows }] = await Promise.all([
    db.from('projects').select('id, name'),
    db.from('task_series').select('id, title'),
  ])

  const projectName = new Map(((projectRows ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]))
  const seriesTitle = new Map(((seriesRows ?? []) as { id: string; title: string }[]).map((s) => [s.id, s.title]))

  function groupLabelFor(row: (typeof openTasks)[number]): string | null {
    if (row.series_id) return seriesTitle.get(row.series_id) ?? null
    if (row.project_id) return projectName.get(row.project_id) ?? null
    return null
  }

  const people: RosterPerson[] = ((peopleRows ?? []) as { id: string; full_name: string; preferred_name: string | null }[]).map(
    (p) => ({ id: p.id, name: p.preferred_name || p.full_name })
  )

  const rosterTasks: RosterTask[] = openTasks.map((row) => ({
    id: row.id,
    title: row.title,
    groupLabel: groupLabelFor(row),
  }))

  const assignableTasks: AssignableTask[] = openTasks.map((row) => ({
    id: row.id,
    date: row.due_date,
    weekday: weekdayOf(row.due_date),
    title: row.title,
    groupLabel: groupLabelFor(row),
  }))

  if (people.length === 0) {
    return NextResponse.json(
      { error: 'no_people', message: 'No active people to assign work to.' },
      { status: 422 }
    )
  }

  if (assignableTasks.length === 0) {
    return NextResponse.json(
      { error: 'no_tasks', message: 'No unassigned tasks in that window.' },
      { status: 422 }
    )
  }

  // Ticked boxes first: pure, deterministic, and independent of whether the
  // model is reachable at all.
  const presetResult = presetsToConstraints((parsed.presets as PresetState | undefined) ?? EMPTY_PRESETS, {
    people,
    tasks: rosterTasks,
  })

  let aiResult
  try {
    aiResult = await parseConstraints(parsed.text, { people, tasks: rosterTasks })
  } catch (error) {
    if (error instanceof AssignmentAiUnavailableError) {
      return NextResponse.json({ error: 'ai_unavailable', message: error.message }, { status: 503 })
    }
    throw error
  }

  // Concatenated, not chosen between: ticking a box and writing a sentence are
  // two ways of saying something, and both are meant to hold.
  const constraints = [...presetResult.constraints, ...aiResult.constraints]
  const unresolved = [...presetResult.unresolved, ...aiResult.unresolved]

  const plan = buildAssignmentPlan(assignableTasks, people, constraints)

  return NextResponse.json({
    ok: true,
    summary: aiResult.summary,
    constraints,
    presetConstraints: presetResult.constraints,
    aiConstraints: aiResult.constraints,
    unresolved,
    plan: {
      assignments: plan.assignments,
      unassignable: plan.unassignable,
      load: plan.load,
      inertConstraints: plan.inertConstraints,
      fairnessSpread: fairnessSpread(plan),
    },
    taskCount: assignableTasks.length,
  })
}
