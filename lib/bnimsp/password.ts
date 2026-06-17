import 'server-only'
import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)
const KEYLEN = 64

/** Hash a password as `scrypt$<saltHex>$<hashHex>` (no external dependency). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer
  return `scrypt$${salt}$${derived.toString('hex')}`
}

/** Constant-time verification against a stored `scrypt$salt$hash` string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = String(stored || '').split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const [, salt, hashHex] = parts
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer
  const expected = Buffer.from(hashHex, 'hex')
  if (expected.length !== derived.length) return false
  return timingSafeEqual(expected, derived)
}
