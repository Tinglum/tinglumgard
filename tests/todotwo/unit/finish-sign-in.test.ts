import { describe, expect, it } from 'vitest'

import { safeReturnTo } from '@/lib/todotwo/finish-sign-in'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

describe('safeReturnTo', () => {
  it('accepts a path within TodoTwo', () => {
    expect(safeReturnTo(`${TODOTWO_BASE}/settings/passkeys`)).toBe(`${TODOTWO_BASE}/settings/passkeys`)
  })

  it('falls back to the TodoTwo home for an external or missing path', () => {
    expect(safeReturnTo('https://evil.example/phish')).toBe(TODOTWO_BASE)
    expect(safeReturnTo('/other-app')).toBe(TODOTWO_BASE)
    expect(safeReturnTo(null)).toBe(TODOTWO_BASE)
    expect(safeReturnTo(undefined)).toBe(TODOTWO_BASE)
  })
})
