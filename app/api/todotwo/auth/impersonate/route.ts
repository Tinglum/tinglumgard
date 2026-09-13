import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { requireApiRole } from '@/lib/todotwo/auth'
import { IMPERSONATION_COOKIE, signImpersonation } from '@/lib/todotwo/impersonation'
import { getTodoTwoClient } from '@/lib/todotwo/db'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await requireApiRole(['super_admin', 'farm_admin'])
  if (!auth.ok) return auth.response
  const personId = String((await request.formData()).get('personId') ?? '')
  const { data } = await getTodoTwoClient().from('people').select('id').eq('id', personId).eq('is_active', true).is('deleted_at', null).maybeSingle()
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  cookies().set(IMPERSONATION_COOKIE, signImpersonation(personId), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/todotwo', maxAge: 60 * 60 * 8,
  })
  return NextResponse.redirect(new URL(todoTwoRoutes.home(), request.nextUrl.origin), { status: 303 })
}
