import { afterEach, describe, expect, it } from 'vitest'

import { getRelyingPartyId, getRelyingPartyOrigin } from '@/lib/todotwo/webauthn'

const ORIGINAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL

describe('WebAuthn relying-party identity', () => {
  afterEach(() => {
    if (ORIGINAL_APP_URL === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL
    } else {
      process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_APP_URL
    }
  })

  it('derives the rpID from NEXT_PUBLIC_APP_URL, ASCII-normalized', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://tinglumgård.no'
    expect(getRelyingPartyId()).toBe('xn--tinglumgrd-85a.no')
    expect(getRelyingPartyOrigin()).toBe('https://xn--tinglumgrd-85a.no')
  })

  it('falls back to localhost in dev', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.APP_BASE_URL
    expect(getRelyingPartyId()).toBe('localhost')
  })
})
