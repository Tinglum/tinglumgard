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
 * Time off and skills, against the real database. The point of these tests is
 * the same as rota.test.ts: hiding a button is not security, so these assert
 * what Postgres actually enforces, not what the UI happens to render.
 */

const env: RlsEnv | null = readRlsEnv()
const describeIt = env ? describe : describe.skip

describeIt('availability and skills RLS', () => {
  const e = env as RlsEnv

  let admin: Actor
  let worker: Actor
  let otherWorker: Actor

  let skillId: string
  const skillSlug = `test-skill-${Date.now()}`

  beforeAll(async () => {
    admin = await createActor(e, 'avail-admin', ['farm_admin'])
    worker = await createActor(e, 'avail-worker', ['workawayer'])
    otherWorker = await createActor(e, 'avail-other', ['workawayer'])

    const db = adminClient(e)
    const { data: skill, error } = await db
      .from('skills')
      .insert({ name: 'Test skill', slug: skillSlug, category: 'test' })
      .select('id')
      .single()
    if (error) throw error
    skillId = skill!.id as string
  })

  afterAll(async () => {
    const db = adminClient(e)
    await db.from('person_skills').delete().eq('skill_id', skillId)
    await db.from('time_off_requests').delete().eq('person_id', worker.personId)
    await db.from('time_off_requests').delete().eq('person_id', otherWorker.personId)
    await db.from('skills').delete().eq('id', skillId)
    for (const actor of [admin, worker, otherWorker]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  describe('time off', () => {
    it('lets a Workawayer create their own pending request', async () => {
      const { error } = await worker.db.from('time_off_requests').insert({
        person_id: worker.personId,
        start_date: '2030-03-01',
        end_date: '2030-03-02',
        kind: 'day_off',
      })
      expect(error).toBeNull()
    })

    it('stops a Workawayer creating a request for someone else', async () => {
      const { error } = await worker.db.from('time_off_requests').insert({
        person_id: otherWorker.personId,
        start_date: '2030-03-05',
        end_date: '2030-03-05',
        kind: 'day_off',
      })
      expect(error).toBeTruthy()
    })

    it('stops a Workawayer creating an already-approved request', async () => {
      const { error } = await worker.db.from('time_off_requests').insert({
        person_id: worker.personId,
        start_date: '2030-03-06',
        end_date: '2030-03-06',
        kind: 'day_off',
        status: 'approved',
      })
      expect(error).toBeTruthy()
    })

    it("hides one Workawayer's requests from another", async () => {
      const { data } = await otherWorker.db
        .from('time_off_requests')
        .select('id')
        .eq('person_id', worker.personId)
      expect(data ?? []).toEqual([])
    })

    it('lets staff see every request', async () => {
      const { data, error } = await admin.db
        .from('time_off_requests')
        .select('id')
        .eq('person_id', worker.personId)
      expect(error).toBeNull()
      expect((data ?? []).length).toBeGreaterThan(0)
    })

    it('stops a Workawayer approving their own request directly', async () => {
      const { data: rows } = await adminClient(e)
        .from('time_off_requests')
        .select('id')
        .eq('person_id', worker.personId)
        .eq('status', 'pending')
        .limit(1)
      const id = rows?.[0]?.id as string

      const { error } = await worker.db
        .from('time_off_requests')
        .update({ status: 'approved' })
        .eq('id', id)
      // No UPDATE grant exists at all for this table, so this must fail.
      expect(error).toBeTruthy()
    })

    it('stops a Workawayer calling decide_time_off', async () => {
      const { data: rows } = await adminClient(e)
        .from('time_off_requests')
        .select('id')
        .eq('person_id', worker.personId)
        .eq('status', 'pending')
        .limit(1)
      const id = rows?.[0]?.id as string

      const { error } = await worker.db.rpc('decide_time_off', {
        p_request_id: id,
        p_decision: 'approved',
      })
      expect(error).toBeTruthy()
    })

    it('lets staff approve through decide_time_off, and it sticks', async () => {
      const { data: rows } = await adminClient(e)
        .from('time_off_requests')
        .select('id')
        .eq('person_id', worker.personId)
        .eq('status', 'pending')
        .limit(1)
      const id = rows?.[0]?.id as string

      const { error } = await admin.db.rpc('decide_time_off', {
        p_request_id: id,
        p_decision: 'approved',
      })
      expect(error).toBeNull()

      const { data: after } = await adminClient(e)
        .from('time_off_requests')
        .select('status, decided_by_person_id')
        .eq('id', id)
        .single()

      expect(after?.status).toBe('approved')
      expect(after?.decided_by_person_id).toBe(admin.personId)
    })

    it('refuses to decide an already-decided request twice', async () => {
      const { data: rows } = await adminClient(e)
        .from('time_off_requests')
        .select('id')
        .eq('person_id', worker.personId)
        .eq('status', 'approved')
        .limit(1)
      const id = rows?.[0]?.id as string

      const { error } = await admin.db.rpc('decide_time_off', {
        p_request_id: id,
        p_decision: 'declined',
      })
      expect(error).toBeTruthy()
    })

    it('lets a Workawayer withdraw their own pending request', async () => {
      const { data: created } = await worker.db
        .from('time_off_requests')
        .insert({
          person_id: worker.personId,
          start_date: '2030-04-01',
          end_date: '2030-04-01',
          kind: 'day_off',
        })
        .select('id')
        .single()

      const { error } = await worker.db.from('time_off_requests').delete().eq('id', created!.id)
      expect(error).toBeNull()
    })
  })

  describe('skills', () => {
    it('lets anyone signed in read the catalogue', async () => {
      const { data, error } = await worker.db.from('skills').select('id').eq('id', skillId)
      expect(error).toBeNull()
      expect(data?.length).toBe(1)
    })

    it('stops a Workawayer editing the catalogue', async () => {
      // RLS makes this match zero rows rather than raise a Postgres error, so
      // PostgREST reports { error: null, data: [] } even though the write was
      // blocked. The real assertion is that the catalogue is unchanged.
      const { error, data } = await worker.db
        .from('skills')
        .update({ name: 'Hacked' })
        .eq('id', skillId)
        .select('id')
      expect(error).toBeNull()
      expect(data).toEqual([])

      const { data: after } = await adminClient(e)
        .from('skills')
        .select('name')
        .eq('id', skillId)
        .single()
      expect(after?.name).not.toBe('Hacked')
    })

    it('lets a Workawayer claim a skill for themselves', async () => {
      const { error } = await worker.db.rpc('claim_skill', {
        p_skill_id: skillId,
        p_claimed_level: 'competent',
      })
      expect(error).toBeNull()

      const { data } = await adminClient(e)
        .from('person_skills')
        .select('claimed_level, admin_verified_level')
        .eq('person_id', worker.personId)
        .eq('skill_id', skillId)
        .single()

      expect(data?.claimed_level).toBe('competent')
      expect(data?.admin_verified_level).toBeNull()
    })

    it('stops a Workawayer verifying their own claim', async () => {
      const { error } = await worker.db.rpc('set_skill_verification', {
        p_person_id: worker.personId,
        p_skill_id: skillId,
        p_verified_level: 'expert',
        p_authorized_unsupervised: true,
      })
      expect(error).toBeTruthy()
    })

    it('stops a Workawayer writing admin_verified_level by a direct update', async () => {
      // Same RLS shape as above: zero rows match, so PostgREST reports success
      // with no rows rather than an error. The database state is the proof.
      const { error, data: updated } = await worker.db
        .from('person_skills')
        .update({ admin_verified_level: 'expert' })
        .eq('person_id', worker.personId)
        .eq('skill_id', skillId)
        .select('id')
      expect(error).toBeNull()
      expect(updated).toEqual([])

      const { data } = await adminClient(e)
        .from('person_skills')
        .select('admin_verified_level')
        .eq('person_id', worker.personId)
        .eq('skill_id', skillId)
        .single()
      expect(data?.admin_verified_level).toBeNull()
    })

    it('lets staff verify the claim, and it does not touch the claimed level', async () => {
      const { error } = await admin.db.rpc('set_skill_verification', {
        p_person_id: worker.personId,
        p_skill_id: skillId,
        p_verified_level: 'proficient',
        p_authorized_unsupervised: true,
      })
      expect(error).toBeNull()

      const { data } = await adminClient(e)
        .from('person_skills')
        .select('claimed_level, admin_verified_level, authorized_unsupervised')
        .eq('person_id', worker.personId)
        .eq('skill_id', skillId)
        .single()

      expect(data?.claimed_level).toBe('competent')
      expect(data?.admin_verified_level).toBe('proficient')
      expect(data?.authorized_unsupervised).toBe(true)
    })

    it("hides one Workawayer's skill rows from another", async () => {
      const { data } = await otherWorker.db
        .from('person_skills')
        .select('id')
        .eq('person_id', worker.personId)
      expect(data ?? []).toEqual([])
    })

    it('lets staff see every person_skills row', async () => {
      const { data, error } = await admin.db
        .from('person_skills')
        .select('id')
        .eq('person_id', worker.personId)
      expect(error).toBeNull()
      expect((data ?? []).length).toBeGreaterThan(0)
    })
  })
})
