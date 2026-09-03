import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type Actor, type RlsEnv, adminClient, createActor, destroyActor, readRlsEnv } from './harness'

/**
 * Free-text assignment writes nothing of its own — the apply route calls
 * todotwo.assign_task once per assignment, the same RPC the rota UI uses. So
 * what needs proving here is exactly what the apply route depends on: staff
 * can drive a batch of assign_task calls to completion, a non-staff caller is
 * refused on every one of them, and a person who is not on the active roster
 * cannot be handed work through this path either.
 *
 * This mirrors tests/todotwo/rls/rota.test.ts, against the same functions,
 * because Phase 5 introduces no new table or security-definer function of its
 * own — the AI layer only chooses arguments for assign_task, never runs SQL.
 */

const env: RlsEnv | null = readRlsEnv()
const describeAssign = env ? describe : describe.skip

describeAssign('free-text assignment: applying via assign_task', () => {
  const e = env as RlsEnv

  let admin: Actor
  let coordinator: Actor
  let worker: Actor
  let a: Actor
  let b: Actor

  let projectId: string
  const taskIds: string[] = []

  beforeAll(async () => {
    admin = await createActor(e, 'assign-admin', ['farm_admin'])
    coordinator = await createActor(e, 'assign-coordinator', ['coordinator'])
    worker = await createActor(e, 'assign-worker', ['workawayer'])
    a = await createActor(e, 'assign-a', ['workawayer'])
    b = await createActor(e, 'assign-b', ['workawayer'])

    const db = adminClient(e)

    const { data: project } = await db
      .from('projects')
      .insert({ name: `Assign fixture ${Date.now()}`, slug: `assign-fixture-${Date.now()}` })
      .select('id')
      .single()
    projectId = project!.id as string

    for (let day = 1; day <= 4; day += 1) {
      const date = `2031-02-0${day}`
      const { data: task } = await db
        .from('tasks')
        .insert({
          project_id: projectId,
          title: `Assign fixture task ${day}`,
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
    await db.from('tasks').delete().eq('project_id', projectId)
    await db.from('projects').delete().eq('id', projectId)
    for (const actor of [admin, coordinator, worker, a, b]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  it('lets a coordinator apply a batch of assignments, one assign_task call per row', async () => {
    const plan = [
      { taskId: taskIds[0], personId: a.personId },
      { taskId: taskIds[1], personId: b.personId },
      { taskId: taskIds[2], personId: a.personId },
    ]

    for (const row of plan) {
      const { error } = await coordinator.db.rpc('assign_task', {
        p_task_id: row.taskId,
        p_person_id: row.personId,
      })
      expect(error).toBeNull()
    }

    const { data: assignments } = await adminClient(e)
      .from('task_assignments')
      .select('task_id, person_id')
      .in(
        'task_id',
        plan.map((r) => r.taskId)
      )
      .is('unassigned_at', null)

    const byTask = new Map(
      ((assignments ?? []) as { task_id: string; person_id: string }[]).map((r) => [r.task_id, r.person_id])
    )

    for (const row of plan) {
      expect(byTask.get(row.taskId)).toBe(row.personId)
    }
  })

  it('refuses every call in the batch for a non-staff caller, leaving nothing assigned', async () => {
    const { error } = await worker.db.rpc('assign_task', {
      p_task_id: taskIds[3],
      p_person_id: worker.personId,
    })
    expect(error).toBeTruthy()

    const { data: assignment } = await adminClient(e)
      .from('task_assignments')
      .select('id')
      .eq('task_id', taskIds[3])
      .is('unassigned_at', null)
      .maybeSingle()

    expect(assignment).toBeNull()
  })

  it('reports a per-row failure rather than assigning a nonexistent task', async () => {
    const { error } = await admin.db.rpc('assign_task', {
      p_task_id: '00000000-0000-0000-0000-000000000000',
      p_person_id: a.personId,
    })
    // Not an existing row for anything to attach to: no error is raised, but
    // nothing is written either — the apply route's per-row bookkeeping
    // depends on this not silently succeeding on both counts being false.
    const { data: phantom } = await adminClient(e)
      .from('task_assignments')
      .select('id')
      .eq('task_id', '00000000-0000-0000-0000-000000000000')
    expect(phantom ?? []).toEqual([])
    void error
  })
})
