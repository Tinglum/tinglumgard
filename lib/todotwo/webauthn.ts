import { toAsciiHost } from '@/lib/todotwo/host'

/**
 * WebAuthn relying-party identity, shared by every passkey route so the rpID
 * and origin used to generate options match the ones used to verify a
 * response. Derived from the same env vars absoluteUrl() uses, so it tracks
 * the site's real host in production and localhost in dev without a second
 * configuration knob.
 */
function appOrigin(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'http://localhost:3003'
  const url = new URL(base)
  url.hostname = toAsciiHost(url.hostname) || url.hostname
  return url.origin
}

/** The relying-party origin WebAuthn responses must match. */
export function getRelyingPartyOrigin(): string {
  return appOrigin()
}

/** The relying-party ID: the origin's hostname, with no scheme or port. */
export function getRelyingPartyId(): string {
  return new URL(appOrigin()).hostname
}

export const WEBAUTHN_CHALLENGE_COOKIE = 'tt_webauthn_challenge'
export const WEBAUTHN_CHALLENGE_PATH = '/api/todotwo/auth/passkey'
export const WEBAUTHN_CHALLENGE_MAX_AGE_SECONDS = 5 * 60
