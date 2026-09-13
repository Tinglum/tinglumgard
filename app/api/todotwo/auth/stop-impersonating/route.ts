import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { IMPERSONATION_COOKIE } from '@/lib/todotwo/impersonation'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

export async function POST(request: NextRequest) {
  cookies().set(IMPERSONATION_COOKIE, '', { path: '/todotwo', maxAge: 0 })
  return NextResponse.redirect(new URL(todoTwoRoutes.home(), request.nextUrl.origin), { status: 303 })
}
