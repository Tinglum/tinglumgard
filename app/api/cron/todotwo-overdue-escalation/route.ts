import { NextRequest, NextResponse } from 'next/server'

// PRIVILEGED. Runs from GitHub Actions cron with no user session — see
// app/api/cron/todotwo-notifications for the rationale. Like
// todotwo-daily-digest, this reimplements todotwo.is_staff()'s staff-roster
// definition as a plain role_assignments query (is_staff() reads auth.uid(),
// which is null in a cron context) and inserts into notification_outbox
// directly rather than through todotwo.enqueue_notification() (that RPC
// itself requires is_staff() to pass, for the same reason).
import { getPrivilegedClientForCronOnly } from '@/lib/todotwo/db-privileged'
import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import { notificationDedupeKey } from '@/lib/todotwo/notifications/dedupe'
import { farmToday, type FarmDate } from '@/lib/todotwo/time'

export const dynamic = 'force-dynamic'

/**
 * Per-task overdue escalation, distinct from todotwo-daily-digest (a once-a-
 * day summary of counts). This targets one specific task by name, the moment
 * it has been overdue long enough to matter, rather than waiting for the
 * evening digest to mention a number.
 *
 * Threshold: a task escalates once the farm-local calendar date is at least
 * two days past its due_date — i.e. more than 24 hours after the end of the
 * day it was due. due_date's day ends at farm-local midnight starting
 * due_date + 1; "more than 24 hours past" that instant is due_date + 2. A
 * task due yesterday is not yet escalated (it may still be finished before
 * anyone would call it forgotten); a task still open the day after that is.
 * This intentionally lags the daily digest's same-day "still open today"
 * count, which is a different, softer signal.
 *
 * This cron is designed to run every few hours (see the workflow file). The
 * threshold is date-based, not timestamp-based, so running it more or less
 * often changes only how soon within that day escalation happens, never
 * whether a task qualifies — the dedupe key below is what actually stops
 * repeat notification, independent of how often this route runs.
 *
 * Dedupe: notification_outbox's unique index is on dedupe_key alone, and
 * notificationDedupeKey() builds `topic:referenceId:personId:channel` with no
 * timestamp component (see lib/todotwo/notifications/dedupe.ts — contrast
 * with todotwo-daily-digest, which deliberately folds today's date into its
 * key so a same-day re-run is a no-op but tomorrow's digest is not). Here
 * referenceId is the task id, so the SAME task escalating to the SAME person
 * produces the SAME key on every run, at any frequency, for as long as the
 * task stays overdue — the first run inserts the row, every later run hits
 * the unique index and is silently skipped. Once the task is completed,
 * cancelled, or reassigned, it drops out of the query below and stops
 * producing new attempts; the historical outbox row is not deleted or reused
 * even if the same task somehow becomes overdue again later (it would need a
 * new task id via duplication to escalate again, which is intended).
 */

const STAFF_ROLES = ['super_admin', 'farm_admin', 'coordinator'] as const
const OPEN_STATUSES = [
  'draft',
  'unassigned',
  'assigned',
  'accepted',
  'in_progress',
  'blocked',
  'not_completed',
]

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

function daysBetween(today: FarmDate, dueDate: FarmDate): number {
  return Math.floor((Date.parse(today) - Date.parse(dueDate)) / 86_400_000)
}

function reminderSubject(title: string): string {
  return `Overdue: ${title}`
}

function reminderBody(title: string, dueDate: string): string {
  return [
    `"${title}" was due ${dueDate} and is still not done.`,
    '',
    'Please finish it or let a coordinator know if you are blocked.',
  ].join('\n')
}

function escalationSubject(title: string): string {
  return `Escalation: overdue task — ${title}`
}

function escalationBody(title: string, dueDate: string, assigneeName: string | null): string {
  return [
    `"${title}" was due ${dueDate} and is now more than a day overdue.`,
    '',
    assigneeName ? `Currently assigned to: ${assigneeName}` : 'Currently unassigned.',
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
    const { data: tasks, error: tasksError } = await db
      .from('tasks')
      .select('id, title, due_date, status')
      .is('deleted_at', null)
      .not('due_date', 'is', null)
      .in('status', OPEN_STATUSES)

    if (tasksError) throw new Error(`Could not read tasks: ${tasksError.message}`)

    const overdueTasks = ((tasks ?? []) as { id: string; title: string; due_date: string; status: string }[])
      .filter((t) => daysBetween(today, t.due_date) >= 2)

    if (overdueTasks.length === 0) {
      return NextResponse.json({ ok: true, today, overdueCount: 0, queued: 0 })
    }

    const taskIds = overdueTasks.map((t) => t.id)

    const { data: assignments, error: assignmentsError } = await db
      .from('task_assignments')
      .select('task_id, person_id')
      .in('task_id', taskIds)
      .is('unassigned_at', null)

    if (assignmentsError) throw new Error(`Could not read assignments: ${assignmentsError.message}`)

    // A task can have several active assignees; the "current assignee" for a
    // reminder is whichever one comes back first — good enough for a nudge,
    // and staff still get the full picture via the escalation copy.
    const assigneeByTask = new Map<string, string>()
    for (const a of (assignments ?? []) as { task_id: string; person_id: string }[]) {
      if (!assigneeByTask.has(a.task_id)) assigneeByTask.set(a.task_id, a.person_id)
    }

    const { data: roleRows, error: rolesError } = await db
      .from('role_assignments')
      .select('person_id, role')
      .in('role', STAFF_ROLES)
      .is('revoked_at', null)

    if (rolesError) throw new Error(`Could not read role assignments: ${rolesError.message}`)

    const staffPersonIds = Array.from(
      new Set(((roleRows ?? []) as { person_id: string; role: string }[]).map((r) => r.person_id))
    )

    const relevantPersonIds = Array.from(
      new Set(Array.from(assigneeByTask.values()).concat(staffPersonIds))
    )

    const { data: people, error: peopleError } = await db
      .from('people')
      .select('id, full_name, preferred_name, email')
      .in('id', relevantPersonIds.length > 0 ? relevantPersonIds : ['00000000-0000-0000-0000-000000000000'])
      .is('deleted_at', null)
      .eq('is_active', true)

    if (peopleError) throw new Error(`Could not read people: ${peopleError.message}`)

    const peopleById = new Map(
      ((people ?? []) as { id: string; full_name: string; preferred_name: string | null; email: string | null }[]).map(
        (p) => [p.id, p]
      )
    )

    let queued = 0
    const errors: { taskId: string; personId: string; message: string }[] = []

    const enqueue = async (personId: string, subject: string, body: string, topic: string, referenceId: string) => {
      const person = peopleById.get(personId)
      if (!person?.email || person.email.indexOf('@') < 1) return

      const dedupeKey = notificationDedupeKey({
        topic,
        referenceId,
        personId,
        channel: 'email',
      })

      const { error: insertError } = await db.from('notification_outbox').insert({
        person_id: personId,
        channel: 'email',
        recipient_email: person.email,
        subject,
        body,
        topic,
        reference_id: referenceId,
        dedupe_key: dedupeKey,
      })

      if (insertError) {
        // Duplicate dedupe_key means this exact escalation already went out —
        // that is the dedupe mechanism working, not a failure.
        if (!/duplicate key value/i.test(insertError.message)) {
          errors.push({ taskId: referenceId, personId, message: insertError.message })
        }
        return
      }
      queued += 1
    }

    for (const task of overdueTasks) {
      const assigneeId = assigneeByTask.get(task.id) ?? null
      const assignee = assigneeId ? peopleById.get(assigneeId) ?? null : null
      const assigneeName = assignee ? assignee.preferred_name?.trim() || assignee.full_name : null

      if (assigneeId) {
        await enqueue(
          assigneeId,
          reminderSubject(task.title),
          reminderBody(task.title, task.due_date),
          'overdue-reminder',
          task.id
        )
      }

      for (const staffId of staffPersonIds) {
        // Don't double-message a staff person who is also the assignee — the
        // reminder above already told them.
        if (staffId === assigneeId) continue
        await enqueue(
          staffId,
          escalationSubject(task.title),
          escalationBody(task.title, task.due_date, assigneeName),
          'overdue-escalation',
          task.id
        )
      }
    }

    return NextResponse.json({
      ok: true,
      today,
      overdueCount: overdueTasks.length,
      queued,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'overdue_escalation_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
