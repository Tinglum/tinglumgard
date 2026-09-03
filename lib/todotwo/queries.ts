import { getTodoTwoClient } from '@/lib/todotwo/db'
import { addFarmDays, farmToday, type FarmDate } from '@/lib/todotwo/time'

/**
 * Server-side reads for the task views.
 *
 * Everything goes through todotwo.tasks_resolved rather than todotwo.tasks, so
 * an occurrence with no title of its own shows the series text. Reading the
 * base table directly would show blanks for every generated routine.
 */

export interface TaskRow {
  id: string
  title: string
  description: string | null
  status: string
  priority: number
  due_date: string | null
  due_at: string | null
  all_day: boolean
  project_id: string | null
  section_id: string | null
  series_id: string | null
  parent_task_id: string | null
  estimated_minutes: number | null
  is_overridden: boolean
}

export interface TaskGroup {
  date: FarmDate
  tasks: TaskRow[]
}

const SELECT =
  'id, title, description, status, priority, due_date, due_at, all_day, project_id, section_id, series_id, parent_task_id, estimated_minutes, is_overridden'

const OPEN_STATUSES = ['draft', 'unassigned', 'assigned', 'accepted', 'in_progress', 'blocked', 'not_completed']

function sortTasks(tasks: TaskRow[]): TaskRow[] {
  return [...tasks].sort((a, b) => {
    // Timed work first, in clock order; then untimed, by priority.
    if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at)
    if (a.due_at) return -1
    if (b.due_at) return 1
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.title.localeCompare(b.title)
  })
}

/** Today's work, plus anything still open from before today. */
export async function getToday(today: FarmDate = farmToday()): Promise<{
  overdue: TaskRow[]
  today: TaskRow[]
  doneToday: TaskRow[]
}> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('tasks_resolved')
    .select(SELECT)
    .is('parent_task_id', null)
    .lte('due_date', today)

  if (error) throw new Error(`Could not load today: ${error.message}`)

  const rows = (data ?? []) as unknown as TaskRow[]

  return {
    overdue: sortTasks(
      rows.filter((t) => t.due_date && t.due_date < today && OPEN_STATUSES.includes(t.status))
    ),
    today: sortTasks(
      rows.filter((t) => t.due_date === today && OPEN_STATUSES.includes(t.status))
    ),
    doneToday: sortTasks(
      rows.filter((t) => t.due_date === today && !OPEN_STATUSES.includes(t.status))
    ),
  }
}

/** The next `days` days, one group per day, empty days included. */
export async function getUpcoming(
  days = 7,
  today: FarmDate = farmToday()
): Promise<TaskGroup[]> {
  const db = getTodoTwoClient()
  const from = addFarmDays(today, 1)
  const to = addFarmDays(today, days)

  const { data, error } = await db
    .from('tasks_resolved')
    .select(SELECT)
    .is('parent_task_id', null)
    .gte('due_date', from)
    .lte('due_date', to)
    .in('status', OPEN_STATUSES)

  if (error) throw new Error(`Could not load upcoming: ${error.message}`)

  const rows = (data ?? []) as unknown as TaskRow[]
  const groups: TaskGroup[] = []

  for (let offset = 1; offset <= days; offset += 1) {
    const date = addFarmDays(today, offset)
    groups.push({ date, tasks: sortTasks(rows.filter((t) => t.due_date === date)) })
  }

  return groups
}

export interface ProjectSummary {
  id: string
  name: string
  slug: string
  openCount: number
}

export async function getProjects(): Promise<ProjectSummary[]> {
  const db = getTodoTwoClient()

  const { data: projects, error } = await db
    .from('projects')
    .select('id, name, slug')
    .eq('is_archived', false)
    .order('name')

  if (error) throw new Error(`Could not load projects: ${error.message}`)

  const { data: counts } = await db
    .from('tasks_resolved')
    .select('project_id, status')
    .in('status', OPEN_STATUSES)

  const byProject = new Map<string, number>()
  for (const row of (counts ?? []) as { project_id: string | null }[]) {
    if (!row.project_id) continue
    byProject.set(row.project_id, (byProject.get(row.project_id) ?? 0) + 1)
  }

  return ((projects ?? []) as { id: string; name: string; slug: string }[]).map((p) => ({
    ...p,
    openCount: byProject.get(p.id) ?? 0,
  }))
}

export interface TaskStep {
  id: string
  title: string
  description: string | null
  done: boolean
  /** Series template step, versus a child task of a one-off. */
  kind: 'series-step' | 'subtask'
}

export interface TaskDetail {
  task: TaskRow
  steps: TaskStep[]
  seriesRule: string | null
  projectName: string | null
}

/**
 * One task with everything needed to work it.
 *
 * The steps come from two different places depending on what the task is: a
 * generated occurrence borrows its steps from the series template, while a
 * one-off owns its subtasks outright. Completion differs to match — a template
 * step is ticked per occurrence in task_step_completions, a subtask carries its
 * own status.
 */
export async function getTaskDetail(id: string): Promise<TaskDetail | null> {
  const db = getTodoTwoClient()

  const { data: taskRow, error } = await db
    .from('tasks_resolved')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Could not load task: ${error.message}`)
  if (!taskRow) return null

  const task = taskRow as unknown as TaskRow

  let projectName: string | null = null
  if (task.project_id) {
    const { data: project } = await db
      .from('projects')
      .select('name')
      .eq('id', task.project_id)
      .maybeSingle()
    projectName = (project?.name as string | undefined) ?? null
  }

  if (task.series_id) {
    const [{ data: stepRows }, { data: doneRows }, { data: series }] = await Promise.all([
      db
        .from('task_series_steps')
        .select('id, title, description')
        .eq('series_id', task.series_id)
        .is('deleted_at', null)
        .order('sort_order'),
      db.from('task_step_completions').select('series_step_id').eq('task_id', task.id),
      db.from('task_series').select('rrule').eq('id', task.series_id).maybeSingle(),
    ])

    const done = new Set(
      ((doneRows ?? []) as { series_step_id: string }[]).map((r) => r.series_step_id)
    )

    return {
      task,
      projectName,
      seriesRule: (series?.rrule as string | undefined) ?? null,
      steps: ((stepRows ?? []) as { id: string; title: string; description: string | null }[]).map(
        (s) => ({ ...s, done: done.has(s.id), kind: 'series-step' as const })
      ),
    }
  }

  const { data: children } = await db
    .from('tasks_resolved')
    .select('id, title, description, status')
    .eq('parent_task_id', task.id)
    .order('sort_order')

  return {
    task,
    projectName,
    seriesRule: null,
    steps: ((children ?? []) as { id: string; title: string; description: string | null; status: string }[]).map(
      (c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        done: c.status === 'completed' || c.status === 'verified',
        kind: 'subtask' as const,
      })
    ),
  }
}

export interface PersonRow {
  id: string
  full_name: string
  preferred_name: string | null
  email: string | null
  auth_user_id: string | null
  roles: string[]
}

/** Everyone currently on the farm, with their roles. */
export async function getPeople(): Promise<PersonRow[]> {
  const db = getTodoTwoClient()

  const { data: people, error } = await db
    .from('people')
    .select('id, full_name, preferred_name, email, auth_user_id')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('full_name')

  if (error) throw new Error(`Could not load people: ${error.message}`)

  const { data: roleRows } = await db
    .from('role_assignments')
    .select('person_id, role')
    .is('revoked_at', null)

  const byPerson = new Map<string, string[]>()
  for (const row of (roleRows ?? []) as { person_id: string; role: string }[]) {
    const list = byPerson.get(row.person_id)
    if (list) list.push(row.role)
    else byPerson.set(row.person_id, [row.role])
  }

  return ((people ?? []) as unknown as Omit<PersonRow, 'roles'>[]).map((person) => ({
    ...person,
    roles: byPerson.get(person.id) ?? [],
  }))
}

export interface SeriesRow {
  id: string
  title: string
  description: string | null
  rrule: string
  project_id: string | null
  stepCount: number
  upcomingCount: number
  rota: { id: string; name: string }[]
}

/** Every recurring routine, with its rota and how much is queued. */
export async function getSeries(): Promise<SeriesRow[]> {
  const db = getTodoTwoClient()

  const { data: rows, error } = await db
    .from('task_series')
    .select('id, title, description, rrule, project_id')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('title')

  if (error) throw new Error(`Could not load routines: ${error.message}`)

  const series = (rows ?? []) as unknown as Omit<
    SeriesRow,
    'stepCount' | 'upcomingCount' | 'rota'
  >[]

  const [{ data: steps }, { data: occurrences }, { data: rotaRows }, { data: people }] =
    await Promise.all([
      db.from('task_series_steps').select('series_id').is('deleted_at', null),
      db.from('tasks').select('series_id, status').not('series_id', 'is', null).is('deleted_at', null),
      db.from('series_rota').select('series_id, person_id, position').order('position'),
      db.from('people').select('id, full_name, preferred_name').is('deleted_at', null),
    ])

  const nameOf = new Map<string, string>()
  for (const p of (people ?? []) as { id: string; full_name: string; preferred_name: string | null }[]) {
    nameOf.set(p.id, p.preferred_name || p.full_name)
  }

  const stepCounts = new Map<string, number>()
  for (const s of (steps ?? []) as { series_id: string }[]) {
    stepCounts.set(s.series_id, (stepCounts.get(s.series_id) ?? 0) + 1)
  }

  const openCounts = new Map<string, number>()
  for (const t of (occurrences ?? []) as { series_id: string; status: string }[]) {
    if (['completed', 'verified', 'cancelled'].includes(t.status)) continue
    openCounts.set(t.series_id, (openCounts.get(t.series_id) ?? 0) + 1)
  }

  const rotas = new Map<string, { id: string; name: string }[]>()
  for (const r of (rotaRows ?? []) as { series_id: string; person_id: string }[]) {
    const entry = { id: r.person_id, name: nameOf.get(r.person_id) ?? 'Unknown' }
    const list = rotas.get(r.series_id)
    if (list) list.push(entry)
    else rotas.set(r.series_id, [entry])
  }

  return series.map((s) => ({
    ...s,
    stepCount: stepCounts.get(s.id) ?? 0,
    upcomingCount: openCounts.get(s.id) ?? 0,
    rota: rotas.get(s.id) ?? [],
  }))
}

export interface StayRow {
  id: string
  person_id: string
  full_name: string
  preferred_name: string | null
  arrival_date: string
  arrival_certainty: string
  departure_date: string | null
  departure_certainty: string | null
  status: string
}

/**
 * Current stays plus arrivals in the next `days` days, each with the person's
 * name attached. Used by the stays overview and by the add-stay picker.
 */
export async function getStays(days = 30): Promise<{ current: StayRow[]; upcoming: StayRow[] }> {
  const db = getTodoTwoClient()

  const { data: stays, error } = await db
    .from('stays')
    .select(
      'id, person_id, arrival_date, arrival_certainty, departure_date, departure_certainty, status'
    )
    .in('status', ['current', 'upcoming'])
    .order('arrival_date')

  if (error) throw new Error(`Could not load stays: ${error.message}`)

  const rows = (stays ?? []) as unknown as Omit<StayRow, 'full_name' | 'preferred_name'>[]
  if (rows.length === 0) return { current: [], upcoming: [] }

  const personIds = Array.from(new Set(rows.map((r) => r.person_id)))
  const { data: people } = await db
    .from('people')
    .select('id, full_name, preferred_name')
    .in('id', personIds)

  const nameOf = new Map<string, { full_name: string; preferred_name: string | null }>()
  for (const p of (people ?? []) as { id: string; full_name: string; preferred_name: string | null }[]) {
    nameOf.set(p.id, p)
  }

  const withNames: StayRow[] = rows.map((r) => ({
    ...r,
    full_name: nameOf.get(r.person_id)?.full_name ?? 'Unknown',
    preferred_name: nameOf.get(r.person_id)?.preferred_name ?? null,
  }))

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)
  const cutoffDate = cutoff.toISOString().slice(0, 10)

  return {
    current: withNames.filter((s) => s.status === 'current'),
    upcoming: withNames.filter((s) => s.status === 'upcoming' && s.arrival_date <= cutoffDate),
  }
}

export interface AccommodationRow {
  id: string
  name: string
  kind: string
  capacity: number
  location_id: string | null
}

/** Every active accommodation unit, for pickers and the occupancy page. */
export async function getAccommodations(): Promise<AccommodationRow[]> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('accommodations')
    .select('id, name, kind, capacity, location_id')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error(`Could not load accommodations: ${error.message}`)

  return (data ?? []) as unknown as AccommodationRow[]
}

export interface OccupancyRow {
  assignment_id: string
  accommodation_id: string
  accommodation_name: string
  accommodation_kind: string
  location_id: string | null
  stay_id: string
  stay_status: string
  person_id: string
  full_name: string
  preferred_name: string | null
  start_date: string
  end_date: string | null
  arrival_date: string
  arrival_certainty: string
  departure_date: string | null
  departure_certainty: string | null
}

/**
 * Who is where, right now and coming up, from `todotwo.occupancy_resolved`.
 * That view already carries the person and accommodation names and filters to
 * current/upcoming stays, so this is a straight read.
 */
export async function getOccupancy(): Promise<OccupancyRow[]> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('occupancy_resolved')
    .select(
      'assignment_id, accommodation_id, accommodation_name, accommodation_kind, location_id, stay_id, stay_status, person_id, full_name, preferred_name, start_date, end_date, arrival_date, arrival_certainty, departure_date, departure_certainty'
    )
    .order('start_date')

  if (error) throw new Error(`Could not load occupancy: ${error.message}`)

  return (data ?? []) as unknown as OccupancyRow[]
}

/** One accommodation's existing bookings, for the double-booking pre-check. */
export async function getAssignmentsForAccommodation(
  accommodationId: string
): Promise<{ id: string; start_date: string; end_date: string | null }[]> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('accommodation_assignments')
    .select('id, start_date, end_date')
    .eq('accommodation_id', accommodationId)
    .order('start_date')

  if (error) throw new Error(`Could not load assignments: ${error.message}`)

  return (data ?? []) as unknown as { id: string; start_date: string; end_date: string | null }[]
}

// ---------------------------------------------------------------------------
// Phase 4 — availability, time off & skills
// ---------------------------------------------------------------------------

export interface TimeOffRequestRow {
  id: string
  person_id: string
  full_name: string
  preferred_name: string | null
  start_date: FarmDate
  end_date: FarmDate
  kind: string
  reason: string | null
  status: string
  requested_at: string
  decided_by_person_id: string | null
  decided_at: string | null
  decision_note: string | null
}

const TIME_OFF_SELECT =
  'id, person_id, start_date, end_date, kind, reason, status, requested_at, decided_by_person_id, decided_at, decision_note, people:person_id (full_name, preferred_name)'

interface TimeOffJoinRow {
  id: string
  person_id: string
  start_date: string
  end_date: string
  kind: string
  reason: string | null
  status: string
  requested_at: string
  decided_by_person_id: string | null
  decided_at: string | null
  decision_note: string | null
  people:
    | { full_name: string; preferred_name: string | null }
    | { full_name: string; preferred_name: string | null }[]
    | null
}

function flattenTimeOff(row: TimeOffJoinRow): TimeOffRequestRow {
  const person = Array.isArray(row.people) ? row.people[0] : row.people
  return {
    id: row.id,
    person_id: row.person_id,
    full_name: person?.full_name ?? 'Unknown',
    preferred_name: person?.preferred_name ?? null,
    start_date: row.start_date,
    end_date: row.end_date,
    kind: row.kind,
    reason: row.reason,
    status: row.status,
    requested_at: row.requested_at,
    decided_by_person_id: row.decided_by_person_id,
    decided_at: row.decided_at,
    decision_note: row.decision_note,
  }
}

/**
 * A single person's own time-off requests, most recent first. RLS limits this
 * to the caller's own rows unless they hold a staff role.
 */
export async function getTimeOffRequestsForPerson(personId: string): Promise<TimeOffRequestRow[]> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('time_off_requests')
    .select(TIME_OFF_SELECT)
    .eq('person_id', personId)
    .order('requested_at', { ascending: false })

  if (error) throw new Error(`Could not load time-off requests: ${error.message}`)

  return ((data ?? []) as unknown as TimeOffJoinRow[]).map(flattenTimeOff)
}

/** Every pending time-off request, oldest first. Staff-only via RLS. */
export async function getPendingTimeOffRequests(): Promise<TimeOffRequestRow[]> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('time_off_requests')
    .select(TIME_OFF_SELECT)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  if (error) throw new Error(`Could not load pending time-off requests: ${error.message}`)

  return ((data ?? []) as unknown as TimeOffJoinRow[]).map(flattenTimeOff)
}

export interface UnavailabilityRow {
  id: string
  start_date: FarmDate
  end_date: FarmDate
  kind: string
}

/**
 * Integration point for the assignment engine (owned separately — see
 * docs/todotwo/AVAILABILITY.md for the contract). Returns every APPROVED
 * time-off row for one person whose date range overlaps [from, to],
 * inclusive. An approved row here is a HARD CONSTRAINT: the person must not be
 * assigned any task whose date falls within [start_date, end_date] of a
 * returned row.
 *
 * Uses the same `todotwo` RLS client as everything else in this file — the
 * assignment engine runs as a signed-in staff member (coordinator/admin), who
 * can see every person's approved time off under RLS, never the service-role
 * client (R2 forbids that in a request path).
 */
export async function getApprovedUnavailability(
  personId: string,
  range: { from: FarmDate; to: FarmDate }
): Promise<UnavailabilityRow[]> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('time_off_requests')
    .select('id, start_date, end_date, kind')
    .eq('person_id', personId)
    .eq('status', 'approved')
    .lte('start_date', range.to)
    .gte('end_date', range.from)
    .order('start_date', { ascending: true })

  if (error) throw new Error(`Could not load approved unavailability: ${error.message}`)

  return (data ?? []) as unknown as UnavailabilityRow[]
}

/**
 * Same integration point as getApprovedUnavailability, but for every person
 * at once, keyed by person_id. For a scheduler generating a whole day or week
 * rather than checking one person at a time.
 */
export async function getUnavailabilityForDateRange(range: {
  from: FarmDate
  to: FarmDate
}): Promise<Map<string, UnavailabilityRow[]>> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('time_off_requests')
    .select('id, person_id, start_date, end_date, kind')
    .eq('status', 'approved')
    .lte('start_date', range.to)
    .gte('end_date', range.from)
    .order('start_date', { ascending: true })

  if (error) throw new Error(`Could not load unavailability: ${error.message}`)

  const byPerson = new Map<string, UnavailabilityRow[]>()
  for (const row of (data ?? []) as unknown as (UnavailabilityRow & { person_id: string })[]) {
    const entry = { id: row.id, start_date: row.start_date, end_date: row.end_date, kind: row.kind }
    const list = byPerson.get(row.person_id)
    if (list) list.push(entry)
    else byPerson.set(row.person_id, [entry])
  }
  return byPerson
}

export interface SkillRow {
  id: string
  name: string
  slug: string
  description: string | null
  category: string
}

/** The skill catalogue, grouped by category in seed order. */
export async function getSkills(): Promise<SkillRow[]> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('skills')
    .select('id, name, slug, description, category')
    .is('deleted_at', null)
    .order('sort_order')

  if (error) throw new Error(`Could not load skills: ${error.message}`)

  return (data ?? []) as unknown as SkillRow[]
}

export interface PersonSkillRow {
  id: string
  person_id: string
  skill_id: string
  claimed_level: string | null
  admin_verified_level: string | null
  trainer_person_id: string | null
  trained_at: string | null
  expires_at: string | null
  notes: string | null
  authorized_unsupervised: boolean
}

const PERSON_SKILL_SELECT =
  'id, person_id, skill_id, claimed_level, admin_verified_level, trainer_person_id, trained_at, expires_at, notes, authorized_unsupervised'

/**
 * One person's skill claims and verifications. RLS limits this to the
 * caller's own rows unless they hold a staff role.
 */
export async function getPersonSkills(personId: string): Promise<PersonSkillRow[]> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('person_skills')
    .select(PERSON_SKILL_SELECT)
    .eq('person_id', personId)

  if (error) throw new Error(`Could not load person skills: ${error.message}`)

  return (data ?? []) as unknown as PersonSkillRow[]
}

/** Every person_skills row, for the staff verification view. Staff-only via RLS. */
export async function getAllPersonSkills(): Promise<PersonSkillRow[]> {
  const db = getTodoTwoClient()

  const { data, error } = await db.from('person_skills').select(PERSON_SKILL_SELECT)

  if (error) throw new Error(`Could not load all person skills: ${error.message}`)

  return (data ?? []) as unknown as PersonSkillRow[]
}


// ---------------------------------------------------------------------------
// Favorites — six built-in, computed views
//
// These are deliberately NOT rows in todotwo.saved_views. That table exists
// for future user-customizable views, but these six are fixed, apply to every
// person with zero setup, and need no per-person seeding or migration when a
// new person joins. Computing them here also means a definition change is a
// code change, not a data migration across everyone's saved_views rows.
// ---------------------------------------------------------------------------

export type FavoriteViewKey =
  | 'overdue'
  | 'assigned-today'
  | 'assigned-tomorrow'
  | 'unassigned-next-7'
  | 'assigned-next-7'
  | 'farm-wide'

export interface FavoriteView {
  key: FavoriteViewKey
  label: string
  count: number
}

async function taskIdsAssignedTo(db: ReturnType<typeof getTodoTwoClient>, personId: string): Promise<Set<string>> {
  const { data, error } = await db
    .from('task_assignments')
    .select('task_id')
    .eq('person_id', personId)
    .is('unassigned_at', null)

  if (error) throw new Error(`Could not load assignments: ${error.message}`)
  return new Set(((data ?? []) as { task_id: string }[]).map((r) => r.task_id))
}

/**
 * The six built-in Favorites views for the signed-in person. `isStaff` gates
 * the one farm-wide view — matching how the rest of the app reserves
 * everyone's-work visibility to staff (see getAllPersonSkills above, and the
 * people/routines pages) — the other five are personal and available to
 * anyone signed in.
 */
export async function getFavoriteViews(
  personId: string,
  isStaff: boolean,
  today: FarmDate = farmToday()
): Promise<FavoriteView[]> {
  const db = getTodoTwoClient()
  const in7 = addFarmDays(today, 7)
  const tomorrow = addFarmDays(today, 1)

  const { data, error } = await db
    .from('tasks_resolved')
    .select(SELECT)
    .is('parent_task_id', null)
    .in('status', OPEN_STATUSES)

  if (error) throw new Error(`Could not load favorites: ${error.message}`)
  const rows = (data ?? []) as unknown as TaskRow[]

  const mine = await taskIdsAssignedTo(db, personId)

  const overdue = rows.filter((t) => t.due_date && t.due_date < today)
  const assignedToday = rows.filter((t) => t.due_date === today && mine.has(t.id))
  const assignedTomorrow = rows.filter((t) => t.due_date === tomorrow && mine.has(t.id))
  const next7 = rows.filter((t) => t.due_date && t.due_date > today && t.due_date <= in7)
  const unassignedNext7 = next7.filter((t) => t.status === 'unassigned')
  const assignedNext7 = next7.filter((t) => mine.has(t.id))

  const views: FavoriteView[] = [
    { key: 'overdue', label: 'Overdue Tasks', count: overdue.length },
    { key: 'assigned-today', label: 'Assigned tasks due today', count: assignedToday.length },
    { key: 'assigned-tomorrow', label: 'Assigned tasks due tomorrow', count: assignedTomorrow.length },
    { key: 'unassigned-next-7', label: 'Unassigned tasks due next 7 days', count: unassignedNext7.length },
    { key: 'assigned-next-7', label: 'Assigned tasks due next 7 days', count: assignedNext7.length },
  ]

  if (isStaff) {
    const farmWide = rows.filter((t) => t.status === 'assigned' || t.status === 'accepted' || t.status === 'in_progress')
    views.push({ key: 'farm-wide', label: "Tinglum Farm's assignments", count: farmWide.length })
  }

  return views
}

/** The task list for one Favorites view — backs /favorites/[key]. */
export async function getFavoriteViewTasks(
  key: FavoriteViewKey,
  personId: string,
  isStaff: boolean,
  today: FarmDate = farmToday()
): Promise<TaskRow[]> {
  const db = getTodoTwoClient()
  const in7 = addFarmDays(today, 7)
  const tomorrow = addFarmDays(today, 1)

  if (key === 'farm-wide' && !isStaff) {
    throw new Error('Only staff may view farm-wide assignments')
  }

  const { data, error } = await db
    .from('tasks_resolved')
    .select(SELECT)
    .is('parent_task_id', null)
    .in('status', OPEN_STATUSES)

  if (error) throw new Error(`Could not load favorites: ${error.message}`)
  const rows = (data ?? []) as unknown as TaskRow[]

  switch (key) {
    case 'overdue':
      return sortTasks(rows.filter((t) => t.due_date && t.due_date < today))
    case 'assigned-today': {
      const mine = await taskIdsAssignedTo(db, personId)
      return sortTasks(rows.filter((t) => t.due_date === today && mine.has(t.id)))
    }
    case 'assigned-tomorrow': {
      const mine = await taskIdsAssignedTo(db, personId)
      return sortTasks(rows.filter((t) => t.due_date === tomorrow && mine.has(t.id)))
    }
    case 'unassigned-next-7':
      return sortTasks(
        rows.filter((t) => t.due_date && t.due_date > today && t.due_date <= in7 && t.status === 'unassigned')
      )
    case 'assigned-next-7': {
      const mine = await taskIdsAssignedTo(db, personId)
      return sortTasks(
        rows.filter((t) => t.due_date && t.due_date > today && t.due_date <= in7 && mine.has(t.id))
      )
    }
    case 'farm-wide':
      return sortTasks(rows.filter((t) => t.status === 'assigned' || t.status === 'accepted' || t.status === 'in_progress'))
    default:
      return []
  }
}

// ---------------------------------------------------------------------------
// Task handoff requests
// ---------------------------------------------------------------------------

export interface HandoffRequestRow {
  id: string
  task_id: string
  task_title: string
  to_person_id: string
  to_full_name: string
  to_preferred_name: string | null
  requested_at: string
}

/** Pending handoff requests where this person is the current holder — theirs to decide. */
export async function getPendingHandoffRequestsFor(personId: string): Promise<HandoffRequestRow[]> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('task_handoff_requests')
    .select('id, task_id, to_person_id, requested_at')
    .eq('from_person_id', personId)
    .eq('status', 'pending')
    .order('requested_at')

  if (error) throw new Error(`Could not load handoff requests: ${error.message}`)
  const rows = (data ?? []) as { id: string; task_id: string; to_person_id: string; requested_at: string }[]
  if (rows.length === 0) return []

  const taskIds = Array.from(new Set(rows.map((r) => r.task_id)))
  const toPersonIds = Array.from(new Set(rows.map((r) => r.to_person_id)))

  const [{ data: tasks }, { data: people }] = await Promise.all([
    db.from('tasks_resolved').select('id, title').in('id', taskIds),
    db.from('people').select('id, full_name, preferred_name').in('id', toPersonIds),
  ])

  const titleOf = new Map(((tasks ?? []) as { id: string; title: string }[]).map((t) => [t.id, t.title]))
  const personOf = new Map(
    ((people ?? []) as { id: string; full_name: string; preferred_name: string | null }[]).map((p) => [p.id, p])
  )

  return rows.map((r) => ({
    id: r.id,
    task_id: r.task_id,
    task_title: titleOf.get(r.task_id) ?? 'Untitled task',
    to_person_id: r.to_person_id,
    to_full_name: personOf.get(r.to_person_id)?.full_name ?? 'Someone',
    to_preferred_name: personOf.get(r.to_person_id)?.preferred_name ?? null,
    requested_at: r.requested_at,
  }))
}
