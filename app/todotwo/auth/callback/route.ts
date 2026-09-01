import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

import { getPublicConfig } from '@/lib/todotwo/config'
import { getTodoTwoClient } from '@/lib/todotwo/db'
import { TODOTWO_BASE, todoTwoRoutes } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

/**
 * Magic-link landing. Exchanges the one-time code for a session, then checks
 * that the authenticated user actually maps to a person in TodoTwo.
 *
 * A valid Supabase user is not by itself permission to be here: accounts are
 * created by an administrator and linked to a todotwo.people row. Without that
 * link the session is discarded rather than left half-signed-in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const returnTo = searchParams.get('returnTo')

  const failure = (reason: string) =>
    NextResponse.redirect(new URL(`${todoTwoRoutes.login()}?error=${reason}`, origin))

  if (!code) return failure('no_code')

  const { supabaseUrl, supabaseAnonKey } = getPublicConfig()
  const cookieStore = cookies()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return failure('exchange_failed')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return failure('exchange_failed')

  const db = getTodoTwoClient()
  const { data: person } = await db
    .from('people')
    .select('id')
    .eq('auth_user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!person) {
    await supabase.auth.signOut()
    return failure('no_person')
  }

  // Only ever redirect to our own paths — an open redirect here would be a
  // phishing vector on the back of a legitimate login email.
  const safeReturnTo =
    returnTo && returnTo.startsWith(TODOTWO_BASE) ? returnTo : TODOTWO_BASE

  return NextResponse.redirect(new URL(safeReturnTo, origin))
}
