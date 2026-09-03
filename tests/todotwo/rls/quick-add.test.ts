import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type Actor, type RlsEnv, adminClient, createActor, destroyActor, readRlsEnv } from './harness'

/**
 * todotwo.create_task() — staff-only, generic manual task creation. See
 * supabase/migrations/20260909083000_todotwo_quick_add.sql for the
 * authorization reasoning: this is the second manual task-creation path in
 * the app (after apply_task_template), and it carries the same
 * todotwo.is_staff() gate — a non-staff person must be blocked from creating
 * a task at all, whether or not they name themselves as the assignee.
 */

const env: RlsEnv | null = readRlsEnv()
const describeQuickAdd = env ? describe : describe.skip

describeQuickAdd('quick add / create_task', () => {
  const e = env as RlsEnv

  let staff: Actor
  let worker: Actor
  let projectId: string

  beforeAll(async () => {
    staff = await createActor(e, 'quickadd-staff', ['coordinator'])
    worker = await createActor(e, 'quickadd-worker', ['workawayer'])

    const db = adminClient(e)
    const { data: project } = await db
      .from('projects')
      .insert({ name: `Quick add fixture ${Date.now()}`, slug: `quick-add-fixture-${Date.now()}` })
      .select('id')
      .single()
    projectId = project!.id as string
  })

  afterAll(async () => {
    const db = adminClient(e)
    await db.from('projects').delete().eq('id', projectId)
    for (const actor of [staff, worker]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  it('stops a non-staff person from creating a task at all', async () => {
    const { error } = await worker.db.rpc('create_task', {
      p_title: 'Sneaky task created by a worker',
    })
    expect(error).toBeTruthy()
  })

  it('stops a non-staff person from creating a task even when assigning only themselves', async () => {
    const { error } = await worker.db.rpc('create_task', {
      p_title: 'Self-assigned sneaky task',
      p_assignee_person_id: worker.personId,
    })
    expect(error).toBeTruthy()
  })

  it('lets staff create a minimal task with just a title', async () => {
    const { data: newTaskId, error } = await staff.db.rpc('create_task', {
      p_title: `Staff quick-add task ${Date.now()}`,
    })
    expect(error).toBeNull()
    expect(newTaskId).toBeTruthy()

    const db = adminClient(e)
    await db.from('tasks').delete().eq('id', newTaskId as string)
  })

  it('lets staff create a task with a project, due date, and assignee', async () => {
    const { data: newTaskId, error } = await staff.db.rpc('create_task', {
      p_title: `Staff full quick-add task ${Date.now()}`,
      p_description: 'From the quick-add box',
      p_project_id: projectId,
      p_due_date: '2030-01-01',
      p_assignee_person_id: worker.personId,
    })
    expect(error).toBeNull()
    expect(newTaskId).toBeTruthy()

    const db = adminClient(e)
    const { data: assignments } = await db
      .from('task_assignments')
      .select('person_id')
      .eq('task_id', newTaskId as string)
      .is('unassigned_at', null)
    expect(assignments).toHaveLength(1)
    expect(assignments?.[0]?.person_id).toBe(worker.personId)

    await db.from('task_assignments').delete().eq('task_id', newTaskId as string)
    await db.from('tasks').delete().eq('id', newTaskId as string)
  })

  it('rejects a blank title', async () => {
    const { error } = await staff.db.rpc('create_task', {
      p_title: '   ',
    })
    expect(error).toBeTruthy()
  })
})
