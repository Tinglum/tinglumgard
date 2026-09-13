import { createHmac, timingSafeEqual } from 'crypto'

export const IMPERSONATION_COOKIE = 'todotwo_impersonate'

function secret(): string {
  const value = process.env.CRON_SECRET
  if (!value) throw new Error('Server signing secret is not configured')
  return value
}

export function signImpersonation(personId: string): string {
  const signature = createHmac('sha256', secret()).update(personId).digest('base64url')
  return `${personId}.${signature}`
}

export function verifyImpersonation(value: string | undefined): string | null {
  if (!value) return null
  const split = value.lastIndexOf('.')
  if (split < 1) return null
  const personId = value.slice(0, split)
  const supplied = Buffer.from(value.slice(split + 1))
  const expected = Buffer.from(createHmac('sha256', secret()).update(personId).digest('base64url'))
  return supplied.length === expected.length && timingSafeEqual(supplied, expected) ? personId : null
}
