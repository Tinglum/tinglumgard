import 'server-only'
import { createHash, randomBytes } from 'crypto'

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000
export const PASSWORD_RESET_THROTTLE_MS = 60 * 1000

export function createPasswordResetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex')
  return { token, hash: hashPasswordResetToken(token) }
}

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

