import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  type Actor,
  type RlsEnv,
  adminClient,
  createActor,
  destroyActor,
  readRlsEnv,
} from './harness'

/**
 * Clearing the slate, against the real database.
 *
 * Three things have to hold, and only Postgres can prove them: a Workawayer
 * cannot call it at all, a staff call actually releases open future work, and
 * finished work keeps its assignee. That last one is the whole reason the
 * function filters on status — unassigning a completed task would erase the
 * record of who did it.
 */

const env: RlsEnv | null = readRlsEnv()
const describeClear = env ? describe : describe.skip

describeClear('clear_assignments_from', () => {
  const e = env as RlsEnv

  let admin: Actor
  let worker: Actor
  let hand: Actor

  let seriesId: string
  /** Open, due in the future. Should be cleared. */
  let openTaskId: string
  /** Completed, due in the future. Should keep its assignee. */
  let doneTaskId: string

  const FROM = '2031-03-01'

  beforeAll(async () => {
    admin = await createActor(e, 'clear-admin', ['farm_admin'])
    worker = await createActor(e, 'clear-worker', ['workawayer'])
    hand = await createActor(e, 'clear-hand', ['workawayer'])

    const db = adminClient(e)

    const { data: series } = await db
      .from('task_series')
      .insert({
        title: `Clear fixture ${Date.now()}`,
        rrule: 'RRULE:FREQ=DAILY',
        starts_on: FROM,
      })
      .select('id')
      .single()

    seriesId = series!.id as string

    // Far enough into the future that no other fixture or cron run touches it.
    const { data: open } = await db
      .from('tasks')
      .insert({
        series_id: seriesId,
        occurrence_date: '2031-03-02',
        due_date: '2031-03-02',
        status: 'unassigned',
      })
      .select('id')
      .single()
    openTaskId = open!.id as string

    const { data: done } = await db
      .from('tasks')
      .insert({
        series_id: seriesId,
        occurrence_date: '2031-03-03',
        due_date: '2031-03-03',
        status: 'unassigned',
      })
      .select('id')
      .single()
    doneTaskId = done!.id as string

    // Both start with a real assignment, made the ordinary way.
    await admin.db.rpc('assign_task', { p_task_id: openTaskId, p_person_id: hand.personId })
    await admin.db.rpc('assign_task', { p_task_id: doneTaskId, p_person_id: hand.personId })

    // One of them is then finished, so it counts as history. status and
    // completed_at move together — tasks_completed_consistency rejects one
    // without the other.
    const { error: completeError } = await db
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by_person_id: hand.personId,
      })
      .eq('id', doneTaskId)

    if (completeError) throw new Error(`Could not set up the completed task: ${completeError.message}`)
  })

  afterAll(async () => {
    const db = adminClient(e)
    await db.from('tasks').delete().eq('series_id', seriesId)
    await db.from('task_series').delete().eq('id', seriesId)
    for (const actor of [admin, worker, hand]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  it('refuses a Workawayer', async () => {
    const { error } = await worker.db.rpc('clear_assignments_from', { p_from: FROM })
    expect(error).toBeTruthy()
    expect(`${error?.message}`.toLowerCase()).toContain('staff')
  })

  it('leaves the assignment in place after the refused call', async () => {
    const { data } = await adminClient(e)
      .from('task_assignments')
      .select('person_id')
      .eq('task_id', openTaskId)
      .is('unassigned_at', null)
      .maybeSingle()

    expect(data?.person_id).toBe(hand.personId)
  })

  it('clears an open future assignment for staff', async () => {
    const { data: cleared, error } = await admin.db.rpc('clear_assignments_from', { p_from: FROM })

    expect(error).toBeNull()
    expect(typeof cleared).toBe('number')
    expect(cleared as number).toBeGreaterThanOrEqual(1)

    const db = adminClient(e)

    const { data: active } = await db
      .from('task_assignments')
      .select('id')
      .eq('task_id', openTaskId)
      .is('unassigned_at', null)

    expect(active ?? []).toHaveLength(0)

    const { data: task } = await db
      .from('tasks')
      .select('status')
      .eq('id', openTaskId)
      .maybeSingle()

    expect(task?.status).toBe('unassigned')
  })

  it('deletes nothing — the task and its assignment row both survive', async () => {
    const db = adminClient(e)

    const { data: task } = await db.from('tasks').select('id').eq('id', openTaskId).maybeSingle()
    expect(task?.id).toBe(openTaskId)

    const { data: history } = await db
      .from('task_assignments')
      .select('id, unassigned_at')
      .eq('task_id', openTaskId)

    expect((history ?? []).length).toBeGreaterThanOrEqual(1)
    for (const row of (history ?? []) as { unassigned_at: string | null }[]) {
      expect(row.unassigned_at).not.toBeNull()
    }
  })

  it('leaves a completed task alone', async () => {
    const db = adminClient(e)

    const { data: assignment } = await db
      .from('task_assignments')
      .select('person_id')
      .eq('task_id', doneTaskId)
      .is('unassigned_at', null)
      .maybeSingle()

    expect(assignment?.person_id).toBe(hand.personId)

    const { data: task } = await db
      .from('tasks')
      .select('status')
      .eq('id', doneTaskId)
      .maybeSingle()

    expect(task?.status).toBe('completed')
  })

  it('is a no-op on a second run', async () => {
    const { data: cleared, error } = await admin.db.rpc('clear_assignments_from', { p_from: FROM })

    expect(error).toBeNull()
    expect(cleared).toBe(0)
  })
})
