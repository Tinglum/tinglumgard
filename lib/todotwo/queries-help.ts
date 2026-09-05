import { getTodoTwoClient } from '@/lib/todotwo/db'
import type { OpenHelpRequest } from '@/components/todotwo/tasks/open-help-requests'

/** Everything the farm is currently asking for help with. */
export async function getOpenHelpRequests(viewerPersonId: string): Promise<OpenHelpRequest[]> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('task_help_requests')
    .select('id, note, task_id, asked_by_person_id, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(`Could not load the help requests: ${error.message}`)
  const rows = (data ?? []) as {
    id: string
    note: string | null
    task_id: string
    asked_by_person_id: string
  }[]
  if (rows.length === 0) return []

  // Two small lookups rather than an embed: the task title may be inherited
  // from the series, which tasks_resolved already works out.
  const [{ data: taskRows }, { data: peopleRows }] = await Promise.all([
    db
      .from('tasks_resolved')
      .select('id, title, due_date')
      .in('id', rows.map((r) => r.task_id)),
    db
      .from('people')
      .select('id, full_name, preferred_name, photo_url')
      .in('id', rows.map((r) => r.asked_by_person_id)),
  ])

  const task = new Map(
    ((taskRows ?? []) as { id: string; title: string | null; due_date: string | null }[]).map((t) => [
      t.id,
      t,
    ])
  )
  const person = new Map(
    (
      (peopleRows ?? []) as {
        id: string
        full_name: string
        preferred_name: string | null
        photo_url: string | null
      }[]
    ).map((p) => [p.id, p])
  )

  return rows.flatMap((row) => {
    const t = task.get(row.task_id)
    const p = person.get(row.asked_by_person_id)
    if (!t || !p) return []

    return [
      {
        id: row.id,
        taskTitle: t.title ?? 'Untitled',
        dueDate: t.due_date,
        note: row.note,
        askedBy: {
          id: p.id,
          fullName: p.full_name,
          preferredName: p.preferred_name,
          photoUrl: p.photo_url,
        },
        isMine: row.asked_by_person_id === viewerPersonId,
      },
    ]
  })
}
