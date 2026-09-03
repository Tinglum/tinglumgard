import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { notificationDedupeKey } from '../../../lib/todotwo/notifications/dedupe'
import {
  type Actor,
  type RlsEnv,
  adminClient,
  anonymousClient,
  createActor,
  destroyActor,
  readRlsEnv,
} from './harness'

/**
 * Announcements, acknowledgements and the outbox, against the real database.
 *
 * The claims worth testing here are the ones a component cannot make: that a
 * Workawayer cannot post a notice, cannot read somebody else's mail, and cannot
 * quietly clear a failed send off their own row; that a draft is invisible
 * until it is published; and that publishing twice does not email the farm
 * twice.
 */

const env: RlsEnv | null = readRlsEnv()
const describeNotifications = env ? describe : describe.skip

describeNotifications('announcements and the notification outbox', () => {
  const e = env as RlsEnv

  let admin: Actor
  let worker: Actor
  let other: Actor

  let publishedId: string
  let draftId: string

  beforeAll(async () => {
    admin = await createActor(e, 'ann-admin', ['farm_admin'])
    worker = await createActor(e, 'ann-worker', ['workawayer'])
    other = await createActor(e, 'ann-other', ['workawayer'])
  })

  afterAll(async () => {
    const db = adminClient(e)
    for (const id of [publishedId, draftId]) {
      if (id) await db.from('announcements').delete().eq('id', id)
    }
    for (const actor of [admin, worker, other]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  // -------------------------------------------------------------------------
  // Writing
  // -------------------------------------------------------------------------

  it('lets an admin publish', async () => {
    const { data, error } = await admin.db
      .from('announcements')
      .insert({
        title: `Vet visit ${Date.now()}`,
        body: 'Be in the barn at eight.',
        urgency: 'important',
        author_person_id: admin.personId,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    publishedId = data!.id as string
  })

  it('lets an admin keep a draft', async () => {
    const { data, error } = await admin.db
      .from('announcements')
      .insert({
        title: `Draft ${Date.now()}`,
        body: 'Not finished yet.',
        author_person_id: admin.personId,
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    draftId = data!.id as string
  })

  it('stops a Workawayer posting a notice', async () => {
    const { error } = await worker.db.from('announcements').insert({
      title: 'Everyone gets the day off',
      body: 'Signed, not the farm manager.',
      published_at: new Date().toISOString(),
    })
    expect(error).toBeTruthy()
  })

  it('stops a Workawayer editing one', async () => {
    const { error } = await worker.db
      .from('announcements')
      .update({ title: 'Cancelled' })
      .eq('id', publishedId)
      .select('id')

    // Either refused outright or reduced to zero rows; both are a denial.
    const { data: unchanged } = await adminClient(e)
      .from('announcements')
      .select('title')
      .eq('id', publishedId)
      .single()

    expect(error !== null || (unchanged!.title as string) !== 'Cancelled').toBe(true)
    expect(unchanged!.title).not.toBe('Cancelled')
  })

  // -------------------------------------------------------------------------
  // Reading
  // -------------------------------------------------------------------------

  it('shows a published notice to a Workawayer', async () => {
    const { data } = await worker.db.from('announcements').select('id').eq('id', publishedId)
    expect(data).toHaveLength(1)
  })

  it('hides a draft from a Workawayer', async () => {
    const { data } = await worker.db.from('announcements').select('id').eq('id', draftId)
    expect(data).toHaveLength(0)
  })

  it('shows the draft to staff', async () => {
    const { data } = await admin.db.from('announcements').select('id').eq('id', draftId)
    expect(data).toHaveLength(1)
  })

  it('gives an anonymous caller nothing', async () => {
    const anon = anonymousClient(e)
    for (const table of ['announcements', 'announcement_acknowledgements', 'notification_outbox']) {
      const { data, error } = await anon.from(table).select('id')
      expect(error !== null || (data ?? []).length === 0, `anon read ${table}`).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Fan-out
  // -------------------------------------------------------------------------

  it('queues one notification per person when a notice is published', async () => {
    const { data } = await adminClient(e)
      .from('notification_outbox')
      .select('person_id, status, attempts, dedupe_key, subject')
      .eq('topic', 'announcement')
      .eq('reference_id', publishedId)

    const rows = (data ?? []) as { person_id: string; status: string; subject: string }[]
    const recipients = rows.map((row) => row.person_id)

    expect(recipients).toContain(worker.personId)
    expect(recipients).toContain(other.personId)
    // The author does not need an email about their own notice.
    expect(recipients).not.toContain(admin.personId)

    for (const row of rows) {
      expect(row.status).toBe('pending')
      // Urgency is carried into the subject line.
      expect(row.subject.startsWith('Important: ')).toBe(true)
    }
  })

  it('builds the same dedupe key in SQL as in TypeScript', async () => {
    const { data, error } = await admin.db.rpc('notification_dedupe_key', {
      p_topic: 'announcement',
      p_reference_id: publishedId,
      p_person_id: worker.personId,
      p_channel: 'email',
    })

    expect(error).toBeNull()
    expect(data).toBe(
      notificationDedupeKey({
        topic: 'announcement',
        referenceId: publishedId,
        personId: worker.personId,
        channel: 'email',
      })
    )
  })

  it('cannot queue the same notification twice', async () => {
    const before = await adminClient(e)
      .from('notification_outbox')
      .select('id')
      .eq('topic', 'announcement')
      .eq('reference_id', publishedId)

    const { data: id, error } = await admin.db.rpc('enqueue_notification', {
      p_person_id: worker.personId,
      p_subject: 'A second copy',
      p_body: 'Should never arrive.',
      p_topic: 'announcement',
      p_reference_id: publishedId,
    })

    expect(error).toBeNull()
    expect(id).toBeTruthy()

    const after = await adminClient(e)
      .from('notification_outbox')
      .select('id, subject')
      .eq('topic', 'announcement')
      .eq('reference_id', publishedId)

    expect((after.data ?? []).length).toBe((before.data ?? []).length)
    // The original text survived; the duplicate did not overwrite it.
    const workerRow = (after.data ?? []).find(
      (row) => (row as { id: string }).id === id
    ) as { subject: string } | undefined
    expect(workerRow?.subject).not.toBe('A second copy')
  })

  it('stops a Workawayer queueing anything', async () => {
    const { error } = await worker.db.rpc('enqueue_notification', {
      p_person_id: other.personId,
      p_subject: 'Please do my chores',
      p_body: 'Thanks.',
      p_topic: 'mischief',
    })
    expect(error).toBeTruthy()
  })

  // -------------------------------------------------------------------------
  // The outbox
  // -------------------------------------------------------------------------

  it('shows a person their own queued mail and nobody else’s', async () => {
    const { data } = await worker.db.from('notification_outbox').select('person_id')
    const people = new Set(((data ?? []) as { person_id: string }[]).map((row) => row.person_id))

    expect(people.has(worker.personId)).toBe(true)
    expect(people.has(other.personId)).toBe(false)
  })

  it('shows staff the whole queue', async () => {
    const { data } = await admin.db
      .from('notification_outbox')
      .select('person_id')
      .eq('reference_id', publishedId)

    const people = new Set(((data ?? []) as { person_id: string }[]).map((row) => row.person_id))
    expect(people.has(worker.personId)).toBe(true)
    expect(people.has(other.personId)).toBe(true)
  })

  it('stops anyone clearing a failed send off their own row', async () => {
    const db = adminClient(e)
    await db
      .from('notification_outbox')
      .update({ status: 'failed', attempts: 5, last_error: 'Resend 403: domain not verified' })
      .eq('person_id', worker.personId)
      .eq('reference_id', publishedId)

    const { error } = await worker.db
      .from('notification_outbox')
      .update({ status: 'sent', last_error: null })
      .eq('person_id', worker.personId)

    const { data: row } = await db
      .from('notification_outbox')
      .select('status, last_error')
      .eq('person_id', worker.personId)
      .eq('reference_id', publishedId)
      .single()

    expect(error !== null || (row!.status as string) === 'failed').toBe(true)
    expect(row!.status).toBe('failed')
    expect(row!.last_error).toBe('Resend 403: domain not verified')
  })

  it('stops a Workawayer deleting mail they were sent', async () => {
    await worker.db.from('notification_outbox').delete().eq('person_id', worker.personId)

    const { data } = await adminClient(e)
      .from('notification_outbox')
      .select('id')
      .eq('person_id', worker.personId)
      .eq('reference_id', publishedId)

    expect((data ?? []).length).toBe(1)
  })

  // -------------------------------------------------------------------------
  // Acknowledgements
  // -------------------------------------------------------------------------

  it('lets a person mark a notice as read', async () => {
    const { error } = await worker.db
      .from('announcement_acknowledgements')
      .insert({ announcement_id: publishedId, person_id: worker.personId })

    expect(error).toBeNull()
  })

  it('refuses a second acknowledgement of the same notice', async () => {
    const { error } = await worker.db
      .from('announcement_acknowledgements')
      .insert({ announcement_id: publishedId, person_id: worker.personId })

    expect(error?.code).toBe('23505')
  })

  it('stops a person acknowledging on somebody else’s behalf', async () => {
    const { error } = await worker.db
      .from('announcement_acknowledgements')
      .insert({ announcement_id: publishedId, person_id: other.personId })

    expect(error).toBeTruthy()
  })

  it('stops an acknowledgement of a draft nobody can see', async () => {
    const { error } = await worker.db
      .from('announcement_acknowledgements')
      .insert({ announcement_id: draftId, person_id: worker.personId })

    expect(error).toBeTruthy()
  })

  it('stops an acknowledgement being taken back', async () => {
    await worker.db
      .from('announcement_acknowledgements')
      .delete()
      .eq('announcement_id', publishedId)
      .eq('person_id', worker.personId)

    const { data } = await adminClient(e)
      .from('announcement_acknowledgements')
      .select('id')
      .eq('announcement_id', publishedId)
      .eq('person_id', worker.personId)

    expect((data ?? []).length).toBe(1)
  })

  it('shows a person their own acknowledgement and not other people’s', async () => {
    await other.db
      .from('announcement_acknowledgements')
      .insert({ announcement_id: publishedId, person_id: other.personId })

    const { data } = await worker.db
      .from('announcement_acknowledgements')
      .select('person_id')
      .eq('announcement_id', publishedId)

    const people = ((data ?? []) as { person_id: string }[]).map((row) => row.person_id)
    expect(people).toEqual([worker.personId])
  })

  it('gives staff the reach of a notice', async () => {
    const { data, error } = await admin.db
      .from('announcement_reach')
      .select('acknowledged_count, notifications_pending, notifications_failed')
      .eq('announcement_id', publishedId)
      .single()

    expect(error).toBeNull()
    expect(Number(data!.acknowledged_count)).toBe(2)
    // One row was forced to failed above; the other is still waiting.
    expect(Number(data!.notifications_failed)).toBe(1)
    expect(Number(data!.notifications_pending)).toBeGreaterThanOrEqual(1)
  })
})
