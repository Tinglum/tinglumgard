import type { SessionData } from '@/lib/auth/session'

export type AppRole = 'admin' | 'operations' | 'customer'

export function getSessionRole(session: SessionData | null | undefined): AppRole {
  if (!session) return 'customer'
  if (session.isAdmin || session.role === 'admin') return 'admin'
  if (session.role === 'operations') return 'operations'
  return 'customer'
}

export function canAccessEggOps(session: SessionData | null | undefined): boolean {
  const role = getSessionRole(session)
  return role === 'admin' || role === 'operations'
}

export function isAdminSession(session: SessionData | null | undefined): boolean {
  return getSessionRole(session) === 'admin'
}
