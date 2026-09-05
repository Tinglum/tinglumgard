import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import { getTodoTwoClient } from '@/lib/todotwo/db'
import { requireApiRole } from '@/lib/todotwo/auth'
import {
  AssignmentAiUnavailableError,
  parseConstraints,
  type RosterPerson,
  type RosterTask,
} from '@/lib/todotwo/domain/assignment-ai'
import { addFarmDays, farmToday } from '@/lib/todotwo/time'

export const dynamic = 'force-dynamic'

const STAFF_ROLES = ['super_admin', 'farm_admin', 'coordinator'] as const

const bodySchema = z.object({ text: z.string().trim().min(3).max(1000) })

/**
 * Turns a sentence into a rule that can be kept.
 *
 * The difference from the assignment console's parser is durability. There,
 * "Robert does no housekeeping" becomes a list of today's housekeeping task
 * ids and is used once. A rule has to still mean something next Tuesday, so
 * anything task-shaped is stored as the LABEL and resolved against that day's
 * work when the round runs.
 *
 * That is why exclude_tasks is converted back: parseConstraints has already
 * resolved the label to ids, so the label is recovered from what those ids
 * have in common. If they share no group label the rule cannot be stored
 * durably and is rejected rather than saved as something that will quietly
 * stop matching tomorrow.
 */
export async function POST(request: NextRequest) {
  if (!isTodoTwoEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const auth = await requireApiRole([...STAFF_ROLES])
  if (!auth.ok) return auth.response

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json(
      { error: 'invalid_request', message: 'Write the rule in a sentence or two.' },
      { status: 400 }
    )
  }

  const db = getTodoTwoClient()
  const from = farmToday()
  const to = addFarmDays(from, 14)

  // A fortnight of work is enough for the model to recognise the names of
  // things without being handed the whole history.
  const [{ data: peopleRows }, { data: taskRows }, { data: seriesRows }] = await Promise.all([
    db
      .from('people')
      .select('id, full_name, preferred_name')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('full_name'),
    db
      .from('tasks_resolved')
      .select('id, title, series_id, project_id')
      .is('parent_task_id', null)
      .gte('due_date', from)
      .lte('due_date', to),
    db.from('task_series').select('id, title'),
  ])

  const seriesTitle = new Map(
    ((seriesRows ?? []) as { id: string; title: string }[]).map((s) => [s.id, s.title])
  )

  const people: RosterPerson[] = (
    (peopleRows ?? []) as { id: string; full_name: string; preferred_name: string | null }[]
  ).map((p) => ({ id: p.id, name: p.preferred_name || p.full_name }))

  const tasksRaw = (taskRows ?? []) as {
    id: string
    title: string | null
    series_id: string | null
  }[]

  const tasks: RosterTask[] = tasksRaw.map((t) => ({
    id: t.id,
    title: t.title ?? 'Untitled',
    groupLabel: t.series_id ? seriesTitle.get(t.series_id) ?? null : null,
  }))

  let result
  try {
    result = await parseConstraints(parsed.text, { people, tasks })
  } catch (error) {
    if (error instanceof AssignmentAiUnavailableError) {
      return NextResponse.json({ error: 'ai_unavailable', message: error.message }, { status: 503 })
    }
    throw error
  }

  const groupOf = new Map(tasks.map((t) => [t.id, t.groupLabel]))
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? 'someone'

  const rules: { kind: string; payload: Record<string, unknown>; label: string }[] = []
  const rejected: string[] = []

  for (const c of result.constraints) {
    switch (c.kind) {
      case 'same_person':
        rules.push({
          kind: 'same_person',
          payload: { labels: c.labels },
          label: `${c.labels.join(' and ')} — the same person`,
        })
        break

      case 'different_people':
        rules.push({
          kind: 'different_people',
          payload: { labelsA: c.labelsA, labelsB: c.labelsB },
          label: `${c.labelsA.join('/')} and ${c.labelsB.join('/')} — different people`,
        })
        break

      case 'unavailable_weekday':
        rules.push({
          kind: 'unavailable_weekday',
          payload: { personId: c.personId, weekdays: c.weekdays },
          label: `${nameOf(c.personId)} is off ${c.weekdays.join(', ')}`,
        })
        break

      case 'max_per_day':
        rules.push({
          kind: 'max_per_day',
          payload: { personId: c.personId, limit: c.limit },
          label: c.personId
            ? `${nameOf(c.personId)} does no more than ${c.limit} a day`
            : `Nobody does more than ${c.limit} a day`,
        })
        break

      case 'exclude_tasks': {
        // Recover the durable label from what the matched tasks share.
        const labels = new Set(
          c.taskIds.map((id) => groupOf.get(id)).filter((g): g is string => Boolean(g))
        )
        if (labels.size !== 1) {
          rejected.push(
            `"${nameOf(c.personId)} does not do those" could not be kept as a rule — the tasks it matched do not share one name, so it would stop matching as soon as the list changed.`
          )
          break
        }
        const label = Array.from(labels)[0]
        rules.push({
          kind: 'exclude_task_group',
          payload: { personId: c.personId, label },
          label: `${nameOf(c.personId)} does no ${label}`,
        })
        break
      }

      case 'only_people':
        // Same problem as exclude_tasks but without a single group to fall
        // back on, and no storable kind for it yet.
        rejected.push(
          'Restricting a task to particular people cannot be kept as a standing rule yet — use the assignment console for that today.'
        )
        break
    }
  }

  return NextResponse.json({
    ok: true,
    summary: result.summary,
    rules,
    rejected,
    unresolved: result.unresolved,
  })
}
