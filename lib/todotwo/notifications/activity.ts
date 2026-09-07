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
  const { data, error } = await getTodoTwoClient().rpc('activity_feed', { p_limit: limit })
  if (error) throw new Error(`Could not load notifications: ${error.message}`)

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

