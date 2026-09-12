import { getTodoTwoClient } from '@/lib/todotwo/db'
import { FARM_TZ, farmToday, type FarmDate } from '@/lib/todotwo/time'

/**
 * The jobs nobody picked up, asked about late in the evening.
 *
 * Up for grabs works until nobody grabs anything, and then it fails silently:
 * the list sits there all day, everybody assumes somebody else has it, and
 * nothing in the app ever notices. This is the noticing.
 *
 * Late on purpose. Ask at four in the afternoon and the honest answer is "I
 * might, later", which is exactly the non-answer that leaves the pigs unfed.
 * By eleven there is no later, so the question has a real answer.
 */

export const NUDGE_FROM_HOUR = 23

/**
 * When the evening check starts. The evening rounds fall due at 18:00, so by
 * half past, whoever had them either did them or did not — and until somebody
 * says which, the app cannot tell a job that was finished and never ticked
 * from one that has been forgotten.
 */
export const OVERDUE_FROM_MINUTES = 18 * 60 + 30

export interface NudgeTask {
  id: string
  title: string
  dueDate: string | null
}

/**
 * Minutes past midnight, on the farm.
 *
 * Read through Europe/Oslo rather than off the server clock, which is UTC on
 * Netlify. Getting this wrong would not fail loudly — it would just ask people
 * at 20:30 in summer and 19:30 in winter, drifting with the clock change.
 */
export function farmMinutes(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: FARM_TZ,
  }).format(now)
  const [hour, minute] = parts.split(':').map(Number)
  return hour * 60 + minute
}

/** The farm-local hour right now, without dragging a date library in. */
export function farmHour(now: Date = new Date()): number {
  return Math.floor(farmMinutes(now) / 60)
}

const OPEN_STATUSES = ['draft', 'unassigned', 'assigned', 'accepted', 'in_progress']

/**
 * What this person should be asked about right now. Empty before the hour, and
 * empty once they have answered — including when they answered "somebody else
 * has it", which silences them alone.
 */
export async function getEndOfDayNudge(
  personId: string,
  now: Date = new Date(),
  today: FarmDate = farmToday(now)
): Promise<NudgeTask[]> {
  if (farmHour(now) < NUDGE_FROM_HOUR) return []

  const db = getTodoTwoClient()

  const { data: rows, error } = await db
    .from('tasks_resolved')
    .select('id, title, due_date')
    .is('parent_task_id', null)
    .eq('due_date', today)
    .in('status', OPEN_STATUSES)

  if (error) throw new Error(`Could not load the evening check: ${error.message}`)

  const candidates = (rows ?? []) as { id: string; title: string | null; due_date: string | null }[]
  if (candidates.length === 0) return []

  const ids = candidates.map((row) => row.id)

  // Held by anybody at all, and answered by this person, are separate reasons
  // to stay quiet — both are read here rather than filtered in SQL because
  // task_assignments has no join to tasks_resolved.
  const [{ data: assignments }, { data: answered }] = await Promise.all([
    db
      .from('task_assignments')
      .select('task_id')
      .in('task_id', ids)
      .is('unassigned_at', null)
      .eq('role', 'assignee'),
    db
      .from('task_nudge_responses')
      .select('task_id')
      .in('task_id', ids)
      .eq('person_id', personId)
      .eq('for_date', today),
  ])

  const held = new Set(((assignments ?? []) as { task_id: string }[]).map((r) => r.task_id))
  const done = new Set(((answered ?? []) as { task_id: string }[]).map((r) => r.task_id))

  return candidates
    .filter((row) => !held.has(row.id) && !done.has(row.id))
    .map((row) => ({ id: row.id, title: row.title ?? 'Untitled task', dueDate: row.due_date }))
}

/**
 * This person's own work that is past due, asked about in the evening.
 *
 * "Past due" means both halves of the thing people actually mean by it: jobs
 * carried over from an earlier day, and today's jobs whose time has already
 * gone. At 18:30 a round that was due at 18:00 is late, even though its date
 * is today, and leaving it out would make the check useless on exactly the
 * tasks it exists for.
 */
export async function getOverduePrompt(
  personId: string,
  now: Date = new Date(),
  today: FarmDate = farmToday(now)
): Promise<NudgeTask[]> {
  if (farmMinutes(now) < OVERDUE_FROM_MINUTES) return []

  const db = getTodoTwoClient()

  const { data: rows, error } = await db
    .from('tasks_resolved')
    .select('id, title, due_date, due_at')
    .is('parent_task_id', null)
    .lte('due_date', today)
    .in('status', OPEN_STATUSES)

  if (error) throw new Error(`Could not load the evening check: ${error.message}`)

  const candidates = (
    (rows ?? []) as { id: string; title: string | null; due_date: string | null; due_at: string | null }[]
  ).filter((row) => {
    if (!row.due_date) return false
    if (row.due_date < today) return true
    // Due today: late only once its time has actually passed. An all-day task
    // due today is not late at 18:30.
    return row.due_at !== null && new Date(row.due_at) <= now
  })

  if (candidates.length === 0) return []

  const ids = candidates.map((row) => row.id)

  const [{ data: assignments }, { data: answered }] = await Promise.all([
    db
      .from('task_assignments')
      .select('task_id, person_id')
      .in('task_id', ids)
      .is('unassigned_at', null)
      .eq('role', 'assignee'),
    db
      .from('task_nudge_responses')
      .select('task_id')
      .in('task_id', ids)
      .eq('person_id', personId)
      .eq('for_date', today),
  ])

  const mine = new Set(
    ((assignments ?? []) as { task_id: string; person_id: string }[])
      .filter((row) => row.person_id === personId)
      .map((row) => row.task_id)
  )
  const done = new Set(((answered ?? []) as { task_id: string }[]).map((r) => r.task_id))

  return candidates
    .filter((row) => mine.has(row.id) && !done.has(row.id))
    .map((row) => ({ id: row.id, title: row.title ?? 'Untitled task', dueDate: row.due_date }))
}
