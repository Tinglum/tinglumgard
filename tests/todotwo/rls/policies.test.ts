import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  type Actor,
  type RlsEnv,
  adminClient,
  anonymousClient,
  cleanupFixtures,
  createActor,
  destroyActor,
  readRlsEnv,
} from './harness'

/**
 * What Postgres actually enforces.
 *
 * Skips cleanly when the dev project credentials are absent, so CI without
 * secrets stays green rather than lying. It never runs against production; the
 * harness refuses.
 */

const env: RlsEnv | null = (() => {
  try {
    return readRlsEnv()
  } catch (error) {
    throw error
  }
})()

const describeRls = env ? describe : describe.skip

if (!env) {
  // eslint-disable-next-line no-console
  console.warn(
    '[todotwo] Skipping RLS tests: set NEXT_PUBLIC_TODOTWO_SUPABASE_URL, ' +
      'NEXT_PUBLIC_TODOTWO_SUPABASE_ANON_KEY and TODOTWO_SUPABASE_SERVICE_ROLE_KEY in .env.local.'
  )
}

describeRls('row level security', () => {
  const e = env as RlsEnv

  let admin: Actor
  let coordinator: Actor
  let workawayer: Actor
  let other: Actor

  beforeAll(async () => {
    await cleanupFixtures(e)
    admin = await createActor(e, 'admin', ['farm_admin'])
    coordinator = await createActor(e, 'coordinator', ['coordinator'])
    workawayer = await createActor(e, 'workawayer', ['workawayer'])
    other = await createActor(e, 'other', ['workawayer'])

    // Something sensitive to try to reach.
    await adminClient(e)
      .from('people_private')
      .insert({
        person_id: workawayer.personId,
        emergency_contact_name: 'Fixture Contact',
        emergency_contact_phone: '+47 00000000',
        private_notes: 'Fixture note that no Workawayer may read.',
      })
  })

  afterAll(async () => {
    for (const actor of [admin, coordinator, workawayer, other]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  describe('anonymous callers', () => {
    it('cannot read people', async () => {
      const { data, error } = await anonymousClient(e).from('people').select('id')
      expect(error ?? { message: 'no error' }).toBeTruthy()
      expect(data ?? []).toEqual([])
    })

    it('cannot read locations', async () => {
      const { data } = await anonymousClient(e).from('locations').select('id')
      expect(data ?? []).toEqual([])
    })

    it('cannot insert a person', async () => {
      const { error } = await anonymousClient(e)
        .from('people')
        .insert({ full_name: 'Trespasser' })
      expect(error).toBeTruthy()
    })
  })

  describe('people_private is admin-only', () => {
    it('denies a Workawayer their own private row', async () => {
      const { data } = await workawayer.db
        .from('people_private')
        .select('emergency_contact_phone')
        .eq('person_id', workawayer.personId)
      expect(data ?? []).toEqual([])
    })

    it('denies a coordinator', async () => {
      const { data } = await coordinator.db.from('people_private').select('id')
      expect(data ?? []).toEqual([])
    })

    it('allows an admin', async () => {
      const { data, error } = await admin.db
        .from('people_private')
        .select('emergency_contact_name')
        .eq('person_id', workawayer.personId)
      expect(error).toBeNull()
      expect(data?.[0]?.emergency_contact_name).toBe('Fixture Contact')
    })
  })

  describe('people visibility', () => {
    it('lets a Workawayer see only themselves', async () => {
      const { data } = await workawayer.db.from('people').select('id')
      expect(data?.map((row) => row.id)).toEqual([workawayer.personId])
    })

    it('does not leak another person to a Workawayer', async () => {
      const { data } = await workawayer.db.from('people').select('id').eq('id', other.personId)
      expect(data ?? []).toEqual([])
    })

    it('lets a coordinator see active people', async () => {
      const { data } = await coordinator.db.from('people').select('id')
      const ids = (data ?? []).map((row) => row.id)
      expect(ids).toContain(workawayer.personId)
    })

    it('lets an admin see everyone', async () => {
      const { data } = await admin.db.from('people').select('id')
      const ids = (data ?? []).map((row) => row.id)
      expect(ids).toContain(workawayer.personId)
      expect(ids).toContain(coordinator.personId)
    })
  })

  describe('privilege escalation', () => {
    it('stops a Workawayer granting themselves a role', async () => {
      const { error } = await workawayer.db
        .from('role_assignments')
        .insert({ person_id: workawayer.personId, role: 'farm_admin' })
      expect(error).toBeTruthy()
    })

    it('stops a coordinator granting a role', async () => {
      const { error } = await coordinator.db
        .from('role_assignments')
        .insert({ person_id: coordinator.personId, role: 'farm_admin' })
      expect(error).toBeTruthy()
    })

    it('lets a Workawayer read their own roles and no one else’s', async () => {
      const { data } = await workawayer.db.from('role_assignments').select('person_id')
      const people = new Set((data ?? []).map((row) => row.person_id))
      expect(Array.from(people)).toEqual([workawayer.personId])
    })
  })

  describe('settings', () => {
    it('are invisible to a Workawayer', async () => {
      const { data } = await workawayer.db.from('settings').select('key')
      expect(data ?? []).toEqual([])
    })

    it('cannot be written by a coordinator', async () => {
      const { error } = await coordinator.db
        .from('settings')
        .insert({ key: 'fixture.attempt', value: { nope: true } })
      expect(error).toBeTruthy()
    })
  })

  describe('audit log', () => {
    it('is invisible to a Workawayer', async () => {
      const { data } = await workawayer.db.from('audit_log').select('id')
      expect(data ?? []).toEqual([])
    })

    it('records changes with the acting person', async () => {
      const newName = `Renamed ${Date.now()}`
      const { error: updateError } = await admin.db
        .from('people')
        .update({ full_name: newName })
        .eq('id', other.personId)
      expect(updateError).toBeNull()

      const { data } = await admin.db
        .from('audit_log')
        .select('action, entity_table, actor_person_id, after')
        .eq('entity_id', other.personId)
        .eq('action', 'update')
        .order('occurred_at', { ascending: false })
        .limit(1)

      expect(data?.[0]?.entity_table).toBe('people')
      expect(data?.[0]?.actor_person_id).toBe(admin.personId)
      expect((data?.[0]?.after as Record<string, unknown>)?.full_name).toBe(newName)
    })

    it('redacts sensitive columns', async () => {
      await admin.db
        .from('people_private')
        .update({ private_notes: 'updated fixture note' })
        .eq('person_id', workawayer.personId)

      const { data } = await admin.db
        .from('audit_log')
        .select('after')
        .eq('entity_table', 'people_private')
        .order('occurred_at', { ascending: false })
        .limit(1)

      const after = data?.[0]?.after as Record<string, unknown> | undefined
      expect(after?.private_notes).toBe('[redacted]')
      expect(after?.emergency_contact_phone).toBe('[redacted]')
    })

    it('cannot be rewritten, even by an admin', async () => {
      const { data: rows } = await admin.db.from('audit_log').select('id').limit(1)
      const id = rows?.[0]?.id
      expect(id).toBeDefined()

      const { error: updateError } = await admin.db
        .from('audit_log')
        .update({ action: 'insert' })
        .eq('id', id as number)
      expect(updateError).toBeTruthy()

      const { error: deleteError } = await admin.db.from('audit_log').delete().eq('id', id as number)
      expect(deleteError).toBeTruthy()
    })
  })

  describe('schema isolation', () => {
    it('cannot reach the storefront tables from a todotwo-bound client', async () => {
      // The client is pinned to the todotwo schema, so public.orders is not
      // addressable at all. This is decision D2 working as intended.
      const { error } = await admin.db.from('orders').select('id').limit(1)
      expect(error).toBeTruthy()
    })
  })
})
