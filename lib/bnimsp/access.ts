import type { SessionData } from '@/lib/auth/session'
import { getSessionRole } from '@/lib/auth/roles'

// Directors get a JWT session with role 'director'. Admin/operations also pass.
export type BnimspRole = 'director' | 'operations' | 'admin'

export function getBnimspRole(session: SessionData | null | undefined): BnimspRole | null {
  if (!session) return null
  const role = getSessionRole(session)
  if (role === 'admin') return 'admin'
  if (role === 'operations') return 'operations'
  if (session.role === ('director' as SessionData['role'])) return 'director'
  return null
}

/** Anyone with a director/operations/admin session may view the trainer page. */
export function canViewBnimsp(session: SessionData | null | undefined): boolean {
  return getBnimspRole(session) !== null
}

/**
 * Editors maintain the master content (click-to-edit, publish, manage directors):
 * farm admin/operations, or a director flagged as a BNIMSP admin (e.g. the
 * National Trainer) - the latter does NOT carry farm-wide admin rights.
 */
export function canEditBnimsp(session: SessionData | null | undefined): boolean {
  const role = getBnimspRole(session)
  if (role === 'admin' || role === 'operations') return true
  return session?.bnimspAdmin === true
}
