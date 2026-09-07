import { getTodoTwoClient } from '@/lib/todotwo/db'

export interface ActivityItem {
  eventId: string
  occurredAt: string
  actorName: string
  eventType: string
  title: string
  detail: string | null
  taskId: string | null
}

export async function getActivityFeed(limit = 100): Promise<ActivityItem[]> {
  const db = getTodoTwoClient()
  const { data, error } = await db.rpc('activity_feed', { p_limit: limit })

  // Production installations may receive the web deploy before the optional
  // audit-feed migration is applied. The ordinary tables already contain the
  // timestamps needed for a useful feed, so keep Notifications working there
  // instead of turning the whole page into an error screen.
  if (error) return getActivityFeedFromOperationalTables(limit)

  return ((data ?? []) as {
    event_id: string
    occurred_at: string
    actor_name: string
    event_type: string
    title: string
    detail: string | null
    task_id: string | null
  }[]).map((row) => ({
    eventId: row.event_id,
    occurredAt: row.occurred_at,
    actorName: row.actor_name,
    eventType: row.event_type,
    title: row.title,
    detail: row.detail,
    taskId: row.task_id,
  }))
}

async function getActivityFeedFromOperationalTables(limit: number): Promise<ActivityItem[]> {
  const db = getTodoTwoClient()
  const [tasksResult, helpResult, noticesResult, messagesResult] = await Promise.all([
    db
      .from('tasks_resolved')
      .select('id, series_id, occurrence_date, title, status, due_date, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit),
    db
      .from('task_help_requests')
      .select('id, task_id, status, created_at, resolved_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('announcements')
      .select('id, title, created_at, updated_at, published_at')
      .not('published_at', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(limit),
    db
      .from('notification_outbox')
      .select('id, subject, body, topic, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  const taskTitles = new Map(
    ((tasksResult.data ?? []) as { id: string; title: string | null }[]).map((task) => [
      task.id,
      task.title ?? 'Untitled task',
    ])
  )

  const tasks: ActivityItem[] = ((tasksResult.data ?? []) as {
    id: string
    series_id: string | null
    occurrence_date: string | null
    title: string | null
    status: string
    due_date: string | null
    created_at: string
    updated_at: string
  }[]).map((task) => {
    const newlyCreated = Math.abs(new Date(task.updated_at).getTime() - new Date(task.created_at).getTime()) < 5000
    return {
      eventId: `task:${task.id}:${task.updated_at}`,
      occurredAt: task.updated_at,
      actorName: 'TodoTwo',
      eventType: newlyCreated ? 'tasks.insert' : 'tasks.update',
      title: newlyCreated ? (task.series_id ? 'New day added' : 'New task added') : 'Task changed',
      detail: `${task.title ?? 'Untitled task'}${task.due_date ? ` · ${task.due_date}` : ''}`,
      taskId: task.id,
    }
  })

  const help: ActivityItem[] = ((helpResult.data ?? []) as {
    id: string
    task_id: string
    status: string
    created_at: string
    resolved_at: string | null
  }[]).map((request) => ({
    eventId: `help:${request.id}:${request.resolved_at ?? request.created_at}`,
    occurredAt: request.resolved_at ?? request.created_at,
    actorName: 'TodoTwo',
    eventType: `task_help_requests.${request.status}`,
    title:
      request.status === 'open'
        ? 'Help requested'
        : request.status === 'taken'
          ? 'Help request taken'
          : 'Help request withdrawn',
    detail: taskTitles.get(request.task_id) ?? 'Task',
    taskId: request.task_id,
  }))

  const notices: ActivityItem[] = ((noticesResult.data ?? []) as {
    id: string
    title: string
    created_at: string
    updated_at: string
  }[]).map((notice) => ({
    eventId: `notice:${notice.id}:${notice.updated_at}`,
    occurredAt: notice.updated_at,
    actorName: 'TodoTwo',
    eventType: 'announcements.update',
    title: 'Farm notice',
    detail: notice.title,
    taskId: null,
  }))

  const messages: ActivityItem[] = ((messagesResult.data ?? []) as {
    id: string
    subject: string
    body: string
    topic: string
    created_at: string
  }[]).map((message) => ({
    eventId: `message:${message.id}`,
    occurredAt: message.created_at,
    actorName: 'TodoTwo',
    eventType: `notification.${message.topic}`,
    title: message.subject,
    detail: message.body,
    taskId: null,
  }))

  return [...tasks, ...help, ...notices, ...messages]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, Math.min(Math.max(limit, 1), 200))
}
