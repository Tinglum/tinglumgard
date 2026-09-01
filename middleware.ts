import { NextRequest, NextResponse } from 'next/server'

import { handleTodoTwoMiddleware } from '@/lib/todotwo/middleware'
import { isTodoTwoPath } from '@/lib/todotwo/routes'

function isEggOpsHost(host: string): boolean {
  const normalized = host.toLowerCase()
  return (
    normalized.startsWith('eggops.tinglumgard.no') ||
    normalized.startsWith('eggops.xn--tinglumgrd-85a.no')
  )
}

function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function extractIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return ((request as any).ip as string | undefined) || ''
}

function ipMatches(rule: string, ip: string): boolean {
  if (!rule || !ip) return false
  if (rule === ip) return true
  if (rule.endsWith('*')) {
    return ip.startsWith(rule.slice(0, -1))
  }
  return false
}

function isEggOpsPath(pathname: string): boolean {
  return (
    pathname === '/egg' ||
    pathname.startsWith('/egg/') ||
    pathname.startsWith('/drift/egg-ops') ||
    pathname.startsWith('/api/admin/eggs')
  )
}

function isMilkOpsPath(pathname: string): boolean {
  return (
    pathname === '/milk' ||
    pathname.startsWith('/milk/') ||
    pathname.startsWith('/api/milk')
  )
}

export async function middleware(request: NextRequest) {
  // TodoTwo is a self-contained module with its own auth and its own kill
  // switch. It is handled first and returns immediately, so nothing below can
  // change behaviour for it and it cannot change behaviour for anything below.
  if (isTodoTwoPath(request.nextUrl.pathname)) {
    return handleTodoTwoMiddleware(request)
  }

  const host = request.headers.get('host') || ''
  const eggOpsHost = isEggOpsHost(host)
  const eggOpsPath = isEggOpsPath(request.nextUrl.pathname)
  const milkOpsPath = isMilkOpsPath(request.nextUrl.pathname)

  if (!eggOpsHost && !eggOpsPath && !milkOpsPath) {
    return NextResponse.next()
  }

  const allowlist = parseAllowlist(process.env.EGG_OPS_IP_ALLOWLIST)
  if (allowlist.length > 0) {
    const ip = extractIp(request)
    const allowed = allowlist.some((rule) => ipMatches(rule, ip))
    if (!allowed) {
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'IP not allowed' }, { status: 403 })
      }
      return new NextResponse('IP not allowed', { status: 403 })
    }
  }

  if (eggOpsHost && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/egg'
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
