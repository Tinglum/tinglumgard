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
