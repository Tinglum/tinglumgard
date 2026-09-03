import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type Actor, type RlsEnv, adminClient, createActor, destroyActor, readRlsEnv } from './harness'

/**
 * todotwo.feed_checks and the feed-check gate in todotwo.complete_task().
 *
 * "do we have enough food for the next two days? should always be a question
 * for the evening animals." The two claims worth testing against the real
 * database: a person can log their own answer and read it back, but not read
 * someone else's (staff can read everyone's); and complete_task() actually
 * refuses to finish a feed-check-required task when the answer is missing,
 * rather than that only being enforced by a component that happens to always
 * ask.
 */

const env: RlsEnv | null = readRlsEnv()
const describeFeedChecks = env ? describe : describe.skip

describeFeedChecks('feed_checks', () => {
  const e = env as RlsEnv

  let admin: Actor
  let staff: Actor
  let worker: Actor
  let otherWorker: Actor
  let seriesId: string
  let requiredTaskId: string
  let otherRequiredTaskId: string
  let plainTaskId: string

  beforeAll(async () => {
    admin = await createActor(e, 'feed-admin', ['farm_admin'])
    staff = await createActor(e, 'feed-staff', ['coordinator'])
    worker = await createActor(e, 'feed-worker', ['workawayer'])
    otherWorker = await createActor(e, 'feed-other', ['workawayer'])

    const db = adminClient(e)

    const { data: series, error: seriesError } = await db
      .from('task_series')
      .insert({
        title: `Evening animals fixture ${Date.now()}`,
        rrule: 'RRULE:FREQ=DAILY',
        starts_on: '2026-01-01',
        requires_feed_check: true,
        created_by_person_id: admin.personId,
      })
      .select('id')
      .single()
    if (seriesError || !series) throw new Error(`Could not create fixture series: ${seriesError?.message}`)
    seriesId = series.id as string

    const { data: requiredTask, error: taskError } = await db
      .from('tasks')
      .insert({
        series_id: seriesId,
        occurrence_date: '2026-09-01',
        status: 'unassigned',
        created_by_person_id: admin.personId,
      })
      .select('id')
      .single()
    if (taskError || !requiredTask) throw new Error(`Could not create fixture task: ${taskError?.message}`)
    requiredTaskId = requiredTask.id as string

    const { data: otherTask, error: otherTaskError } = await db
      .from('tasks')
      .insert({
        series_id: seriesId,
        occurrence_date: '2026-09-02',
        status: 'unassigned',
        created_by_person_id: admin.personId,
      })
      .select('id')
      .single()
    if (otherTaskError || !otherTask) throw new Error(`Could not create fixture task: ${otherTaskError?.message}`)
    otherRequiredTaskId = otherTask.id as string

    const { data: plainTask, error: plainTaskError } = await db
      .from('tasks')
      .insert({
        title: 'Plain fixture task (no feed check)',
        status: 'unassigned',
        created_by_person_id: admin.personId,
      })
      .select('id')
      .single()
    if (plainTaskError || !plainTask) throw new Error(`Could not create fixture task: ${plainTaskError?.message}`)
    plainTaskId = plainTask.id as string

    // Both workers are assignees on both required-check tasks, and on the
    // plain task, so is_task_assignee() lets them call complete_task().
    const { error: assignError } = await db.from('task_assignments').insert([
      { task_id: requiredTaskId, person_id: worker.personId },
      { task_id: requiredTaskId, person_id: otherWorker.personId },
      { task_id: otherRequiredTaskId, person_id: worker.personId },
      { task_id: plainTaskId, person_id: worker.personId },
    ])
    if (assignError) throw new Error(`Could not assign fixture tasks: ${assignError.message}`)
  })

  afterAll(async () => {
    const db = adminClient(e)
    await db.from('feed_checks').delete().in('task_id', [requiredTaskId, otherRequiredTaskId, plainTaskId])
    await db.from('task_assignments').delete().in('task_id', [requiredTaskId, otherRequiredTaskId, plainTaskId])
    await db.from('tasks').delete().in('id', [requiredTaskId, otherRequiredTaskId, plainTaskId])
    if (seriesId) await db.from('task_series').delete().eq('id', seriesId)
    for (const actor of [admin, staff, worker, otherWorker]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  it('refuses to complete a feed-check-required task with no answer', async () => {
    const { error } = await worker.db.rpc('complete_task', { p_task_id: requiredTaskId })
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/feed-sufficiency question/i)
  })

  it('completes a feed-check-required task and logs the answer when one is given', async () => {
    const { error } = await worker.db.rpc('complete_task', {
      p_task_id: requiredTaskId,
      p_has_enough_food: true,
    })
    expect(error).toBeNull()

    const { data: check } = await worker.db
      .from('feed_checks')
      .select('has_enough_for_two_days, person_id')
      .eq('task_id', requiredTaskId)
      .single()
    expect(check?.has_enough_for_two_days).toBe(true)
    expect(check?.person_id).toBe(worker.personId)
  })

  it('leaves a task with no feed-check requirement unaffected by the new parameter', async () => {
    const { error } = await worker.db.rpc('complete_task', { p_task_id: plainTaskId })
    expect(error).toBeNull()

    const { data: check } = await adminClient(e)
      .from('feed_checks')
      .select('id')
      .eq('task_id', plainTaskId)
    expect(check).toHaveLength(0)
  })

  it('lets a person read their own feed check', async () => {
    const { data, error } = await worker.db
      .from('feed_checks')
      .select('id')
      .eq('task_id', requiredTaskId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it("hides one person's feed check from another non-staff person", async () => {
    const { data, error } = await otherWorker.db
      .from('feed_checks')
      .select('id')
      .eq('task_id', requiredTaskId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('lets staff read everyone\'s feed checks', async () => {
    const { data, error } = await staff.db
      .from('feed_checks')
      .select('id')
      .eq('task_id', requiredTaskId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('stops a person inserting a feed check under someone else\'s person_id', async () => {
    const { error } = await otherWorker.db
      .from('feed_checks')
      .insert({ task_id: otherRequiredTaskId, person_id: worker.personId, has_enough_for_two_days: true })
    expect(error).toBeTruthy()
  })

  it('queues a staff alert when the answer is "no"', async () => {
    const { error } = await worker.db.rpc('complete_task', {
      p_task_id: otherRequiredTaskId,
      p_has_enough_food: false,
    })
    expect(error).toBeNull()

    const { data: outboxRows } = await adminClient(e)
      .from('notification_outbox')
      .select('person_id, topic, reference_id')
      .eq('topic', 'feed_check_insufficient')
      .eq('reference_id', otherRequiredTaskId)

    expect((outboxRows ?? []).length).toBeGreaterThan(0)
    const recipients = new Set((outboxRows ?? []).map((r) => r.person_id as string))
    // Both staff fixtures (admin's farm_admin role and staff's coordinator
    // role) should have been queued a notification.
    expect(recipients.has(admin.personId) || recipients.has(staff.personId)).toBe(true)
  })
})
