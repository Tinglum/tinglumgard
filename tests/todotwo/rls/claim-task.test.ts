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
 * Claiming free work, against the real database.
 *
 * claim_task exists because assign_task is staff-only and accept_task needs
 * you to already hold the task — so an "Up for grabs" list had nothing behind
 * it. The properties that make it safe to hand to every Workawayer are the
 * ones worth pinning down: it writes only the caller's own name, it will not
 * take work off a colleague, and it will not touch finished work.
 */

const env: RlsEnv | null = readRlsEnv()
const describeClaim = env ? describe : describe.skip

describeClaim('claim_task', () => {
  const e = env as RlsEnv

  let worker: Actor
  let other: Actor
  const taskIds: string[] = []

  async function makeTask(status = 'unassigned'): Promise<string> {
    const db = adminClient(e)
    const { data, error } = await db
      .from('tasks')
      .insert({
        title: `Claim fixture ${Date.now()}-${Math.random()}`,
        status,
        due_date: '2030-06-01',
        // tasks_completed_consistency: a finished status without a finished
        // timestamp is rejected, so a 'completed' fixture has to carry one.
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    taskIds.push(data!.id as string)
    return data!.id as string
  }

  beforeAll(async () => {
    worker = await createActor(e, 'claim-worker', ['workawayer'])
    other = await createActor(e, 'claim-other', ['workawayer'])
  })

  afterAll(async () => {
    const db = adminClient(e)
    if (taskIds.length > 0) {
      await db.from('task_assignments').delete().in('task_id', taskIds)
      await db.from('tasks').delete().in('id', taskIds)
    }
    for (const actor of [worker, other]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  it('puts a Workawayer on a task nobody was holding', async () => {
    const taskId = await makeTask()

    const { error } = await worker.db.rpc('claim_task', { p_task_id: taskId })
    expect(error).toBeNull()

    const { data: assignment } = await adminClient(e)
      .from('task_assignments')
      .select('person_id, role')
      .eq('task_id', taskId)
      .is('unassigned_at', null)
      .maybeSingle()

    expect(assignment?.person_id).toBe(worker.personId)
    expect(assignment?.role).toBe('assignee')

    const { data: task } = await adminClient(e)
      .from('tasks')
      .select('status')
      .eq('id', taskId)
      .maybeSingle()

    expect(task?.status).toBe('assigned')
  })

  it('refuses a task someone else already holds', async () => {
    const taskId = await makeTask()

    const { error: firstError } = await worker.db.rpc('claim_task', { p_task_id: taskId })
    expect(firstError).toBeNull()

    // Whoever reaches for it second is told so, rather than quietly ending up
    // as a second active assignee.
    const { error: secondError } = await other.db.rpc('claim_task', { p_task_id: taskId })
    expect(secondError).toBeTruthy()
    expect(secondError?.message).toMatch(/already has that task/i)

    const { data: assignments } = await adminClient(e)
      .from('task_assignments')
      .select('person_id')
      .eq('task_id', taskId)
      .is('unassigned_at', null)

    expect(assignments).toHaveLength(1)
    expect(assignments?.[0]?.person_id).toBe(worker.personId)
  })

  it('refuses work that is already finished', async () => {
    const taskId = await makeTask('completed')

    const { error } = await worker.db.rpc('claim_task', { p_task_id: taskId })
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/already finished/i)

    const { data: assignments } = await adminClient(e)
      .from('task_assignments')
      .select('id')
      .eq('task_id', taskId)
      .is('unassigned_at', null)

    expect(assignments ?? []).toHaveLength(0)
  })

  it('cannot be aimed at anyone but the caller', async () => {
    // Structural, not a policy check: the function takes only a task id, so
    // there is no parameter through which one person could put another's name
    // on something. Passing a person id is simply not a call it accepts.
    const taskId = await makeTask()

    const { error } = await worker.db.rpc('claim_task', {
      p_task_id: taskId,
      p_person_id: other.personId,
    } as unknown as { p_task_id: string })

    expect(error).toBeTruthy()
  })
})
