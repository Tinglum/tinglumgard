'use server'

import { cookies } from 'next/headers'
import { ADMIN_MODE_COOKIE } from './admin-mode'
import { normalizeAdminMode } from '@/lib/admin-utils'
import { AdminMode } from '@/lib/admin-types'

export async function setAdminMode(mode: AdminMode) {
  const normalized = normalizeAdminMode(mode)
  cookies().set(ADMIN_MODE_COOKIE, normalized, {
    path: '/admin',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  })
}
