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

/** Only admin/operations maintain the master content (click-to-edit, publish). */
export function canEditBnimsp(session: SessionData | null | undefined): boolean {
  const role = getBnimspRole(session)
  return role === 'admin' || role === 'operations'
}
