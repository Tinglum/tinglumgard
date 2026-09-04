import { MAX_ATTEMPTS } from '@/lib/todotwo/notifications/retry'

/**
 * Reads for the staff-only administrative views: the activity log, the stuck
 * notification queue, and the fuller person rows the people screen needs to
 * offer editing.
 *
 * Deliberately client-agnostic. Every function takes the Supabase client to
 * run against rather than building one, so the same query serves a server
 * component (session-bound client from lib/todotwo/db) and the browser client
 * a "load more" button uses — and so this module never imports next/headers,
 * which would make it unimportable from a client component and untestable
 * outside a request.
 *
 * There is no privileged access anywhere here. Every read is subject to the
 * caller's RLS:
 *
 *   todotwo.audit_log        — audit_log_admin_select, admins only, SELECT only
 *                              (no role holds INSERT/UPDATE/DELETE at all).
 *   todotwo.notification_outbox — notification_outbox_staff_select for staff,
 *                              plus own-rows for everyone else.
 *
 * So a page that forgets its requireRole() still cannot leak either table; the
 * role check on the page is about showing an honest screen, not about access.
 */

/** Minimal structural shape, so this works with any Supabase client. */
type Db = { from: (table: string) => any }

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

export interface AuditEntry {
  /** bigint identity, arrives from PostgREST as a number. */
  id: number
  occurredAt: string
  actorPersonId: string | null
  actorName: string | null
  entityTable: string
  entityId: string | null
  action: 'insert' | 'update' | 'delete'
  /** Column names that actually changed, for an update. Empty otherwise. */
  changedColumns: string[]
}

export const AUDIT_PAGE_SIZE = 40

/**
 * One page of the activity log, newest first.
 *
 * Keyset pagination on the identity primary key rather than offset: id order
 * and occurred_at order agree (the log is append-only, so an id never lands
 * out of sequence), and a keyset cursor cannot skip or repeat a row when new
 * entries arrive between pages — which they constantly do, since reading this
 * screen is itself the sort of thing that happens while the farm is working.
 *
 * Pass `beforeId` from the previous page's `nextCursor` to continue.
 */
export async function fetchAuditEntries(
  db: Db,
  options: { limit?: number; beforeId?: number | null } = {}
): Promise<{ entries: AuditEntry[]; nextCursor: number | null }> {
  const limit = options.limit ?? AUDIT_PAGE_SIZE

  let query = db
    .from('audit_log')
    .select('id, occurred_at, actor_person_id, entity_table, entity_id, action, before, after')
    .order('id', { ascending: false })
    // One extra row, purely to learn whether another page exists without a
    // second count query.
    .limit(limit + 1)

  if (options.beforeId != null) query = query.lt('id', options.beforeId)

  const { data, error } = await query
  if (error) throw new Error(`Could not read the activity log: ${error.message}`)

  const rows = (data ?? []) as {
    id: number
    occurred_at: string
    actor_person_id: string | null
    entity_table: string
    entity_id: string | null
    action: 'insert' | 'update' | 'delete'
    before: Record<string, unknown> | null
    after: Record<string, unknown> | null
  }[]

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  const actorNames = await lookupPeopleNames(
    db,
    page.map((row) => row.actor_person_id)
  )

  const entries: AuditEntry[] = page.map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    actorPersonId: row.actor_person_id,
    actorName: row.actor_person_id ? actorNames.get(row.actor_person_id) ?? null : null,
    entityTable: row.entity_table,
    entityId: row.entity_id,
    action: row.action,
    changedColumns: changedColumns(row.before, row.after),
  }))

  return {
    entries,
    nextCursor: hasMore && page.length > 0 ? page[page.length - 1].id : null,
  }
}

/**
 * Names for a set of person ids, in one round trip.
 *
 * An actor whose person row was deleted, or whom the caller cannot see, simply
 * has no entry — the caller renders "someone" rather than failing. Audit rows
 * outlive the people they name (actor_person_id is ON DELETE SET NULL), so a
 * missing name is a normal state, not an error.
 */
async function lookupPeopleNames(
  db: Db,
  ids: (string | null)[]
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))))
  if (unique.length === 0) return new Map()

  const { data } = await db
    .from('people')
    .select('id, full_name, preferred_name')
    .in('id', unique)

  const out = new Map<string, string>()
  for (const row of (data ?? []) as {
    id: string
    full_name: string
    preferred_name: string | null
  }[]) {
    out.set(row.id, row.preferred_name?.trim() || row.full_name)
  }
  return out
}

/**
 * Which columns an update actually changed.
 *
 * The audit trigger stores whole row snapshots, so an update row's `before`
 * and `after` are mostly identical. Showing the difference is the difference
 * between "someone updated a task" and "someone cleared its assignee".
 *
 * updated_at moves on literally every update and says nothing, so it is
 * dropped. Values themselves are not surfaced: `before`/`after` pass through
 * todotwo.redact(), but a column list is honest without inviting the screen to
 * render arbitrary jsonb.
 */
export function changedColumns(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): string[] {
  if (!before || !after) return []

  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const changed: string[] = []

  for (const key of Array.from(keys)) {
    if (key === 'updated_at') continue
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) {
      changed.push(key)
    }
  }

  return changed.sort()
}

/** "task_assignments" -> "assignment". Table names are not a user interface. */
export function entityLabel(entityTable: string): string {
  const labels: Record<string, string> = {
    people: 'person',
    people_private: 'private person details',
    role_assignments: 'role',
    tasks: 'task',
    task_series: 'routine',
    task_assignments: 'assignment',
    task_handoff_requests: 'handoff',
    series_rota: 'rota',
    projects: 'project',
    sections: 'section',
    locations: 'location',
    stays: 'stay',
    settings: 'setting',
    announcements: 'announcement',
    notification_outbox: 'notification',
  }

  return labels[entityTable] ?? entityTable.replace(/_/g, ' ')
}

/** Past tense, because the log is a record of what happened. */
export function actionLabel(action: string): string {
  if (action === 'insert') return 'created'
  if (action === 'delete') return 'deleted'
  if (action === 'update') return 'changed'
  return action
}

/** One line describing an entry, e.g. "changed a task (status, due_date)". */
export function describeAuditEntry(entry: AuditEntry): string {
  const base = `${actionLabel(entry.action)} a ${entityLabel(entry.entityTable)}`
  if (entry.action !== 'update' || entry.changedColumns.length === 0) return base
  return `${base} (${entry.changedColumns.join(', ')})`
}

// ---------------------------------------------------------------------------
// Stuck notifications
// ---------------------------------------------------------------------------

export interface StuckNotification {
  id: string
  personId: string
  personName: string | null
  recipientEmail: string
  subject: string
  topic: string
  status: string
  attempts: number
  lastError: string | null
  nextAttemptAt: string
  createdAt: string
  updatedAt: string
  /**
   * Why this row is on the screen. 'failed' means the dispatcher gave up
   * outright (an unretryable error); 'exhausted' means it is nominally still
   * pending but has burned every attempt, so the dispatcher's own `attempts <
   * MAX_ATTEMPTS` filter will never look at it again. Both mean the message is
   * never going to arrive without somebody doing something.
   */
  reason: 'failed' | 'exhausted'
}

export const STUCK_PAGE_SIZE = 25

/**
 * Notifications that will never be delivered on their own.
 *
 * Two states qualify, and both are dead ends — see StuckNotification.reason.
 * Sorted by most recently touched, because a permanently bouncing address
 * produces a stream of these and the newest is the one that tells you it is
 * still happening.
 */
export async function fetchStuckNotifications(
  db: Db,
  options: { limit?: number } = {}
): Promise<StuckNotification[]> {
  const limit = options.limit ?? STUCK_PAGE_SIZE

  const { data, error } = await db
    .from('notification_outbox')
    .select(
      'id, person_id, recipient_email, subject, topic, status, attempts, last_error, next_attempt_at, created_at, updated_at'
    )
    .or(`status.eq.failed,and(status.eq.pending,attempts.gte.${MAX_ATTEMPTS})`)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Could not read the notification queue: ${error.message}`)

  const rows = (data ?? []) as {
    id: string
    person_id: string
    recipient_email: string
    subject: string
    topic: string
    status: string
    attempts: number
    last_error: string | null
    next_attempt_at: string
    created_at: string
    updated_at: string
  }[]

  const names = await lookupPeopleNames(
    db,
    rows.map((row) => row.person_id)
  )

  return rows.map((row) => ({
    id: row.id,
    personId: row.person_id,
    personName: names.get(row.person_id) ?? null,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    topic: row.topic,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error,
    nextAttemptAt: row.next_attempt_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reason: row.status === 'failed' ? 'failed' : 'exhausted',
  }))
}

// ---------------------------------------------------------------------------
// People, with the columns the edit form needs
// ---------------------------------------------------------------------------

export interface AdminPersonRow {
  id: string
  full_name: string
  preferred_name: string | null
  email: string | null
  phone: string | null
  photo_url: string | null
  farm_start_date: string | null
  auth_user_id: string | null
  roles: string[]
}

/**
 * The people list, with the editable columns included.
 *
 * getPeople() in queries.ts deliberately selects only what the read-only list
 * displays. Editing needs phone, photo and farm_start_date as well, and a form
 * that cannot show the current value is a form that silently blanks it.
 */
export async function fetchPeopleForAdmin(db: Db): Promise<AdminPersonRow[]> {
  const { data, error } = await db
    .from('people')
    .select(
      'id, full_name, preferred_name, email, phone, photo_url, farm_start_date, auth_user_id'
    )
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

  return ((data ?? []) as Omit<AdminPersonRow, 'roles'>[]).map((person) => ({
    ...person,
    roles: byPerson.get(person.id) ?? [],
  }))
}
