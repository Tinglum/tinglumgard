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
 * Rotation, against the real database.
 *
 * The point of the series model is one text, many days, a different person each
 * day. These assert that it actually happens, that a hand-made assignment is
 * never trampled, and that a Workawayer cannot rota themselves onto anything.
 */

const env: RlsEnv | null = readRlsEnv()
const describeRota = env ? describe : describe.skip

describeRota('rota and assignment', () => {
  const e = env as RlsEnv

  let admin: Actor
  let worker: Actor
  let a: Actor
  let b: Actor

  let seriesId: string
  const taskIds: string[] = []

  beforeAll(async () => {
    admin = await createActor(e, 'rota-admin', ['farm_admin'])
    worker = await createActor(e, 'rota-worker', ['workawayer'])
    a = await createActor(e, 'rota-a', ['workawayer'])
    b = await createActor(e, 'rota-b', ['workawayer'])

    const db = adminClient(e)

    const { data: series } = await db
      .from('task_series')
      .insert({
        title: `Rota fixture ${Date.now()}`,
        rrule: 'RRULE:FREQ=DAILY',
        starts_on: '2030-01-01',
      })
      .select('id')
      .single()

    seriesId = series!.id as string

    // Six days, far in the future so nothing else touches them.
    for (let day = 1; day <= 6; day += 1) {
      const date = `2030-01-0${day}`
      const { data: task } = await db
        .from('tasks')
        .insert({
          series_id: seriesId,
          occurrence_date: date,
          due_date: date,
          status: 'unassigned',
        })
        .select('id')
        .single()
      taskIds.push(task!.id as string)
    }
  })

  afterAll(async () => {
    const db = adminClient(e)
    await db.from('tasks').delete().eq('series_id', seriesId)
    await db.from('task_series').delete().eq('id', seriesId)
    for (const actor of [admin, worker, a, b]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  it('stops a Workawayer setting a rota', async () => {
    const { error } = await worker.db
      .from('series_rota')
      .insert({ series_id: seriesId, person_id: worker.personId, position: 0 })
    expect(error).toBeTruthy()
  })

  it('stops a Workawayer assigning work', async () => {
    const { error } = await worker.db.rpc('assign_task', {
      p_task_id: taskIds[0],
      p_person_id: worker.personId,
    })
    expect(error).toBeTruthy()
  })

  it('rotates people through the days in order', async () => {
    const { error: rotaError } = await admin.db.from('series_rota').insert([
      { series_id: seriesId, person_id: a.personId, position: 0 },
      { series_id: seriesId, person_id: b.personId, position: 1 },
    ])
    expect(rotaError).toBeNull()

    const { data: applied, error } = await admin.db.rpc('apply_rota', {
      p_series_id: seriesId,
      p_from: '2030-01-01',
    })

    expect(error).toBeNull()
    expect(applied).toBe(6)

    const { data: assignments } = await adminClient(e)
      .from('task_assignments')
      .select('task_id, person_id')
      .in('task_id', taskIds)

    const byTask = new Map(
      ((assignments ?? []) as { task_id: string; person_id: string }[]).map((r) => [
        r.task_id,
        r.person_id,
      ])
    )

    // Alternating, in date order.
    expect(taskIds.map((id) => byTask.get(id))).toEqual([
      a.personId, b.personId, a.personId, b.personId, a.personId, b.personId,
    ])
  })

  it('moves the occurrences to assigned', async () => {
    const { data } = await adminClient(e)
      .from('tasks')
      .select('status')
      .in('id', taskIds)

    for (const row of (data ?? []) as { status: string }[]) {
      expect(row.status).toBe('assigned')
    }
  })

  it('leaves a hand-made assignment alone on the next run', async () => {
    // Someone swaps day three by hand.
    const { error: swapError } = await admin.db.rpc('assign_task', {
      p_task_id: taskIds[2],
      p_person_id: b.personId,
    })
    expect(swapError).toBeNull()

    const { data: applied } = await admin.db.rpc('apply_rota', {
      p_series_id: seriesId,
      p_from: '2030-01-01',
    })

    // Nothing to do: every day already has someone.
    expect(applied).toBe(0)

    const { data: assignment } = await adminClient(e)
      .from('task_assignments')
      .select('person_id')
      .eq('task_id', taskIds[2])
      .is('unassigned_at', null)
      .maybeSingle()

    expect(assignment?.person_id).toBe(b.personId)
  })

  it('returns a task to the pool when its assignee is cleared', async () => {
    const { error } = await admin.db.rpc('assign_task', {
      p_task_id: taskIds[0],
      p_person_id: null,
    })
    expect(error).toBeNull()

    const { data: task } = await adminClient(e)
      .from('tasks')
      .select('status')
      .eq('id', taskIds[0])
      .maybeSingle()

    expect(task?.status).toBe('unassigned')
  })

  it('does nothing for a series with an empty rota', async () => {
    const db = adminClient(e)
    const { data: empty } = await db
      .from('task_series')
      .insert({
        title: `Empty rota ${Date.now()}`,
        rrule: 'RRULE:FREQ=DAILY',
        starts_on: '2030-02-01',
      })
      .select('id')
      .single()

    const { data: applied } = await admin.db.rpc('apply_rota', {
      p_series_id: empty!.id as string,
    })

    expect(applied).toBe(0)
    await db.from('task_series').delete().eq('id', empty!.id as string)
  })
})
