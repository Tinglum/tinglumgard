import { NextRequest, NextResponse } from 'next/server'

// PRIVILEGED. Runs from GitHub Actions cron with no user session — see
// app/api/cron/todotwo-notifications for the rationale. This handler also
// needs the staff roster, which is why it queries role_assignments directly
// rather than calling todotwo.is_staff() (that reads auth.uid(), which is
// null here) and enqueues rows directly rather than through
// todotwo.enqueue_notification() (that RPC itself requires todotwo.is_staff()
// to pass, for the same reason).
import { getPrivilegedClientForCronOnly } from '@/lib/todotwo/db-privileged'
import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import { notificationDedupeKey } from '@/lib/todotwo/notifications/dedupe'
import { farmToday, type FarmDate } from '@/lib/todotwo/time'

export const dynamic = 'force-dynamic'

/**
 * Queues one end-of-day digest email per staff person, summarising:
 *
 *   - how many tasks were completed today
 *   - how many are still open/unassigned for today
 *   - how many are currently overdue farm-wide
 *
 * "Staff" here mirrors todotwo.is_staff()'s SQL definition (is_admin() OR
 * has_role('coordinator'), i.e. super_admin, farm_admin or coordinator) —
 * reimplemented as a plain query against role_assignments because this runs
 * with no session for is_staff() to evaluate against.
 *
 * The counts are computed here rather than by importing the Favorites query
 * functions in lib/todotwo/queries.ts: those are written against
 * getTodoTwoClient(), the RLS-bound client built for a request with a user
 * session, and calling them from this service-role, session-less context
 * would not carry the person/isStaff arguments those functions expect in the
 * way they expect them. Simpler and safer to read the same tables directly
 * with the privileged client than to bend a request-path helper to fit a cron
 * context it was not written for.
 *
 * dedupe_key includes today's date, so re-running the cron the same day is a
 * no-op (the outbox's unique index on dedupe_key enforces it) rather than a
 * second email; a re-run on a later day is a distinct, legitimate digest.
 */

const STAFF_ROLES = ['super_admin', 'farm_admin', 'coordinator'] as const

async function isAuthorized(request: NextRequest): Promise<{ ok: boolean; status: number; error?: string }> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return { ok: false, status: 500, error: 'CRON_SECRET is not configured on the server' }
  }

  const token = request.headers.get('x-cron-secret')
  if (!token) return { ok: false, status: 401, error: 'Missing cron token' }

  const { timingSafeEqual } = await import('crypto')
  const secretBuf = Buffer.from(secret)
  const tokenBuf = Buffer.from(token)
  const valid = secretBuf.length === tokenBuf.length && timingSafeEqual(secretBuf, tokenBuf)

  return valid ? { ok: true, status: 200 } : { ok: false, status: 401, error: 'Invalid cron token' }
}

function formatSubject(today: FarmDate): string {
  return `TodoTwo daily digest — ${today}`
}

function formatBody(today: FarmDate, completed: number, openToday: number, overdue: number): string {
  return [
    `End-of-day digest for ${today}.`,
    '',
    `Completed today: ${completed}`,
    `Still open or unassigned for today: ${openToday}`,
    `Overdue farm-wide: ${overdue}`,
  ].join('\n')
}

export async function POST(request: NextRequest) {
  const auth = await isAuthorized(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!isTodoTwoEnabled()) {
    return NextResponse.json(
      { error: 'disabled', message: 'TODOTWO_ENABLED is not true.' },
      { status: 503 }
    )
  }

  const db = getPrivilegedClientForCronOnly()
  const today: FarmDate = farmToday()

  try {
    // Farm-wide counts, computed once and shared by every recipient — the
    // digest is the same summary for every staff person, not personalised.
    const { data: tasks, error: tasksError } = await db
      .from('tasks')
      .select('id, status, due_date')
      .is('deleted_at', null)

    if (tasksError) throw new Error(`Could not read tasks: ${tasksError.message}`)

    const rows = (tasks ?? []) as { id: string; status: string; due_date: string | null }[]

    const completed = rows.filter(
      (t) => t.due_date === today && (t.status === 'completed' || t.status === 'verified')
    ).length

    const openToday = rows.filter(
      (t) =>
        t.due_date === today &&
        ['draft', 'unassigned', 'assigned', 'accepted', 'in_progress', 'blocked', 'not_completed'].includes(
          t.status
        )
    ).length

    const overdue = rows.filter(
      (t) =>
        t.due_date !== null &&
        t.due_date < today &&
        ['draft', 'unassigned', 'assigned', 'accepted', 'in_progress', 'blocked', 'not_completed'].includes(
          t.status
        )
    ).length

    // Staff roster: everyone holding an unrevoked super_admin, farm_admin or
    // coordinator role, matching todotwo.is_staff()'s definition.
    const { data: roleRows, error: rolesError } = await db
      .from('role_assignments')
      .select('person_id, role')
      .in('role', STAFF_ROLES)
      .is('revoked_at', null)

    if (rolesError) throw new Error(`Could not read role assignments: ${rolesError.message}`)

    const staffPersonIds = Array.from(
      new Set(((roleRows ?? []) as { person_id: string; role: string }[]).map((r) => r.person_id))
    )

    if (staffPersonIds.length === 0) {
      return NextResponse.json({ ok: true, today, completed, openToday, overdue, queued: 0, staff: 0 })
    }

    const { data: people, error: peopleError } = await db
      .from('people')
      .select('id, email')
      .in('id', staffPersonIds)
      .is('deleted_at', null)
      .eq('is_active', true)

    if (peopleError) throw new Error(`Could not read people: ${peopleError.message}`)

    const subject = formatSubject(today)
    const body = formatBody(today, completed, openToday, overdue)

    let queued = 0
    const errors: { personId: string; message: string }[] = []

    for (const person of (people ?? []) as { id: string; email: string | null }[]) {
      if (!person.email || person.email.indexOf('@') < 1) continue

      const dedupeKey = notificationDedupeKey({
        topic: 'daily-digest',
        referenceId: today,
        personId: person.id,
        channel: 'email',
      })

      const { error: insertError } = await db.from('notification_outbox').insert({
        person_id: person.id,
        channel: 'email',
        recipient_email: person.email,
        subject,
        body,
        topic: 'daily-digest',
        reference_id: null,
        dedupe_key: dedupeKey,
      })

      if (insertError) {
        // A duplicate dedupe_key from a same-day re-run is expected, not an
        // error — the unique index is what makes this idempotent.
        if (!/duplicate key value/i.test(insertError.message)) {
          errors.push({ personId: person.id, message: insertError.message })
        }
        continue
      }

      queued += 1
    }

    return NextResponse.json({
      ok: true,
      today,
      completed,
      openToday,
      overdue,
      staff: (people ?? []).length,
      queued,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'daily_digest_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
