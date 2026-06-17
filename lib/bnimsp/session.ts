import 'server-only'
import { cookies } from 'next/headers'
import { getSession, verifySession, type SessionData } from '@/lib/auth/session'
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/constants/app'

// BNIMSP uses its OWN cookie, fully separate from the farm's `tinglum_session`.
// Sharing the farm cookie made the main Tinglumgård site choke on director
// sessions ("Sesjonen er utløpet"). Keeping them separate isolates the two.
export const BNIMSP_COOKIE_NAME = 'bnimsp_session'

export async function setBnimspSession(token: string) {
  const c = await cookies()
  c.set(BNIMSP_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS)
  await clearLegacyFarmBnimspCookie()
}

export async function clearBnimspSession() {
  const c = await cookies()
  c.delete(BNIMSP_COOKIE_NAME)
  await clearLegacyFarmBnimspCookie()
}

/**
 * Resolve the session for /bnimsp: the dedicated BNIMSP cookie first, then a
 * farm admin/operations session as a fallback (so farm admins can still use the
 * page with their existing login). A farm *customer/director* session never
 * grants access here, and BNIMSP never writes the farm cookie.
 */
export async function getBnimspSession(): Promise<SessionData | null> {
  const c = await cookies()
  const token = c.get(BNIMSP_COOKIE_NAME)?.value
  if (token) {
    const s = await verifySession(token)
    if (s) return s
  }
  const farm = await getSession()
  if (farm && (farm.isAdmin || farm.role === 'admin' || farm.role === 'operations')) return farm
  return null
}

/**
 * Remove a legacy BNIMSP session that earlier versions wrote into the shared
 * farm cookie, so it stops confusing the main site. Real farm sessions (with a
 * genuine Vipps `vippsSub`) are left untouched.
 */
async function clearLegacyFarmBnimspCookie() {
  const c = await cookies()
  const token = c.get(SESSION_COOKIE_NAME)?.value
  if (!token) return
  const s = await verifySession(token)
  if (s && (s.role === 'director' || String(s.vippsSub || '').startsWith('bnimsp:'))) {
    c.delete(SESSION_COOKIE_NAME)
  }
}
