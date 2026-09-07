import { addFarmDays, farmToday } from '@/lib/todotwo/time'

type Db = { from: (table: string) => any }

/**
 * Turns operational state into a small set of notifications worth interrupting
 * a person for. Raw task creation and edits never fan out from here.
 */
export async function enqueueRelevantNotifications(db: Db): Promise<{ queued: number }> {
  const today = farmToday()
  const horizon = addFarmDays(today, 4)
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()

  const [{ data: peopleRows }, { data: taskRows }, { data: assignmentRows }, { data: helpRows }] =
    await Promise.all([
      db.from('people').select('id, email, full_name, preferred_name').eq('is_active', true).is('deleted_at', null),
      db
        .from('tasks_resolved')
        .select('id, title, due_date, created_at')
        .gte('due_date', today)
        .lte('due_date', horizon)
        .gte('created_at', since),
      db
        .from('task_assignments')
        .select('task_id, person_id')
        .is('unassigned_at', null)
        .eq('role', 'assignee'),
      db
        .from('task_help_requests')
        .select('id, task_id, asked_by_person_id, taken_by_person_id, note, status, created_at, resolved_at')
        .in('status', ['open', 'taken'])
        .gte('created_at', since),
    ])

  const people = (peopleRows ?? []) as {
    id: string
    email: string | null
    full_name: string
    preferred_name: string | null
  }[]
  const tasks = (taskRows ?? []) as { id: string; title: string | null; due_date: string | null }[]
  const assignments = (assignmentRows ?? []) as { task_id: string; person_id: string }[]
  const help = (helpRows ?? []) as {
    id: string
    task_id: string
    asked_by_person_id: string
    taken_by_person_id: string | null
    note: string | null
    status: 'open' | 'taken'
  }[]

  const missingHelpTaskIds = help
    .map((request) => request.task_id)
    .filter((id) => !tasks.some((task) => task.id === id))
  if (missingHelpTaskIds.length > 0) {
    const { data: helpTaskRows } = await db
      .from('tasks_resolved')
      .select('id, title, due_date')
      .in('id', missingHelpTaskIds)
    tasks.push(...((helpTaskRows ?? []) as typeof tasks))
  }

  const personById = new Map(people.map((person) => [person.id, person]))
  const taskById = new Map(tasks.map((task) => [task.id, task]))
  const assignmentsByTask = new Map<string, string[]>()
  for (const assignment of assignments) {
    assignmentsByTask.set(assignment.task_id, [
      ...(assignmentsByTask.get(assignment.task_id) ?? []),
      assignment.person_id,
    ])
  }

  const rows: Record<string, unknown>[] = []
  const dayCounts = new Map<string, number>()
  for (const task of tasks) {
    if (!task.due_date) continue
    for (const personId of assignmentsByTask.get(task.id) ?? []) {
      const key = `${personId}:${task.due_date}`
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
    }
  }

  for (const [key, count] of Array.from(dayCounts.entries())) {
    const [personId, dueDate] = key.split(':')
    const person = personById.get(personId)
    if (!person?.email) continue
    const weekday = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      timeZone: 'Europe/Oslo',
    }).format(new Date(`${dueDate}T12:00:00+02:00`))
    rows.push({
      person_id: personId,
      channel: 'email',
      recipient_email: person.email,
      subject: `${weekday} is ready`,
      body: `${count} assignment${count === 1 ? '' : 's'} for ${weekday}. Tap to see your assignments.`,
      topic: 'day-ready',
      reference_id: null,
      dedupe_key: `day-ready:${dueDate}:${personId}`,
    })
  }

  for (const request of help) {
    const task = taskById.get(request.task_id)
    const asker = personById.get(request.asked_by_person_id)
    if (!task || !asker) continue
    const askerName = asker.preferred_name || asker.full_name
    if (request.status === 'taken') {
      const requester = personById.get(request.asked_by_person_id)
      const taker = request.taken_by_person_id ? personById.get(request.taken_by_person_id) : null
      if (requester?.email && taker) {
        rows.push({
          person_id: requester.id,
          channel: 'email',
          recipient_email: requester.email,
          subject: `${taker.preferred_name || taker.full_name} took your task`,
          body: `“${task.title ?? 'Your task'}” is now covered.`,
          topic: 'help-request-taken',
          reference_id: task.id,
          dedupe_key: `help-request-taken:${request.id}:${requester.id}`,
        })
      }
      continue
    }

    for (const person of people) {
      if (!person.email || person.id === request.asked_by_person_id) continue
      rows.push({
        person_id: person.id,
        channel: 'email',
        recipient_email: person.email,
        subject: `${askerName} needs help`,
        body: `Can anyone take “${task.title ?? 'this task'}”?${request.note ? ` ${request.note}` : ''}`,
        topic: 'help-request',
        reference_id: request.id,
        dedupe_key: `help-request:${request.id}:${person.id}`,
      })
    }
  }

  if (rows.length === 0) return { queued: 0 }
  const { data, error } = await db.from('notification_outbox').upsert(rows, {
    onConflict: 'dedupe_key',
    ignoreDuplicates: true,
  }).select('id')
  if (error) throw new Error(`Could not enqueue relevant notifications: ${error.message}`)
  return { queued: data?.length ?? 0 }
}
