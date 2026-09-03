import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type Actor, type RlsEnv, adminClient, anonymousClient, createActor, destroyActor, readRlsEnv } from './harness'

/**
 * todotwo.task_private_notes, against the real database.
 *
 * This is the one table in TodoTwo where staff deliberately have no override —
 * a private scratchpad stays private even from a farm_admin. The claim worth
 * testing here is exactly that: not just "another Workawayer can't read it"
 * (unsurprising) but "an admin can't either" (the actual point of the
 * feature), because a hidden button would never catch a missing is_staff()
 * bypass that a component simply doesn't render.
 */

const env: RlsEnv | null = readRlsEnv()
const describeNotes = env ? describe : describe.skip

describeNotes('task_private_notes', () => {
  const e = env as RlsEnv

  let admin: Actor
  let owner: Actor
  let other: Actor
  let taskId: string
  let noteId: string

  beforeAll(async () => {
    admin = await createActor(e, 'note-admin', ['farm_admin'])
    owner = await createActor(e, 'note-owner', ['workawayer'])
    other = await createActor(e, 'note-other', ['workawayer'])

    const db = adminClient(e)
    const { data: task, error } = await db
      .from('tasks')
      .insert({
        title: `Private note fixture ${Date.now()}`,
        status: 'unassigned',
        created_by_person_id: admin.personId,
      })
      .select('id')
      .single()

    if (error || !task) throw new Error(`Could not create fixture task: ${error?.message}`)
    taskId = task.id as string
  })

  afterAll(async () => {
    const db = adminClient(e)
    if (taskId) await db.from('tasks').delete().eq('id', taskId)
    for (const actor of [admin, owner, other]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  it('lets the owner create their own note', async () => {
    const { data, error } = await owner.db
      .from('task_private_notes')
      .insert({ task_id: taskId, person_id: owner.personId, note: 'ask Amber how she likes this done' })
      .select('id')
      .single()

    expect(error).toBeNull()
    noteId = data!.id as string
  })

  it('lets the owner read their own note', async () => {
    const { data, error } = await owner.db.from('task_private_notes').select('note').eq('id', noteId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('hides the note from another Workawayer', async () => {
    const { data, error } = await other.db.from('task_private_notes').select('id').eq('id', noteId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('hides the note from a farm_admin — no staff override on this table', async () => {
    const { data, error } = await admin.db.from('task_private_notes').select('id').eq('id', noteId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('stops another Workawayer inserting a note as someone else', async () => {
    const { error } = await other.db
      .from('task_private_notes')
      .insert({ task_id: taskId, person_id: owner.personId, note: 'sneaky' })
    expect(error).toBeTruthy()
  })

  it('stops staff inserting a note on someone else\'s behalf', async () => {
    const { error } = await admin.db
      .from('task_private_notes')
      .insert({ task_id: taskId, person_id: owner.personId, note: 'staff snooping' })
    expect(error).toBeTruthy()
  })

  it('stops another Workawayer updating the note', async () => {
    const { error } = await other.db
      .from('task_private_notes')
      .update({ note: 'overwritten' })
      .eq('id', noteId)
      .select('id')

    const { data: unchanged } = await adminClient(e)
      .from('task_private_notes')
      .select('note')
      .eq('id', noteId)
      .single()

    expect(error !== null || unchanged!.note !== 'overwritten').toBe(true)
  })

  it('stops staff deleting the note', async () => {
    await admin.db.from('task_private_notes').delete().eq('id', noteId)

    const { data } = await adminClient(e).from('task_private_notes').select('id').eq('id', noteId)
    expect(data).toHaveLength(1)
  })

  it('lets the owner allow only one note per task via the unique constraint', async () => {
    const { error } = await owner.db
      .from('task_private_notes')
      .insert({ task_id: taskId, person_id: owner.personId, note: 'a second note' })
    expect(error).toBeTruthy()
  })

  it('lets the owner edit their note in place', async () => {
    const { error } = await owner.db
      .from('task_private_notes')
      .update({ note: 'updated note' })
      .eq('id', noteId)

    expect(error).toBeNull()

    const { data } = await owner.db.from('task_private_notes').select('note').eq('id', noteId).single()
    expect(data?.note).toBe('updated note')
  })

  it('lets the owner delete their own note', async () => {
    const { error } = await owner.db.from('task_private_notes').delete().eq('id', noteId)
    expect(error).toBeNull()

    const { data } = await adminClient(e).from('task_private_notes').select('id').eq('id', noteId)
    expect(data).toHaveLength(0)
  })

  it('gives an anonymous caller nothing', async () => {
    const anon = anonymousClient(e)
    const { data, error } = await anon.from('task_private_notes').select('id')
    expect(error !== null || (data ?? []).length === 0).toBe(true)
  })
})
