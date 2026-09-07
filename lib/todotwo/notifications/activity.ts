import { getTodoTwoClient } from '@/lib/todotwo/db'
import { UI_LOCALE } from '@/lib/todotwo/copy'
import { addFarmDays, FARM_TZ, farmDayStart, farmToday } from '@/lib/todotwo/time'

const INBOX_TOPICS = new Set([
  'announcement',
  'help-request',
  'help-request-taken',
  'overdue-escalation',
  'overdue-reminder',
  'task_handoff_request',
])

export interface ActivityItem {
  eventId: string
  occurredAt: string
  actorName: string
  eventType: string
  title: string
  detail: string | null
  href: string | null
}

/** A recipient-specific inbox, deliberately not a raw farm audit log. */
export async function getActivityFeed(personId: string, limit = 100): Promise<ActivityItem[]> {
  const db = getTodoTwoClient()
  const today = farmToday()
  const recentCutoff = new Date(Date.now() - 14 * 86_400_000).toISOString()
  const [{ data: assignmentRows }, { data: messageRows }] = await Promise.all([
    db
      .from('task_assignments')
      .select('task_id, assigned_at')
      .eq('person_id', personId)
      .eq('role', 'assignee')
      .is('unassigned_at', null)
      .order('assigned_at', { ascending: false })
      .limit(200),
    db
      .from('notification_outbox')
      .select('id, subject, body, topic, reference_id, created_at')
      .eq('person_id', personId)
      .gte('created_at', recentCutoff)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const assignments = (assignmentRows ?? []) as { task_id: string; assigned_at: string }[]
  const taskIds = assignments.map((row) => row.task_id)
  const { data: taskRows } = taskIds.length
    ? await db
        .from('tasks_resolved')
        .select('id, due_date, status')
        .in('id', taskIds)
        .not('due_date', 'is', null)
        .gte('due_date', today)
        .lte('due_date', addFarmDays(today, 3))
    : { data: [] }

  const assignmentByTask = new Map(assignments.map((row) => [row.task_id, row.assigned_at]))
  const days = new Map<string, { count: number; occurredAt: string }>()
  for (const task of (taskRows ?? []) as { id: string; due_date: string; status: string }[]) {
    if (['completed', 'verified', 'cancelled'].includes(task.status)) continue
    const assignedAt = assignmentByTask.get(task.id)
    if (!assignedAt) continue
    const current = days.get(task.due_date)
    days.set(task.due_date, {
      count: (current?.count ?? 0) + 1,
      occurredAt: current && current.occurredAt > assignedAt ? current.occurredAt : assignedAt,
    })
  }

  const dayItems: ActivityItem[] = Array.from(days.entries()).map(([date, day]) => {
    const weekday = new Intl.DateTimeFormat(UI_LOCALE, {
      weekday: 'long',
      timeZone: FARM_TZ,
    }).format(farmDayStart(date))
    return {
      eventId: `day:${date}`,
      occurredAt: day.occurredAt,
      actorName: 'TodoTwo',
      eventType: 'day-ready',
      title: `${weekday} is ready`,
      detail: `${day.count} assignment${day.count === 1 ? '' : 's'}. Tap to see your assignments.`,
      href: '/todotwo/upcoming',
    }
  })

  const seenMessages = new Set<string>()
  const messages: ActivityItem[] = ((messageRows ?? []) as {
    id: string
    subject: string
    body: string
    topic: string
    reference_id: string | null
    created_at: string
  }[])
    .filter((message) => {
      if (!INBOX_TOPICS.has(message.topic)) return false
      const key = `${message.topic}:${message.reference_id ?? message.subject}`
      if (seenMessages.has(key)) return false
      seenMessages.add(key)
      return true
    })
    .map((message) => ({
      eventId: `message:${message.id}`,
      occurredAt: message.created_at,
      actorName: 'TodoTwo',
      eventType: `notification.${message.topic}`,
      title: message.subject,
      detail: message.body,
      href:
        message.reference_id && message.topic.startsWith('overdue')
          ? `/todotwo/tasks/${message.reference_id}`
          : message.topic === 'help-request'
            ? '/todotwo'
            : null,
    }))

  return [...dayItems, ...messages]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, Math.min(Math.max(limit, 1), 200))
}
