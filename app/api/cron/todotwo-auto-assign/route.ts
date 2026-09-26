import { NextRequest, NextResponse } from 'next/server'

// PRIVILEGED. Runs from GitHub Actions cron with no user session — see
// app/api/cron/todotwo-notifications for the rationale.
import { getPrivilegedClientForCronOnly } from '@/lib/todotwo/db-privileged'
import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import {
  buildAssignmentPlan,
  type AssignableTask,
  type RotationHistory,
  type Weekday,
} from '@/lib/todotwo/domain/assignment'
import { rulesToConstraints, type AssignmentRule } from '@/lib/todotwo/domain/assignment-rules'
import { farmConstraints, type ApprovedTimeOff, type StayWindow } from '@/lib/todotwo/domain/assignment-inputs'
import { addFarmDays, farmDaysBetween, farmToday } from '@/lib/todotwo/time'
import {
  assignmentsToRelease,
  awayDatesByPerson,
  dayOffSchedule,
  isWeeklyDaysOffPair,
  rotaParticipants,
  type DayOffEntry,
  type HeldAssignment,
} from '@/lib/todotwo/domain/days-off'
import { weekdayOfDate } from '@/lib/todotwo/domain/recurrence'
import { enqueueRelevantNotifications } from '@/lib/todotwo/notifications/enqueue-relevant'
import { dispatchOutbox } from '@/lib/todotwo/notifications/dispatch'

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
 *   * The farm's standing arrangement applies, read from
 *     todotwo.assignment_rules — whatever is switched on in Routines at the
 *     time. Rules are data, not code, so turning one off for a week is a
 *     toggle rather than a deploy.
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

/** How far back to look for who last did a job. */
const ROTATION_LOOKBACK_DAYS = 60

/**
 * Recent turns per job, most recent first.
 *
 * Keyed the same way the solver rotates: a bundled round under its bundle
 * name, everything else under its group label. The solver appends as it
 * assigns, so a week planned in one go rotates like a week planned daily.
 */
async function loadRotationHistory(
  db: ReturnType<typeof getPrivilegedClientForCronOnly>,
  today: string,
  through: string,
  seriesTitle: Map<string, string>
): Promise<RotationHistory> {
  const since = addFarmDays(today, -ROTATION_LOOKBACK_DAYS)

  const { data } = await db
    .from('tasks')
    .select('id, title, series_id, due_date, task_assignments(person_id, unassigned_at)')
    .gte('due_date', since)
    // Include assignments already committed inside the planning window. The
    // cron normally fills one new day at the far edge; ignoring Wednesday
    // while choosing Friday made the same person look available again.
    .lte('due_date', through)
    .order('due_date', { ascending: false })

  const history: RotationHistory = {}

  for (const row of (data ?? []) as {
    title: string | null
    series_id: string | null
    task_assignments: { person_id: string; unassigned_at: string | null }[] | null
  }[]) {
    const key = (row.series_id ? seriesTitle.get(row.series_id) : null) ?? row.title
    if (!key) continue

    for (const a of row.task_assignments ?? []) {
      // Somebody who was unassigned did not take that turn.
      if (a.unassigned_at !== null) continue
      const seq = history[key] ?? []
      if (!seq.includes(a.person_id)) history[key] = [...seq, a.person_id]
    }
  }

  return history
}

/**
 * Takes back open work held by each date's off person, from tomorrow on.
 *
 * Never today: a day already under way is not re-planned by a robot at four
 * in the morning. Releasing the morning round and hoping somebody claims it
 * is how animals go unfed. Selection lives in assignmentsToRelease (pure,
 * unit-tested); this only reads the rows and writes the result.
 *
 * Returns the ids of tasks that went back to 'unassigned'. A task someone
 * else still holds keeps its status and is not re-placed.
 */
async function releaseDaysOffWork(
  db: ReturnType<typeof getPrivilegedClientForCronOnly>,
  daysOff: DayOffEntry[],
  today: string,
  through: string
): Promise<string[]> {
  const offPeople = Array.from(new Set(daysOff.flatMap((day) => (day.off && day.date > today ? [day.off.id] : []))))
  if (offPeople.length === 0) return []

  // Cheap: open tasks in the few days of the horizon, then only the off
  // people's live assignee rows on those tasks.
  const { data: taskRows } = await db
    .from('tasks')
    .select('id, due_date, status')
    .is('deleted_at', null)
    .gt('due_date', today)
    .lte('due_date', through)
    .not('status', 'in', '(completed,verified,cancelled)')
  const tasks = new Map(((taskRows ?? []) as { id: string; due_date: string; status: string }[]).map((t) => [t.id, t]))
  if (tasks.size === 0) return []

  const { data: rows } = await db
    .from('task_assignments')
    .select('id, task_id, person_id, assigned_by_person_id, role, unassigned_at')
    .in('task_id', Array.from(tasks.keys()))
    .in('person_id', offPeople)
    .is('unassigned_at', null)
    .eq('role', 'assignee')

  const held: HeldAssignment[] = ((rows ?? []) as {
    id: string; task_id: string; person_id: string; assigned_by_person_id: string | null; role: string; unassigned_at: string | null
  }[]).map((row) => ({
    assignmentId: row.id,
    taskId: row.task_id,
    personId: row.person_id,
    assignedByPersonId: row.assigned_by_person_id,
    role: row.role,
    unassignedAt: row.unassigned_at,
    dueDate: tasks.get(row.task_id)!.due_date,
    taskStatus: tasks.get(row.task_id)!.status,
  }))

  const releasedTaskIds: string[] = []
  for (const row of assignmentsToRelease(held, daysOff, today)) {
    const { error } = await db
      .from('task_assignments')
      .update({ unassigned_at: new Date().toISOString() })
      .eq('id', row.assignmentId)
      .is('unassigned_at', null)
    if (error) continue

    // Only back to the pool if nobody else is still on it: a pair job keeps
    // its other holder, and its status with them.
    const { count } = await db
      .from('task_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', row.taskId)
      .eq('role', 'assignee')
      .is('unassigned_at', null)
    if ((count ?? 0) > 0) continue

    await db.from('tasks').update({ status: 'unassigned' }).eq('id', row.taskId).eq('status', 'assigned')
    releasedTaskIds.push(row.taskId)
  }
  return releasedTaskIds
}

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

  // Everything that decides who is off comes first, because who is off
  // decides which already-assigned work has to be handed back before the
  // unassigned pool is read.
  const [
    { data: peopleRows, error: peopleError },
    { data: timeOffRows },
    { data: stayRows },
    { data: ruleRows },
  ] = await Promise.all([
    db
      .from('people')
      .select('id, full_name, preferred_name, farm_start_date')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('full_name'),
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
    // Whatever the farm currently has switched on. Turning a rule off in
    // Routines takes effect on the next run without a deploy.
    db
      .from('assignment_rules')
      .select('id, label, kind, payload, enabled, sort_order, source_text')
      .eq('enabled', true)
      .order('sort_order'),
  ])

  if (peopleError) {
    return NextResponse.json({ error: `Could not load: ${peopleError.message}` }, { status: 500 })
  }

  const peopleRowsTyped = (peopleRows ?? []) as { id: string; full_name: string; preferred_name: string | null; farm_start_date: string | null }[]
  const people = peopleRowsTyped.map(
    (p) => ({ id: p.id, name: p.preferred_name || p.full_name })
  )

  const farmTimeOff = ((timeOffRows ?? []) as Record<string, string>[]).map((r) => ({
    id: r.id,
    personId: r.person_id,
    startDate: r.start_date,
    endDate: r.end_date,
    kind: r.kind,
  })) as ApprovedTimeOff[]
  const farmStays: StayWindow[] = ((stayRows ?? []) as Record<string, string | null>[]).map((r) => ({
    id: r.id as string,
    personId: r.person_id as string,
    arrivalDate: r.arrival_date as string,
    arrivalCertainty: r.arrival_certainty as StayWindow['arrivalCertainty'],
    departureDate: r.departure_date,
    departureCertainty: r.departure_certainty as StayWindow['departureCertainty'],
    status: r.status as string,
  }))

  // Days off by headcount: one person off on any date where five or more can
  // work, nobody off otherwise. Same inputs as the Upcoming panel, so the day
  // a person was shown as theirs is the day the rota leaves empty. A
  // seven-day weekday rule means "not on the rota at all" (e.g. the owner).
  const nonparticipants = new Set(((ruleRows ?? []) as AssignmentRule[]).flatMap((rule) => {
    const weekdays = Array.isArray(rule.payload.weekdays) ? rule.payload.weekdays : []
    return rule.kind === 'unavailable_weekday' && typeof rule.payload.personId === 'string' && weekdays.length === 7
      ? [rule.payload.personId]
      : []
  }))
  const windowDays = farmDaysBetween(from, to) + 1
  const away = awayDatesByPerson(farmTimeOff, farmStays, { from, to }, people.map((p) => p.id))
  const rota = rotaParticipants(
    peopleRowsTyped.map((person) => ({
      id: person.id,
      name: person.preferred_name || person.full_name,
      farmStartDate: person.farm_start_date,
      nonparticipant: nonparticipants.has(person.id),
      awayDates: away.get(person.id) ?? [],
    })),
    from,
    windowDays
  )
  const daysOff = dayOffSchedule(rota, from, windowDays)
  const daysOffConstraints = daysOff.flatMap((day) =>
    day.off ? [{ kind: 'unavailable_dates' as const, personId: day.off.id, dates: [day.date] }] : [])
  const unavailableOn = new Map(rota.map((person) => [person.id, new Set(person.unavailableDates)]))

  // Hand back work assigned before the day off was known. Released tasks go
  // back to 'unassigned' and are read with the rest of the pool just below,
  // so the solver re-places them in this same run; only what it cannot place
  // is left up for grabs. Idempotent: a second run finds nothing to release.
  const releasedTaskIds = await releaseDaysOffWork(db, daysOff, from, to)

  const { data: taskRows, error: taskError } = await db
    .from('tasks_resolved')
    .select('id, title, due_date, status, series_id, project_id, required_skill_id')
    .is('parent_task_id', null)
    .gte('due_date', from)
    .lte('due_date', to)
    .in('status', ['unassigned', 'draft'])

  if (taskError) {
    return NextResponse.json({ error: `Could not load: ${taskError.message}` }, { status: 500 })
  }

  const rows = (taskRows ?? []) as {
    id: string
    title: string | null
    due_date: string | null
    series_id: string | null
    required_skill_id: string | null
  }[]

  // A task with no date cannot be placed in a day, and the whole point here is
  // "which day is covered".
  const seriesIds = Array.from(new Set(rows.flatMap((row) => row.series_id ? [row.series_id] : [])))
  const { data: cadenceRows } = seriesIds.length
    ? await db.from('task_series').select('id, rrule').in('id', seriesIds)
    : { data: [] }
  const weeklySeries = new Set(((cadenceRows ?? []) as { id: string; rrule: string }[])
    .filter((series) => /(?:^|;)FREQ=WEEKLY(?:;|$)/i.test(series.rrule.replace(/^RRULE:/i, '')))
    .map((series) => series.id))

  // Weekly routines are a shared 10:00 pool. The automatic rota only covers
  // daily work and one-off tasks; it must never pre-assign these occurrences.
  const dated = rows.filter((r): r is typeof r & { due_date: string } =>
    r.due_date !== null && (!r.series_id || !weeklySeries.has(r.series_id)))

  if (people.length === 0 || dated.length === 0) {
    return NextResponse.json({
      ok: true,
      window: { from, to },
      candidates: dated.length,
      assigned: 0,
      released: releasedTaskIds.length,
      reassigned: 0,
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
  const [{ data: skillRows }, { data: skillNameRows }] = await Promise.all([
    db.from('person_skills').select('person_id, skill_id, authorized_unsupervised'),
    db.from('skills').select('id, name'),
  ])

  const skillName = new Map(((skillNameRows ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name]))
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? 'Someone'

  const farm = farmConstraints({
    window: { from, to },
    peopleIds: people.map((p) => p.id),
    nameOf,
    timeOff: farmTimeOff,
    stays: farmStays,
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

  const resolvedRules = rulesToConstraints(
    (ruleRows ?? []) as AssignmentRule[],
    tasks.map((t) => ({ id: t.id, title: t.title, groupLabel: t.groupLabel }))
  )
  // The old fixed weekly pairs are replaced by the headcount rotation below.
  // Honouring both would give people two sets of days off and leave the farm
  // short on exactly the days the rotation was built to protect.
  const resolved = {
    ...resolvedRules,
    constraints: resolvedRules.constraints.filter((constraint) =>
      !(constraint.kind === 'unavailable_weekday' && isWeeklyDaysOffPair(constraint.weekdays))),
  }


  // Let the ceiling follow the actual workload: average tasks per active
  // person, rounded down, plus one. Thus 17 jobs among 8 people caps everyone
  // at 3, while a quieter day tightens automatically instead of keeping an
  // arbitrary farm-wide number forever.
  const bundleRules = resolved.constraints.filter(
    (constraint): constraint is Extract<typeof constraint, { kind: 'same_person' }> => constraint.kind === 'same_person'
  )
  const participatingPeople = people.filter((person) => {
    const unavailableEveryDay = resolved.constraints.some((constraint) =>
      constraint.kind === 'unavailable_weekday' &&
      constraint.personId === person.id &&
      constraint.weekdays.length === 7)
    if (unavailableEveryDay) return false
    const excludedTaskIds = new Set(
      resolved.constraints
        .filter((constraint): constraint is Extract<typeof constraint, { kind: 'exclude_tasks' }> =>
          constraint.kind === 'exclude_tasks' && constraint.personId === person.id)
        .flatMap((constraint) => constraint.taskIds)
    )
    return tasks.some((task) => !excludedTaskIds.has(task.id))
  })
  // Per date, only the people actually working that day share the load: the
  // one off, anyone away and anyone still on the ramp are not capacity. A
  // farm-wide divisor would cap six people's worth of work at a level five
  // cannot cover once somebody is off.
  const workingOn = (date: string) => participatingPeople.filter((person) =>
    !unavailableOn.get(person.id)?.has(date) && !daysOff.some((day) => day.date === date && day.off?.id === person.id)).length
  const unitsByDate = new Map<string, Set<string>>()
  for (const task of tasks) {
    const bundleIndex = bundleRules.findIndex((rule) => rule.labels.some((label) => {
      const needle = label.trim().toLowerCase()
      return needle && ((task.groupLabel ?? '').toLowerCase().includes(needle) || task.title.toLowerCase().includes(needle))
    }))
    const units = unitsByDate.get(task.date) ?? new Set<string>()
    units.add(bundleIndex === -1 ? `task:${task.id}` : `bundle:${bundleIndex}`)
    unitsByDate.set(task.date, units)
  }
  const limitsByDate = Object.fromEntries(
    Array.from(unitsByDate, ([date, units]) => [date, Math.floor(units.size / Math.max(1, workingOn(date))) + 1])
  )
  const dynamicDailyLimit = Math.max(...Object.values(limitsByDate))

  // Who has done each job lately. Without this every run starts blank, and a
  // window containing one new day has every load at zero — so the alphabetical
  // tie-break decides and the same person cooks dinner indefinitely.
  const history = await loadRotationHistory(db, from, to, seriesTitle)

  const plan = buildAssignmentPlan(
    tasks,
    people,
    [
      ...farm.sourced.map((s) => s.constraint),
      // Onboarding ramp: rotaParticipants marks a newcomer's first five days.
      ...rota.flatMap((person) => person.unavailableDates.length
        ? [{ kind: 'unavailable_dates' as const, personId: person.id, dates: person.unavailableDates }]
        : []),
      ...daysOffConstraints,
      { kind: 'max_per_day', personId: null, limit: dynamicDailyLimit, limitsByDate },
      ...resolved.constraints,
    ],
    history
  )

  let assigned = 0
  let reassigned = 0
  const released = new Set(releasedTaskIds)
  const failures: { taskId: string; message: string }[] = []

  for (const assignment of plan.assignments) {
    const { error } = await db.rpc('assign_task', {
      p_task_id: assignment.taskId,
      p_person_id: assignment.personId,
    })

    if (error) failures.push({ taskId: assignment.taskId, message: error.message })
    else {
      assigned += 1
      if (released.has(assignment.taskId)) reassigned += 1
    }
  }

  // The far edge of the window has just become actionable. Create one summary
  // per person/day and deliver it now rather than waiting for a delayed
  // scheduler run and sending one push per generated task.
  const enqueued = await enqueueRelevantNotifications(db)
  const notifications = await dispatchOutbox(db)

  return NextResponse.json({
    ok: true,
    window: { from, to },
    candidates: tasks.length,
    assigned,
    // Handed back from somebody's day off, and how many of those found a new
    // holder. The difference is what was left up for grabs.
    released: releasedTaskIds.length,
    reassigned,
    // Reported, not hidden: a day the rules cannot cover is something a
    // coordinator needs to see, and it also lands in the evening digest.
    unassignable: plan.unassignable.length,
    unassignableReasons: plan.unassignable.slice(0, 10).map((u) => `${u.date} ${u.title}: ${u.reason}`),
    rulesApplied: resolved.constraints.length,
    dailyTaskLimits: limitsByDate,
    daysOff: daysOff.map((day) => ({ date: day.date, available: day.available, off: day.off?.name ?? null })),
    rotationTracked: Object.keys(history).length,
    // A rule that matched nothing today is usually a renamed routine rather
    // than an intention, so it is reported rather than silently ignored.
    rulesInert: resolved.inert.map((r) => `${r.label}: ${r.reason}`),
    failures,
    notifications: { queued: enqueued.queued, pushed: notifications.pushSent },
  })
}
