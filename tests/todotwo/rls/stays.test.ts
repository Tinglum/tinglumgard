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
 * Stays and accommodation, against the real database.
 *
 * Coordinators and admins manage; any signed-in person may read current stay
 * status and occupancy (needed for scheduling); the EXCLUDE constraint on
 * accommodation_assignments is asserted directly, not just its application
 * pre-check.
 */

const env: RlsEnv | null = readRlsEnv()
const describeStays = env ? describe : describe.skip

describeStays('stays and accommodation', () => {
  const e = env as RlsEnv

  let admin: Actor
  let coordinator: Actor
  let worker: Actor

  let accommodationId: string
  let stayId: string
  let secondStayId: string

  beforeAll(async () => {
    admin = await createActor(e, 'stays-admin', ['farm_admin'])
    coordinator = await createActor(e, 'stays-coordinator', ['coordinator'])
    worker = await createActor(e, 'stays-worker', ['workawayer'])

    const db = adminClient(e)

    const { data: accommodation, error: accommodationError } = await db
      .from('accommodations')
      .insert({ name: `RLS fixture room ${Date.now()}`, kind: 'room', capacity: 1 })
      .select('id')
      .single()
    if (accommodationError || !accommodation) {
      throw new Error(`Could not create fixture accommodation: ${accommodationError?.message}`)
    }
    accommodationId = accommodation.id as string

    const { data: stay, error: stayError } = await db
      .from('stays')
      .insert({
        person_id: worker.personId,
        arrival_date: '2030-06-01',
        arrival_certainty: 'confirmed',
        departure_date: '2030-06-10',
        departure_certainty: 'confirmed',
        status: 'upcoming',
      })
      .select('id')
      .single()
    if (stayError || !stay) {
      throw new Error(`Could not create fixture stay: ${stayError?.message}`)
    }
    stayId = stay.id as string

    const { data: secondStay, error: secondStayError } = await db
      .from('stays')
      .insert({
        person_id: coordinator.personId,
        arrival_date: '2030-07-01',
        arrival_certainty: 'confirmed',
        status: 'upcoming',
      })
      .select('id')
      .single()
    if (secondStayError || !secondStay) {
      throw new Error(`Could not create second fixture stay: ${secondStayError?.message}`)
    }
    secondStayId = secondStay.id as string
  })

  afterAll(async () => {
    const db = adminClient(e)
    await db.from('accommodation_assignments').delete().eq('accommodation_id', accommodationId)
    await db.from('stays').delete().in('id', [stayId, secondStayId])
    await db.from('accommodations').delete().eq('id', accommodationId)
    for (const actor of [admin, coordinator, worker]) {
      if (actor) await destroyActor(e, actor)
    }
  })

  it('stops a Workawayer creating a stay', async () => {
    const { error } = await worker.db.from('stays').insert({
      person_id: worker.personId,
      arrival_date: '2031-01-01',
    })
    expect(error).toBeTruthy()
  })

  it('lets a coordinator create a stay', async () => {
    const { error } = await coordinator.db
      .from('stays')
      .update({ status: 'current' })
      .eq('id', stayId)
    expect(error).toBeNull()
  })

  it('lets a Workawayer read stay status (needed for scheduling)', async () => {
    const { data, error } = await worker.db.from('stays').select('id, status').eq('id', stayId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('stops everyone but an admin reading stays_private', async () => {
    const { error: coordinatorError } = await coordinator.db
      .from('stays_private')
      .insert({ stay_id: stayId, private_notes: 'sensitive' })
    expect(coordinatorError).toBeTruthy()

    const { error: adminError } = await admin.db
      .from('stays_private')
      .insert({ stay_id: stayId, private_notes: 'sensitive' })
    expect(adminError).toBeNull()

    const { data: workerRead, error: workerReadError } = await worker.db
      .from('stays_private')
      .select('id')
      .eq('stay_id', stayId)
    expect(workerReadError).toBeNull()
    expect(workerRead ?? []).toHaveLength(0)
  })

  it('lets staff assign an accommodation and lets anyone read occupancy', async () => {
    const { data: assignment, error } = await coordinator.db
      .from('accommodation_assignments')
      .insert({
        accommodation_id: accommodationId,
        stay_id: stayId,
        person_id: worker.personId,
        start_date: '2030-06-01',
        end_date: '2030-06-10',
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    expect(assignment?.id).toBeTruthy()

    const { data: occupancy, error: readError } = await worker.db
      .from('occupancy_resolved')
      .select('accommodation_id, full_name')
      .eq('accommodation_id', accommodationId)

    expect(readError).toBeNull()
    expect((occupancy ?? []).length).toBeGreaterThan(0)
  })

  it('the database itself refuses to double-book the same accommodation', async () => {
    // Overlaps the assignment created above (2030-06-01..10) by two days.
    const { error } = await admin.db.from('accommodation_assignments').insert({
      accommodation_id: accommodationId,
      stay_id: secondStayId,
      person_id: coordinator.personId,
      start_date: '2030-06-09',
      end_date: '2030-06-15',
    })

    expect(error).toBeTruthy()
    expect(error?.code).toBe('23P01')
  })

  it('stops a Workawayer creating an accommodation assignment', async () => {
    const { error } = await worker.db.from('accommodation_assignments').insert({
      accommodation_id: accommodationId,
      stay_id: secondStayId,
      person_id: coordinator.personId,
      start_date: '2031-01-01',
      end_date: '2031-01-05',
    })
    expect(error).toBeTruthy()
  })
})
