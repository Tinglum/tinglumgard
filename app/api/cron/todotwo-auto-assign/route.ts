import { NextRequest, NextResponse } from 'next/server'

// PRIVILEGED. Runs from GitHub Actions cron with no user session — see
// app/api/cron/todotwo-notifications for the rationale.
import { getPrivilegedClientForCronOnly } from '@/lib/todotwo/db-privileged'
import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import { buildAssignmentPlan, type AssignableTask, type Weekday } from '@/lib/todotwo/domain/assignment'
import { farmRuleConstraints } from '@/lib/todotwo/domain/farm-rules'
import { farmConstraints, type ApprovedTimeOff, type StayWindow } from '@/lib/todotwo/domain/assignment-inputs'
import { addFarmDays, farmToday } from '@/lib/todotwo/time'
import { weekdayOfDate } from '@/lib/todotwo/domain/recurrence'

export const dynamic = 'force-dynamic'

/**
 * Keeps the next few days assigned, so nobody wakes up to an unclaimed farm.
 *
 * The generation cron already guarantees occurrences exist four days ahead.
 * That only produced tasks with nobody on them: the fourth day was always
 * there and always empty until a coordinator sat down with the console. This
 * closes that gap — the same window is now assigned as well as generated, and
 * the people who pick up the work are told.
 *
 * What it will and will not touch:
 *
 *   * Only genuinely unassigned tasks. An assignment somebody made by hand,
 *     or a swap two people agreed between themselves, is never overwritten —
 *     the day's plan is built from what is still spare.
 *   * The farm's standing arrangement applies (lib/todotwo/domain/farm-rules),
 *     the same rules the console's button uses, so an automatic round and a
 *     manual one produce the same shape of day.
 *   * Approved time off, stay windows and skill sign-off are honoured, via
 *     the same farmConstraints() the preview uses. Somebody on an approved
 *     day off does not get handed work at four in the morning by a robot.
 *
 * Notifications happen by themselves: assign_task writes task_assignments,
 * and the trigger on that table queues a notice for near-term work. That is
 * why the horizon here and the trigger's window are the same number.
 */

/** Assign this far ahead. The fourth day is the point of the exercise. */
const HORIZON_DAYS = 4

async function isAuthorized(request: NextRequest): Promise<{ ok: boolean; status: number; error?: string }> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return { ok: false, status: 500, error: 'CRON_SECRET is not configured on the server' }
  }

  const token = request.headers.get('x-cron-secret')
  if (!token) return { ok: false, status: 401, error: 'Missing cron token' }

  const { timingSafeEqual } = await import('crypto')
  const secretBuf = Buffer.from(secret)
  const tokenBuf = Buffer.from(token)
  const valid = secretBuf.length === tokenBuf.length && timingSafeEqual(secretBuf, tokenBuf)

  return valid ? { ok: true, status: 200 } : { ok: false, status: 401, error: 'Invalid cron token' }
}

export async function POST(request: NextRequest) {
  if (!isTodoTwoEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const auth = await isAuthorized(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const db = getPrivilegedClientForCronOnly()
  const from = farmToday()
  const to = addFarmDays(from, HORIZON_DAYS)

  const [{ data: peopleRows, error: peopleError }, { data: taskRows, error: taskError }] =
    await Promise.all([
      db
        .from('people')
        .select('id, full_name, preferred_name')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('full_name'),
      db
        .from('tasks_resolved')
        .select('id, title, due_date, status, series_id, project_id, required_skill_id')
        .is('parent_task_id', null)
        .gte('due_date', from)
        .lte('due_date', to)
        .in('status', ['unassigned', 'draft']),
    ])

  if (peopleError || taskError) {
    return NextResponse.json(
      { error: `Could not load: ${peopleError?.message ?? taskError?.message}` },
      { status: 500 }
    )
  }

  const people = ((peopleRows ?? []) as { id: string; full_name: string; preferred_name: string | null }[]).map(
    (p) => ({ id: p.id, name: p.preferred_name || p.full_name })
  )

  const rows = (taskRows ?? []) as {
    id: string
    title: string | null
    due_date: string | null
    series_id: string | null
    required_skill_id: string | null
  }[]

  // A task with no date cannot be placed in a day, and the whole point here is
  // "which day is covered".
  const dated = rows.filter((r): r is typeof r & { due_date: string } => r.due_date !== null)

  if (people.length === 0 || dated.length === 0) {
    return NextResponse.json({
      ok: true,
      window: { from, to },
      candidates: dated.length,
      assigned: 0,
      note: people.length === 0 ? 'Nobody active to assign to.' : 'Nothing spare in the window.',
    })
  }

  const { data: seriesRows } = await db.from('task_series').select('id, title')
  const seriesTitle = new Map(((seriesRows ?? []) as { id: string; title: string }[]).map((s) => [s.id, s.title]))

  const tasks: AssignableTask[] = dated.map((r) => ({
    id: r.id,
    date: r.due_date,
    weekday: weekdayOfDate(r.due_date) as Weekday,
    title: r.title ?? 'Untitled',
    groupLabel: r.series_id ? seriesTitle.get(r.series_id) ?? null : null,
  }))

  // The same farm facts the preview screen applies, so an automatic round
  // cannot hand work to somebody who is away or not signed off for it.
  const [{ data: timeOffRows }, { data: stayRows }, { data: skillRows }, { data: skillNameRows }] =
    await Promise.all([
      db
        .from('time_off_requests')
        .select('id, person_id, start_date, end_date, kind, status')
        .eq('status', 'approved')
        .lte('start_date', to)
        .gte('end_date', from),
      db
        .from('stays')
        .select('id, person_id, arrival_date, arrival_certainty, departure_date, departure_certainty, status')
        .lte('arrival_date', to),
      db.from('person_skills').select('person_id, skill_id, authorized_unsupervised'),
      db.from('skills').select('id, name'),
    ])

  const skillName = new Map(((skillNameRows ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name]))
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? 'Someone'

  const farm = farmConstraints({
    window: { from, to },
    peopleIds: people.map((p) => p.id),
    nameOf,
    timeOff: ((timeOffRows ?? []) as Record<string, string>[]).map((r) => ({
      id: r.id,
      personId: r.person_id,
      startDate: r.start_date,
      endDate: r.end_date,
      kind: r.kind,
    })) as ApprovedTimeOff[],
    stays: ((stayRows ?? []) as Record<string, string | null>[]).map((r) => ({
      id: r.id as string,
      personId: r.person_id as string,
      arrivalDate: r.arrival_date as string,
      arrivalCertainty: r.arrival_certainty as StayWindow['arrivalCertainty'],
      departureDate: r.departure_date,
      departureCertainty: r.departure_certainty as StayWindow['departureCertainty'],
      status: r.status as string,
    })),
    skillRequirements: dated
      .filter((r) => r.required_skill_id !== null)
      .map((r) => ({
        taskId: r.id,
        title: r.title ?? 'Untitled',
        date: r.due_date,
        skillId: r.required_skill_id as string,
        skillName: skillName.get(r.required_skill_id as string) ?? null,
      })),
    skillAuthorizations: ((skillRows ?? []) as Record<string, string | boolean>[]).map((r) => ({
      personId: r.person_id as string,
      skillId: r.skill_id as string,
      authorizedUnsupervised: Boolean(r.authorized_unsupervised),
    })),
  })

  const plan = buildAssignmentPlan(tasks, people, [
    ...farm.sourced.map((s) => s.constraint),
    ...farmRuleConstraints(),
  ])

  let assigned = 0
  const failures: { taskId: string; message: string }[] = []

  for (const assignment of plan.assignments) {
    const { error } = await db.rpc('assign_task', {
      p_task_id: assignment.taskId,
      p_person_id: assignment.personId,
    })

    if (error) failures.push({ taskId: assignment.taskId, message: error.message })
    else assigned += 1
  }

  return NextResponse.json({
    ok: true,
    window: { from, to },
    candidates: tasks.length,
    assigned,
    // Reported, not hidden: a day the rules cannot cover is something a
    // coordinator needs to see, and it also lands in the evening digest.
    unassignable: plan.unassignable.length,
    unassignableReasons: plan.unassignable.slice(0, 10).map((u) => `${u.date} ${u.title}: ${u.reason}`),
    failures,
  })
}
