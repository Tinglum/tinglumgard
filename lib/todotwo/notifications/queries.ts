import { getTodoTwoClient } from '@/lib/todotwo/db'

/**
 * Reads for the announcements screen.
 *
 * Everything here goes through the session-bound client, so what comes back is
 * whatever Row Level Security allows the caller to see. There is no role check
 * in this file on purpose: a staff caller gets drafts and reach counts because
 * the policies say so, not because a `if (isAdmin)` in TypeScript remembered to.
 */

export type AnnouncementUrgency = 'info' | 'important' | 'urgent'

export interface AnnouncementView {
  id: string
  title: string
  body: string
  urgency: AnnouncementUrgency
  publishedAt: string | null
  authorName: string | null
  acknowledgedByMe: boolean
  /** Null for anyone whose policies do not let them see the reach view. */
  reach: {
    acknowledgedCount: number
    notificationsSent: number
    notificationsPending: number
    notificationsFailed: number
  } | null
}

interface AnnouncementRow {
  id: string
  title: string
  body: string
  urgency: AnnouncementUrgency
  published_at: string | null
  author_person_id: string | null
  people: { full_name: string; preferred_name: string | null } | null
}

export async function getAnnouncements(personId: string): Promise<AnnouncementView[]> {
  const db = getTodoTwoClient()

  const { data, error } = await db
    .from('announcements')
    .select(
      'id, title, body, urgency, published_at, author_person_id, people:author_person_id (full_name, preferred_name)'
    )
    .is('deleted_at', null)
    .order('published_at', { ascending: false, nullsFirst: true })
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(`Could not read announcements: ${error.message}`)

  const rows = (data ?? []) as unknown as AnnouncementRow[]
  if (rows.length === 0) return []

  const ids = rows.map((row) => row.id)

  const [{ data: mine }, { data: reachRows }] = await Promise.all([
    db
      .from('announcement_acknowledgements')
      .select('announcement_id')
      .eq('person_id', personId)
      .in('announcement_id', ids),
    // Denied or empty for a non-staff caller; the page simply shows no counts.
    db
      .from('announcement_reach')
      .select(
        'announcement_id, acknowledged_count, notifications_sent, notifications_pending, notifications_failed'
      )
      .in('announcement_id', ids),
  ])

  const acknowledged = new Set(
    ((mine ?? []) as { announcement_id: string }[]).map((row) => row.announcement_id)
  )

  const reachById = new Map(
    (
      (reachRows ?? []) as {
        announcement_id: string
        acknowledged_count: number
        notifications_sent: number
        notifications_pending: number
        notifications_failed: number
      }[]
    ).map((row) => [
      row.announcement_id,
      {
        acknowledgedCount: Number(row.acknowledged_count ?? 0),
        notificationsSent: Number(row.notifications_sent ?? 0),
        notificationsPending: Number(row.notifications_pending ?? 0),
        notificationsFailed: Number(row.notifications_failed ?? 0),
      },
    ])
  )

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    urgency: row.urgency,
    publishedAt: row.published_at,
    authorName: row.people?.preferred_name || row.people?.full_name || null,
    acknowledgedByMe: acknowledged.has(row.id),
    reach: reachById.get(row.id) ?? null,
  }))
}
