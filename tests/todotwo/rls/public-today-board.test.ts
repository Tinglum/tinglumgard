import { describe, expect, it } from 'vitest'

import { anonymousClient, type RlsEnv, readRlsEnv } from './harness'

/**
 * The one deliberately anon-callable surface in TodoTwo.
 *
 * These tests use a plain anon client with no signed-in actor at all — no
 * createActor, no session — because that is exactly what a visitor on
 * app/todotwo/board sees. The point is to confirm the function's output
 * really is minimal, and that adding it changed nothing else: a direct
 * select against a base table as anon must still fail.
 *
 * Skips cleanly when dev credentials are absent, matching the other RLS
 * suites in this directory.
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
    '[todotwo] Skipping public-today-board RLS tests: set NEXT_PUBLIC_TODOTWO_SUPABASE_URL, ' +
      'NEXT_PUBLIC_TODOTWO_SUPABASE_ANON_KEY and TODOTWO_SUPABASE_SERVICE_ROLE_KEY in .env.local.'
  )
}

describeRls('todotwo.public_today_board (anon)', () => {
  const e = env as RlsEnv

  it('is callable with no session at all', async () => {
    const anon = anonymousClient(e)
    const { data, error } = await anon.rpc('public_today_board')

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('returns only title/project_name/first_name/status/due_time — no ids, no email, no full name', async () => {
    const anon = anonymousClient(e)
    const { data, error } = await anon.rpc('public_today_board')

    expect(error).toBeNull()
    const rows = (data ?? []) as Record<string, unknown>[]

    const allowedKeys = new Set(['title', 'project_name', 'first_name', 'status', 'due_time'])

    for (const row of rows) {
      const keys = Object.keys(row)
      for (const key of keys) {
        expect(allowedKeys.has(key), `unexpected column returned: ${key}`).toBe(true)
      }

      // No column value should look like an id, email, or a two-part full name.
      expect(row.title).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i)
      expect(String(row.first_name ?? '')).not.toContain('@')
      expect(String(row.first_name ?? '')).not.toMatch(/\s/)
      expect(row).not.toHaveProperty('id')
      expect(row).not.toHaveProperty('task_id')
      expect(row).not.toHaveProperty('person_id')
      expect(row).not.toHaveProperty('email')
      expect(row).not.toHaveProperty('full_name')
      expect(row).not.toHaveProperty('phone')
    }
  })

  it('caps at 200 rows', async () => {
    const anon = anonymousClient(e)
    const { data, error } = await anon.rpc('public_today_board')

    expect(error).toBeNull()
    expect((data as unknown[]).length).toBeLessThanOrEqual(200)
  })

  it('still refuses a direct select against the base tasks table as anon', async () => {
    const anon = anonymousClient(e)
    const { data, error } = await anon.from('tasks').select('*')

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('still refuses a direct select against people as anon', async () => {
    const anon = anonymousClient(e)
    const { data, error } = await anon.from('people').select('*')

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
