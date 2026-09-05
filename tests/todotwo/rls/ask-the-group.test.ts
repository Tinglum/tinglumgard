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
 * Asking the group, against the real database.
 *
 * The properties worth pinning down are the ones a Workawayer would be hurt
 * by if they broke: you can only hand on your own work, only one person can
 * end up with it, and asking does not quietly stop it being yours in the
 * meantime.
 */

const env: RlsEnv | null = readRlsEnv()
const describeAsk = env ? describe : describe.skip

describeAsk('asking the group to take a task', () => {
  const e = env as RlsEnv

  let owner: Actor
  let helper: Actor
  let bystander: Actor
  const taskIds: string[] = []

  async function makeTaskFor(personId: string): Promise<string> {
    const db = adminClient(e)
    const { data, error } = await db
      .from('tasks')
      .insert({ title: `Ask fixture ${Date.now()}-${Math.random()}`, status: 'assigned', due_date: '2030-07-01' })
      .select('id')
      .single()
    if (error) throw new Error(error.message)

    const id = data!.id as string
    taskIds.push(id)
    await db.from('task_assignments').insert({ task_id: id, person_id: personId, role: 'assignee' })
    return id
  }

  beforeAll(async () => {
    owner = await createActor(e, 'ask-owner', ['workawayer'])
    helper = await createActor(e, 'ask-helper', ['workawayer'])
    bystander = await createActor(e, 'ask-bystander', ['workawayer'])
  })

  afterAll(async () => {
    const db = adminClient(e)
    if (taskIds.length > 0) {
      await db.from('task_help_requests').delete().in('task_id', taskIds)
      await db.from('task_assignments').delete().in('task_id', taskIds)
      await db.from('tasks').delete().in('id', taskIds)
    }
    for (const actor of [owner, helper, bystander]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  it('lets the holder ask, and leaves the task theirs until somebody takes it', async () => {
    const taskId = await makeTaskFor(owner.personId)

    const { data: requestId, error } = await owner.db.rpc('ask_for_help', {
      p_task_id: taskId,
      p_note: 'Back late, can anyone cover?',
    })
    expect(error).toBeNull()
    expect(requestId).toBeTruthy()

    // Still theirs: asking is not the same as dropping it.
    const { data: assignment } = await adminClient(e)
      .from('task_assignments')
      .select('person_id')
      .eq('task_id', taskId)
      .is('unassigned_at', null)
      .maybeSingle()
    expect(assignment?.person_id).toBe(owner.personId)
  })

  it('refuses to let somebody hand on work that is not theirs', async () => {
    const taskId = await makeTaskFor(owner.personId)

    const { error } = await bystander.db.rpc('ask_for_help', { p_task_id: taskId })
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/not yours/i)
  })

  it('shows the ask to everyone, which is the point of asking the group', async () => {
    const taskId = await makeTaskFor(owner.personId)
    await owner.db.rpc('ask_for_help', { p_task_id: taskId })

    const { data, error } = await bystander.db
      .from('task_help_requests')
      .select('id, status')
      .eq('task_id', taskId)
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(1)
  })

  it('moves the task when somebody takes it', async () => {
    const taskId = await makeTaskFor(owner.personId)
    const { data: requestId } = await owner.db.rpc('ask_for_help', { p_task_id: taskId })

    const { error } = await helper.db.rpc('take_over_task', { p_request_id: requestId })
    expect(error).toBeNull()

    const { data: assignments } = await adminClient(e)
      .from('task_assignments')
      .select('person_id')
      .eq('task_id', taskId)
      .is('unassigned_at', null)

    expect(assignments ?? []).toHaveLength(1)
    expect(assignments?.[0]?.person_id).toBe(helper.personId)
  })

  it('only lets one person take it', async () => {
    const taskId = await makeTaskFor(owner.personId)
    const { data: requestId } = await owner.db.rpc('ask_for_help', { p_task_id: taskId })

    const { error: firstError } = await helper.db.rpc('take_over_task', { p_request_id: requestId })
    expect(firstError).toBeNull()

    const { error: secondError } = await bystander.db.rpc('take_over_task', {
      p_request_id: requestId,
    })
    expect(secondError).toBeTruthy()
    expect(secondError?.message).toMatch(/got there first/i)

    const { data: assignments } = await adminClient(e)
      .from('task_assignments')
      .select('person_id')
      .eq('task_id', taskId)
      .is('unassigned_at', null)
    expect(assignments ?? []).toHaveLength(1)
  })

  it('will not let the asker answer their own ask', async () => {
    const taskId = await makeTaskFor(owner.personId)
    const { data: requestId } = await owner.db.rpc('ask_for_help', { p_task_id: taskId })

    const { error } = await owner.db.rpc('take_over_task', { p_request_id: requestId })
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/your own task/i)
  })

  it('lets the asker withdraw, but not a bystander', async () => {
    const taskId = await makeTaskFor(owner.personId)
    const { data: requestId } = await owner.db.rpc('ask_for_help', { p_task_id: taskId })

    const { error: nope } = await bystander.db.rpc('withdraw_help_request', {
      p_request_id: requestId,
    })
    expect(nope).toBeTruthy()

    const { error: fine } = await owner.db.rpc('withdraw_help_request', {
      p_request_id: requestId,
    })
    expect(fine).toBeNull()
  })
})
