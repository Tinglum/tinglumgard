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
 * Days 2-3 (ramping): request up to RAMP_COMBINED_TASK_CAP household handoffs
 * across those two days, from whoever currently holds one,
 * favouring the most-loaded holder to spread work. Idempotent across daily
 * runs: existing pending-or-accepted handoffs already addressed to this
 * person count against the cap before more are requested, and
 * request_task_handoff() itself refuses a second pending request for a task
 * already mid-handoff via a unique index.
 *
 * Day 4+: no special treatment — nothing to do here, normal assignment flow
 * (rota, manual assignment) applies as usual.
 */

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

      if (phase !== 'household' && phase !== 'animals') {
        results.push({ personId: person.id, phase, requested: 0 })
        continue
      }

      try {
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

        const { data: projectRows } = await db.from('projects').select('id, name, slug')
        const householdProjectIds = new Set(((projectRows ?? []) as { id: string; name: string; slug: string }[])
          .filter((p) => /house|home|kitchen|meal|clean/i.test(`${p.name} ${p.slug}`))
          .map((p) => p.id))
        const animalProjectIds = new Set(((projectRows ?? []) as { id: string; name: string; slug: string }[])
          .filter((p) => /animal/i.test(`${p.name} ${p.slug}`))
          .map((p) => p.id))

        const { data: tasks } = await db
          .from('tasks_resolved')
          .select('id, title, due_date, status, project_id')
          .eq('due_date', today)
          .eq('status', 'assigned')

        const { data: pendingHandoffs } = await db
          .from('task_handoff_requests')
          .select('task_id')
          .eq('status', 'pending')

        const taskIdsWithPending = new Set(
          ((pendingHandoffs ?? []) as { task_id: string }[]).map((r) => r.task_id)
        )

        const taskRows = (tasks ?? []) as { id: string; title: string; due_date: string; project_id: string | null }[]
        const relevant = phase === 'household'
          ? taskRows.filter((t) => t.project_id !== null && householdProjectIds.has(t.project_id))
          : taskRows.filter((t) => t.project_id !== null && animalProjectIds.has(t.project_id))
        const already = relevant.filter((t) => holderByTask.get(t.id) === person.id).length
        const candidates: OccurrenceCandidate[] = relevant
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

        let toOffer: OccurrenceCandidate[]
        if (phase === 'household') {
          toOffer = selectHandoffCandidates(candidates, already)
        } else if (already > 0) {
          toOffer = []
        } else {
          const byId = new Map(candidates.map((candidate) => [candidate.taskId, candidate]))
          const shifts = [
            ['Goats', 'Chickens + Ducks'],
            ['Pigs', 'Rabbits'],
          ].map((labels) => taskRows
            .filter((task) => labels.some((label) => task.title.startsWith(label)))
            .map((task) => byId.get(task.id))
            .filter((candidate): candidate is OccurrenceCandidate => Boolean(candidate)))
            .filter((shift) => shift.length >= 4)
            .sort((a, b) => b.reduce((n, c) => n + c.holderLoadInWindow, 0) - a.reduce((n, c) => n + c.holderLoadInWindow, 0))
          toOffer = shifts[0] ?? []
        }

        let requested = 0
        for (const candidate of toOffer) {
          const { error: rpcError } = await db.rpc('assign_task', {
            p_task_id: candidate.taskId,
            p_person_id: person.id,
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
