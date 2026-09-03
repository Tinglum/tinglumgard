import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type Actor, type RlsEnv, adminClient, createActor, destroyActor, readRlsEnv } from './harness'

/**
 * Task-handoff consent, against the real database.
 *
 * The invariant that matters: only the actual holder of a task (from_person_id)
 * — or staff — may accept or decline a handoff addressed to them. A bystander,
 * including the requester (to_person_id) themselves, must not be able to
 * decide it.
 */

const env: RlsEnv | null = readRlsEnv()
const describeHandoff = env ? describe : describe.skip

describeHandoff('task handoff consent', () => {
  const e = env as RlsEnv

  let admin: Actor
  let holder: Actor
  let requester: Actor
  let bystander: Actor

  let seriesId: string
  let taskId: string

  beforeAll(async () => {
    admin = await createActor(e, 'handoff-admin', ['farm_admin'])
    holder = await createActor(e, 'handoff-holder', ['workawayer'])
    requester = await createActor(e, 'handoff-requester', ['workawayer'])
    bystander = await createActor(e, 'handoff-bystander', ['workawayer'])

    const db = adminClient(e)

    const { data: series } = await db
      .from('task_series')
      .insert({
        title: `Handoff fixture ${Date.now()}`,
        rrule: 'RRULE:FREQ=DAILY',
        starts_on: '2030-02-01',
      })
      .select('id')
      .single()
    seriesId = series!.id as string

    const { data: task } = await db
      .from('tasks')
      .insert({
        series_id: seriesId,
        occurrence_date: '2030-02-01',
        due_date: '2030-02-01',
        status: 'unassigned',
      })
      .select('id')
      .single()
    taskId = task!.id as string

    const { error: assignError } = await admin.db.rpc('assign_task', {
      p_task_id: taskId,
      p_person_id: holder.personId,
    })
    expect(assignError).toBeNull()
  })

  afterAll(async () => {
    const db = adminClient(e)
    await db.from('task_handoff_requests').delete().eq('task_id', taskId)
    await db.from('tasks').delete().eq('series_id', seriesId)
    await db.from('task_series').delete().eq('id', seriesId)
    for (const actor of [admin, holder, requester, bystander]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  let handoffId: string

  it('creates a pending handoff request via the RPC (as staff)', async () => {
    const { data, error } = await admin.db.rpc('request_task_handoff', {
      p_task_id: taskId,
      p_to_person_id: requester.personId,
    })
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    handoffId = data as string
  })

  it('stops a random bystander from deciding it', async () => {
    const { error } = await bystander.db.rpc('decide_task_handoff', {
      p_handoff_id: handoffId,
      p_accept: true,
    })
    expect(error).toBeTruthy()
  })

  it('stops the requester (to_person_id) from deciding their own request', async () => {
    const { error } = await requester.db.rpc('decide_task_handoff', {
      p_handoff_id: handoffId,
      p_accept: true,
    })
    expect(error).toBeTruthy()
  })

  it('hides the pending row from a bystander entirely', async () => {
    const { data } = await bystander.db
      .from('task_handoff_requests')
      .select('id')
      .eq('id', handoffId)
      .maybeSingle()
    expect(data).toBeNull()
  })

  it('lets the actual holder (from_person_id) accept it', async () => {
    const { error } = await holder.db.rpc('decide_task_handoff', {
      p_handoff_id: handoffId,
      p_accept: true,
    })
    expect(error).toBeNull()

    const { data: assignment } = await adminClient(e)
      .from('task_assignments')
      .select('person_id')
      .eq('task_id', taskId)
      .is('unassigned_at', null)
      .maybeSingle()
    expect(assignment?.person_id).toBe(requester.personId)

    const { data: request } = await adminClient(e)
      .from('task_handoff_requests')
      .select('status')
      .eq('id', handoffId)
      .maybeSingle()
    expect(request?.status).toBe('accepted')
  })

  it('will not let anyone decide an already-decided request again', async () => {
    const { error } = await holder.db.rpc('decide_task_handoff', {
      p_handoff_id: handoffId,
      p_accept: false,
    })
    expect(error).toBeTruthy()
  })
})
