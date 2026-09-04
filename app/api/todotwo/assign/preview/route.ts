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
  farmConstraints,
  fairnessReport,
  type ApprovedTimeOff,
  type SkillAuthorization,
  type StayWindow,
  type TaskSkillRequirement,
} from '@/lib/todotwo/domain/assignment-inputs'
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
    .select('id, title, due_date, status, project_id, series_id, required_skill_id, estimated_minutes')
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
    required_skill_id: string | null
    estimated_minutes: number | null
  }[]

  const openTasks = rows.filter((row): row is typeof row & { due_date: string } => row.due_date !== null)

  // The farm's own facts. These are not preferences a coordinator expresses
  // this morning — they are what is already true about who is here, who is
  // off, and who is signed off to work unsupervised.
  const [
    { data: projectRows },
    { data: seriesRows },
    { data: timeOffRows },
    { data: stayRows },
    { data: skillRows },
    { data: skillNameRows },
  ] = await Promise.all([
    db.from('projects').select('id, name'),
    db.from('task_series').select('id, title'),
    db
      .from('time_off_requests')
      .select('id, person_id, start_date, end_date, kind, status')
      .eq('status', 'approved')
      .lte('start_date', parsed.to)
      .gte('end_date', parsed.from),
    db
      .from('stays')
      .select(
        'id, person_id, arrival_date, arrival_certainty, departure_date, departure_certainty, status'
      )
      .lte('arrival_date', parsed.to),
    db.from('person_skills').select('person_id, skill_id, authorized_unsupervised'),
    db.from('skills').select('id, name'),
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

  // ---------------------------------------------------------------------
  // The farm's own facts, turned into constraints before anyone's preferences.
  // ---------------------------------------------------------------------
  const skillName = new Map(
    ((skillNameRows ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name])
  )

  const timeOff: ApprovedTimeOff[] = (
    (timeOffRows ?? []) as {
      id: string
      person_id: string
      start_date: string
      end_date: string
      kind: string
    }[]
  ).map((r) => ({
    id: r.id,
    personId: r.person_id,
    startDate: r.start_date,
    endDate: r.end_date,
    kind: r.kind,
  }))

  const stays: StayWindow[] = (
    (stayRows ?? []) as {
      id: string
      person_id: string
      arrival_date: string
      arrival_certainty: string
      departure_date: string | null
      departure_certainty: string | null
      status: string
    }[]
  ).map((r) => ({
    id: r.id,
    personId: r.person_id,
    arrivalDate: r.arrival_date,
    arrivalCertainty: r.arrival_certainty as StayWindow['arrivalCertainty'],
    departureDate: r.departure_date,
    departureCertainty: r.departure_certainty as StayWindow['departureCertainty'],
    status: r.status,
  }))

  const skillAuthorizations: SkillAuthorization[] = (
    (skillRows ?? []) as {
      person_id: string
      skill_id: string
      authorized_unsupervised: boolean
    }[]
  ).map((r) => ({
    personId: r.person_id,
    skillId: r.skill_id,
    authorizedUnsupervised: r.authorized_unsupervised,
  }))

  const skillRequirements: TaskSkillRequirement[] = openTasks
    .filter((row) => row.required_skill_id !== null)
    .map((row) => ({
      taskId: row.id,
      title: row.title,
      date: row.due_date,
      skillId: row.required_skill_id as string,
      skillName: skillName.get(row.required_skill_id as string) ?? null,
    }))

  const nameOf = (personId: string) =>
    people.find((p) => p.id === personId)?.name ?? 'Someone'

  const farm = farmConstraints({
    window: { from: parsed.from, to: parsed.to },
    peopleIds: people.map((p) => p.id),
    nameOf,
    timeOff,
    stays,
    skillRequirements,
    skillAuthorizations,
  })

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
  // Farm facts lead. The solver treats constraints as a set and does not care
  // about order, but a coordinator reading "why was Amber skipped" should meet
  // the things that were never up for negotiation before the ones they chose
  // this morning.
  const farmOnly = farm.sourced.map((s) => s.constraint)
  const constraints = [...farmOnly, ...presetResult.constraints, ...aiResult.constraints]
  const unresolved = [...presetResult.unresolved, ...aiResult.unresolved]

  const plan = buildAssignmentPlan(assignableTasks, people, constraints)

  return NextResponse.json({
    ok: true,
    summary: aiResult.summary,
    constraints,
    farmConstraints: farm.sourced,
    farmWarnings: farm.warnings,
    presetConstraints: presetResult.constraints,
    aiConstraints: aiResult.constraints,
    unresolved,
    plan: {
      assignments: plan.assignments,
      unassignable: plan.unassignable,
      load: plan.load,
      inertConstraints: plan.inertConstraints,
      fairnessSpread: fairnessSpread(plan),
      fairness: fairnessReport(
        plan.assignments,
        plan.load,
        new Map(openTasks.map((row) => [row.id, row.estimated_minutes]))
      ),
    },
    taskCount: assignableTasks.length,
  })
}
