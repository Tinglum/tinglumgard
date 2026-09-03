import { NextRequest, NextResponse } from 'next/server'

// PRIVILEGED. Runs from GitHub Actions cron with no user session — see
// app/api/cron/todotwo-notifications for the rationale.
import { getPrivilegedClientForCronOnly } from '@/lib/todotwo/db-privileged'
import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import {
  rampPhaseForDayOffset,
  selectHandoffCandidates,
  type OccurrenceCandidate,
} from '@/lib/todotwo/domain/onboarding'
import { farmToday, addFarmDays, type FarmDate } from '@/lib/todotwo/time'

export const dynamic = 'force-dynamic'

/**
 * Applies the onboarding ramp for every active person with a farm_start_date.
 *
 * Days 0-1 need nothing done: a fresh person is not in any series_rota and
 * gets no assignments in the ordinary course of things, so shadowing is
 * already the natural state — this run does not need to actively unassign
 * anything for them.
 *
 * Days 2-3 (ramping): request up to RAMP_COMBINED_TASK_CAP handoffs total
 * across the whole window, from whoever currently holds a soon-due occurrence,
 * favouring the most-loaded holder to spread work. Idempotent across daily
 * runs: existing pending-or-accepted handoffs already addressed to this
 * person count against the cap before more are requested, and
 * request_task_handoff() itself refuses a second pending request for a task
 * already mid-handoff via a unique index.
 *
 * Day 4+: no special treatment — nothing to do here, normal assignment flow
 * (rota, manual assignment) applies as usual.
 */

const RAMP_WINDOW_DAYS = 3 // look this many days ahead for candidate occurrences to offer

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

  const results: { personId: string; phase: string; requested: number; error?: string }[] = []

  try {
    const { data: people, error: peopleError } = await db
      .from('people')
      .select('id, farm_start_date')
      .not('farm_start_date', 'is', null)
      .eq('is_active', true)
      .is('deleted_at', null)

    if (peopleError) throw new Error(`Could not read people: ${peopleError.message}`)

    for (const person of (people ?? []) as { id: string; farm_start_date: string }[]) {
      const dayOffset = Math.floor(
        (Date.parse(today) - Date.parse(person.farm_start_date)) / 86_400_000
      )
      const phase = rampPhaseForDayOffset(dayOffset)

      if (phase !== 'ramping') {
        results.push({ personId: person.id, phase, requested: 0 })
        continue
      }

      try {
        // Count existing pending-or-accepted handoffs to this person, so a
        // re-run today does not exceed the combined cap set earlier this week.
        const { count: alreadyCount } = await db
          .from('task_handoff_requests')
          .select('id', { count: 'exact', head: true })
          .eq('to_person_id', person.id)
          .in('status', ['pending', 'accepted'])

        const already = alreadyCount ?? 0

        const windowEnd = addFarmDays(today, RAMP_WINDOW_DAYS)

        // Candidate occurrences: open, dated, currently assigned tasks due
        // within the window, not this person's own, with no pending handoff
        // already on them (unique index also enforces this at insert time).
        const { data: assignments } = await db
          .from('task_assignments')
          .select('task_id, person_id')
          .is('unassigned_at', null)

        const holderByTask = new Map<string, string>()
        const loadByHolder = new Map<string, number>()
        for (const a of (assignments ?? []) as { task_id: string; person_id: string }[]) {
          holderByTask.set(a.task_id, a.person_id)
          loadByHolder.set(a.person_id, (loadByHolder.get(a.person_id) ?? 0) + 1)
        }

        const { data: tasks } = await db
          .from('tasks')
          .select('id, due_date, status')
          .gte('due_date', today)
          .lte('due_date', windowEnd)
          .eq('status', 'assigned')
          .is('deleted_at', null)

        const { data: pendingHandoffs } = await db
          .from('task_handoff_requests')
          .select('task_id')
          .eq('status', 'pending')

        const taskIdsWithPending = new Set(
          ((pendingHandoffs ?? []) as { task_id: string }[]).map((r) => r.task_id)
        )

        const candidates: OccurrenceCandidate[] = ((tasks ?? []) as { id: string; due_date: string }[])
          .filter((t) => !taskIdsWithPending.has(t.id))
          .map((t) => {
            const holderPersonId = holderByTask.get(t.id)
            if (!holderPersonId || holderPersonId === person.id) return null
            return {
              taskId: t.id,
              holderPersonId,
              holderLoadInWindow: loadByHolder.get(holderPersonId) ?? 0,
              dueDate: t.due_date,
            } satisfies OccurrenceCandidate
          })
          .filter((c): c is OccurrenceCandidate => c !== null)

        const toOffer = selectHandoffCandidates(candidates, already)

        let requested = 0
        for (const candidate of toOffer) {
          const { error: rpcError } = await db.rpc('request_task_handoff', {
            p_task_id: candidate.taskId,
            p_to_person_id: person.id,
          })
          if (rpcError) {
            results.push({ personId: person.id, phase, requested, error: rpcError.message })
            requested = -1
            break
          }
          requested += 1
        }

        if (requested >= 0) {
          results.push({ personId: person.id, phase, requested })
        }
      } catch (error) {
        results.push({
          personId: person.id,
          phase,
          requested: 0,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return NextResponse.json({ ok: true, today, results })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'onboarding_ramp_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
