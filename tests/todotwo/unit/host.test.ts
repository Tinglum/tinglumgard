import { describe, expect, it } from 'vitest'

import {
  ASCII_APEX,
  UNICODE_APEX,
  absoluteUrl,
  isTinglumgardHost,
  normalizeHost,
  toAsciiHost,
} from '@/lib/todotwo/host'

describe('normalizeHost', () => {
  it('lowercases and strips the port', () => {
    expect(normalizeHost('Tinglumgard.NO:3003')).toBe('tinglumgard.no')
  })

  it('leaves a bracketed IPv6 literal intact', () => {
    expect(normalizeHost('[::1]:3003')).toBe('[::1]')
  })

  it('handles empty input', () => {
    expect(normalizeHost(null)).toBe('')
    expect(normalizeHost(undefined)).toBe('')
  })
})

describe('isTinglumgardHost', () => {
  it('accepts both spellings of the apex', () => {
    expect(isTinglumgardHost(UNICODE_APEX)).toBe(true)
    expect(isTinglumgardHost(ASCII_APEX)).toBe(true)
    expect(isTinglumgardHost('tinglumgard.no')).toBe(true)
  })

  it('accepts subdomains in either spelling', () => {
    expect(isTinglumgardHost('eggops.tinglumgard.no')).toBe(true)
    expect(isTinglumgardHost(`eggops.${ASCII_APEX}`)).toBe(true)
    expect(isTinglumgardHost(`www.${UNICODE_APEX}:443`)).toBe(true)
  })

  it('rejects lookalikes that merely end in the same letters', () => {
    expect(isTinglumgardHost('nottinglumgard.no')).toBe(false)
    expect(isTinglumgardHost('tinglumgard.no.evil.com')).toBe(false)
    expect(isTinglumgardHost('example.com')).toBe(false)
    expect(isTinglumgardHost('')).toBe(false)
  })
})

describe('toAsciiHost', () => {
  it('converts the Unicode apex to punycode', () => {
    expect(toAsciiHost(UNICODE_APEX)).toBe(ASCII_APEX)
    expect(toAsciiHost(`eggops.${UNICODE_APEX}`)).toBe(`eggops.${ASCII_APEX}`)
  })

  it('leaves an already-ASCII host alone', () => {
    expect(toAsciiHost(ASCII_APEX)).toBe(ASCII_APEX)
    expect(toAsciiHost('example.com')).toBe('example.com')
  })
})

describe('absoluteUrl', () => {
  it('builds an ASCII URL from a Unicode base', () => {
    expect(absoluteUrl('/todotwo/login', `https://${UNICODE_APEX}`)).toBe(
      `https://${ASCII_APEX}/todotwo/login`
    )
  })

  it('preserves an ASCII base', () => {
    expect(absoluteUrl('/todotwo', `https://${ASCII_APEX}`)).toBe(`https://${ASCII_APEX}/todotwo`)
  })

  it('works against localhost in development', () => {
    expect(absoluteUrl('/todotwo', 'http://localhost:3003')).toBe('http://localhost:3003/todotwo')
  })

  it('keeps query strings', () => {
    expect(absoluteUrl('/todotwo/login?returnTo=%2Ftodotwo', `https://${UNICODE_APEX}`)).toBe(
      `https://${ASCII_APEX}/todotwo/login?returnTo=%2Ftodotwo`
    )
  })
})
