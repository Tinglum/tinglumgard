import { afterEach, describe, expect, it } from 'vitest'

import {
  TODOTWO_API_BASE,
  TODOTWO_BASE,
  isTodoTwoApiPath,
  isTodoTwoPath,
  todoTwoRoutes,
} from '@/lib/todotwo/routes'
import { __resetConfigCacheForTests, getConnectedProjectRef, isTodoTwoEnabled } from '@/lib/todotwo/config'

describe('path matching', () => {
  it('claims TodoTwo pages and API routes', () => {
    expect(isTodoTwoPath(TODOTWO_BASE)).toBe(true)
    expect(isTodoTwoPath(`${TODOTWO_BASE}/login`)).toBe(true)
    expect(isTodoTwoPath(TODOTWO_API_BASE)).toBe(true)
    expect(isTodoTwoPath(`${TODOTWO_API_BASE}/tasks`)).toBe(true)
  })

  it('leaves the storefront alone', () => {
    for (const path of ['/', '/bestill', '/min-side', '/egg', '/milk', '/drift/egg-ops', '/api/orders']) {
      expect(isTodoTwoPath(path), path).toBe(false)
    }
  })

  it('does not claim paths that merely start with the same letters', () => {
    expect(isTodoTwoPath('/todotwoish')).toBe(false)
    expect(isTodoTwoPath('/api/todotwoish')).toBe(false)
  })

  it('distinguishes API paths, which answer JSON rather than redirecting', () => {
    expect(isTodoTwoApiPath(`${TODOTWO_API_BASE}/tasks`)).toBe(true)
    expect(isTodoTwoApiPath(`${TODOTWO_BASE}/login`)).toBe(false)
  })

  it('builds every route from the single base constant', () => {
    expect(todoTwoRoutes.home()).toBe(TODOTWO_BASE)
    expect(todoTwoRoutes.login().startsWith(TODOTWO_BASE)).toBe(true)
    expect(todoTwoRoutes.authCallback().startsWith(TODOTWO_BASE)).toBe(true)
    expect(todoTwoRoutes.logout().startsWith(TODOTWO_API_BASE)).toBe(true)
  })
})

describe('configuration', () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
    __resetConfigCacheForTests()
  })

  it('treats the flag as off unless it is exactly "true"', () => {
    for (const value of [undefined, '', 'false', '1', 'TRUE', 'yes']) {
      if (value === undefined) delete process.env.TODOTWO_ENABLED
      else process.env.TODOTWO_ENABLED = value
      expect(isTodoTwoEnabled(), String(value)).toBe(false)
    }

    process.env.TODOTWO_ENABLED = 'true'
    expect(isTodoTwoEnabled()).toBe(true)
  })

  it('derives the project ref from the URL rather than trusting a second variable', () => {
    process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL = 'https://cxuukixtooxyipdecbcb.supabase.co'
    expect(getConnectedProjectRef()).toBe('cxuukixtooxyipdecbcb')
  })

  it('returns null for anything that is not a Supabase project URL', () => {
    process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL = 'https://example.com'
    expect(getConnectedProjectRef()).toBeNull()

    delete process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
    expect(getConnectedProjectRef()).toBeNull()
  })
})
