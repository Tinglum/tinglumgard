import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type Actor, type RlsEnv, adminClient, createActor, destroyActor, readRlsEnv } from './harness'

/**
 * Voluntary "swap with me" task offers — task_handoff_requests with
 * direction = 'offer', where the RECIPIENT (to_person_id) is the decider,
 * the reverse of the onboarding-ramp direction ('ramp_transfer') covered by
 * handoff.test.ts.
 *
 * The invariant that matters here: only the actual recipient of an offer
 * (to_person_id) — or staff — may accept or decline it. A bystander,
 * including the person who made the offer (from_person_id) themselves, must
 * not be able to decide it. We also confirm an ordinary person cannot call
 * request_task_handoff() as someone else's from_person_id (i.e. offer away
 * a task they do not currently hold).
 */

const env: RlsEnv | null = readRlsEnv()
const describeSwap = env ? describe : describe.skip

describeSwap('voluntary task swap offers', () => {
  const e = env as RlsEnv

  let admin: Actor
  let holder: Actor
  let recipient: Actor
  let bystander: Actor

  let seriesId: string
  let taskId: string
  let secondTaskId: string

  beforeAll(async () => {
    admin = await createActor(e, 'swap-admin', ['farm_admin'])
    holder = await createActor(e, 'swap-holder', ['workawayer'])
    recipient = await createActor(e, 'swap-recipient', ['workawayer'])
    bystander = await createActor(e, 'swap-bystander', ['workawayer'])

    const db = adminClient(e)

    const { data: series } = await db
      .from('task_series')
      .insert({
        title: `Swap fixture ${Date.now()}`,
        rrule: 'RRULE:FREQ=DAILY',
        starts_on: '2030-03-01',
      })
      .select('id')
      .single()
    seriesId = series!.id as string

    const { data: task } = await db
      .from('tasks')
      .insert({
        series_id: seriesId,
        occurrence_date: '2030-03-01',
        due_date: '2030-03-01',
        status: 'unassigned',
      })
      .select('id')
      .single()
    taskId = task!.id as string

    const { data: task2 } = await db
      .from('tasks')
      .insert({
        series_id: seriesId,
        occurrence_date: '2030-03-02',
        due_date: '2030-03-02',
        status: 'unassigned',
      })
      .select('id')
      .single()
    secondTaskId = task2!.id as string

    const { error: assignError } = await admin.db.rpc('assign_task', {
      p_task_id: taskId,
      p_person_id: holder.personId,
    })
    expect(assignError).toBeNull()

    const { error: assignError2 } = await admin.db.rpc('assign_task', {
      p_task_id: secondTaskId,
      p_person_id: holder.personId,
    })
    expect(assignError2).toBeNull()
  })

  afterAll(async () => {
    const db = adminClient(e)
    await db.from('task_handoff_requests').delete().eq('task_id', taskId)
    await db.from('task_handoff_requests').delete().eq('task_id', secondTaskId)
    await db.from('tasks').delete().eq('series_id', seriesId)
    await db.from('task_series').delete().eq('id', seriesId)
    for (const actor of [admin, holder, recipient, bystander]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  it('stops a bystander from offering away a task they do not hold', async () => {
    const { error } = await bystander.db.rpc('request_task_handoff', {
      p_task_id: secondTaskId,
      p_to_person_id: recipient.personId,
      p_direction: 'offer',
    })
    expect(error).toBeTruthy()
  })

  let offerId: string

  it('lets the actual holder create a voluntary offer', async () => {
    const { data, error } = await holder.db.rpc('request_task_handoff', {
      p_task_id: taskId,
      p_to_person_id: recipient.personId,
      p_direction: 'offer',
    })
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    offerId = data as string
  })

  it('stops a random bystander from deciding it', async () => {
    const { error } = await bystander.db.rpc('decide_task_handoff', {
      p_handoff_id: offerId,
      p_accept: true,
    })
    expect(error).toBeTruthy()
  })

  it('stops the offerer (from_person_id) from deciding their own offer', async () => {
    const { error } = await holder.db.rpc('decide_task_handoff', {
      p_handoff_id: offerId,
      p_accept: true,
    })
    expect(error).toBeTruthy()
  })

  it('hides the pending row from a bystander entirely', async () => {
    const { data } = await bystander.db
      .from('task_handoff_requests')
      .select('id')
      .eq('id', offerId)
      .maybeSingle()
    expect(data).toBeNull()
  })

  it('lets the actual recipient (to_person_id) accept it', async () => {
    const { error } = await recipient.db.rpc('decide_task_handoff', {
      p_handoff_id: offerId,
      p_accept: true,
    })
    expect(error).toBeNull()

    const { data: assignment } = await adminClient(e)
      .from('task_assignments')
      .select('person_id')
      .eq('task_id', taskId)
      .is('unassigned_at', null)
      .maybeSingle()
    expect(assignment?.person_id).toBe(recipient.personId)

    const { data: request } = await adminClient(e)
      .from('task_handoff_requests')
      .select('status, direction')
      .eq('id', offerId)
      .maybeSingle()
    expect(request?.status).toBe('accepted')
    expect(request?.direction).toBe('offer')
  })

  it('will not let anyone decide an already-decided offer again', async () => {
    const { error } = await recipient.db.rpc('decide_task_handoff', {
      p_handoff_id: offerId,
      p_accept: false,
    })
    expect(error).toBeTruthy()
  })

  it('lets the actual holder decline an offer on the other task', async () => {
    const { data, error } = await holder.db.rpc('request_task_handoff', {
      p_task_id: secondTaskId,
      p_to_person_id: recipient.personId,
      p_direction: 'offer',
    })
    expect(error).toBeNull()
    const declineId = data as string

    const { error: declineError } = await recipient.db.rpc('decide_task_handoff', {
      p_handoff_id: declineId,
      p_accept: false,
    })
    expect(declineError).toBeNull()

    const { data: assignment } = await adminClient(e)
      .from('task_assignments')
      .select('person_id')
      .eq('task_id', secondTaskId)
      .is('unassigned_at', null)
      .maybeSingle()
    expect(assignment?.person_id).toBe(holder.personId)
  })
})
