import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { canAccessMilkOps, isAdminSession } from '@/lib/auth/roles'
import { getSession, type SessionData } from '@/lib/auth/session'
import { getMilkOpsConfig } from '@/lib/milk/ops-config'

type AccessOptions = {
  requireAdmin?: boolean
  allowUnauthenticatedWhenDisabled?: boolean
}

type AccessResult =
  | { ok: true; session: SessionData | null; configRequireAuth: boolean }
  | { ok: false; response: NextResponse }

function normalizeIp(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.trim()
}

function extractClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]
    return normalizeIp(first)
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return normalizeIp(realIp)
  return normalizeIp((request as any).ip)
}

function ipMatchesRule(ip: string, rule: string): boolean {
  if (!rule) return false
  if (rule === ip) return true
  if (rule.endsWith('*')) return ip.startsWith(rule.slice(0, -1))
  return false
}

function isIpAllowed(ip: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true
  if (!ip) return false
  return allowlist.some((rule) => ipMatchesRule(ip, rule))
}

export async function enforceMilkOpsAccess(
  request: NextRequest,
  options?: AccessOptions
): Promise<AccessResult> {
  const settings = await getMilkOpsConfig()
  const requireAdmin = Boolean(options?.requireAdmin)
  const allowUnauthenticatedWhenDisabled = options?.allowUnauthenticatedWhenDisabled !== false

  const clientIp = extractClientIp(request)
  if (!isIpAllowed(clientIp, settings.ipAllowlist)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'IP not allowed' }, { status: 403 }),
    }
  }

  const session = await getSession()
  if (requireAdmin) {
    if (!isAdminSession(session)) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }),
      }
    }
    return { ok: true, session, configRequireAuth: settings.requireAuth }
  }

  if (!settings.requireAuth && allowUnauthenticatedWhenDisabled) {
    return { ok: true, session, configRequireAuth: false }
  }

  if (!canAccessMilkOps(session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }),
    }
  }

  return { ok: true, session, configRequireAuth: true }
}
