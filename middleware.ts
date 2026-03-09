import { NextRequest, NextResponse } from 'next/server'

function isEggOpsHost(host: string): boolean {
  const normalized = host.toLowerCase()
  return (
    normalized.startsWith('eggops.tinglumgard.no') ||
    normalized.startsWith('eggops.xn--tinglumgrd-85a.no')
  )
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  if (!isEggOpsHost(host)) {
    return NextResponse.next()
  }

  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/drift/egg-ops'
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
