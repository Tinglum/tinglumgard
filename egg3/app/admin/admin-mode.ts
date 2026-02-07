import { cookies } from 'next/headers'
import { normalizeAdminMode } from '@/lib/admin-utils'
import { AdminMode } from '@/lib/admin-types'

export const ADMIN_MODE_COOKIE = 'admin_mode'

export function getAdminMode(): AdminMode {
  const cookieValue = cookies().get(ADMIN_MODE_COOKIE)?.value
  return normalizeAdminMode(cookieValue)
}
