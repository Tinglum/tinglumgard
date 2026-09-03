'use client'

import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { TODOTWO_BASE, todoTwoRoutes } from '@/lib/todotwo/routes'

export type FinishSignInFailure = 'exchange_failed' | 'no_person'

/** Only ever redirect within TodoTwo — an open redirect on the back of a
 *  legitimate sign-in is a phishing vector. */
export function safeReturnTo(value: string | null | undefined): string {
  return value && value.startsWith(TODOTWO_BASE) ? value : TODOTWO_BASE
}

/**
 * Everything that has to happen once a Supabase session exists, before
 * landing someone in the app: link the auth user to their people row on first
 * sign-in, confirm that row exists, and route to set-password when a password
 * has not been set yet. Shared by the magic-link callback, the password sign-in
 * form, and passkey login so the logic exists exactly once.
 */
export async function finishSignIn(returnTo: string): Promise<FinishSignInFailure | null> {
  const supabase = getTodoTwoBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return 'exchange_failed'

  // Idempotent: can only claim a row matching the caller's own verified
  // address, and only once.
  await supabase.rpc('claim_person')

  const { data: person } = await supabase
    .from('people')
    .select('id, password_set')
    .eq('auth_user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!person) {
    await supabase.auth.signOut()
    return 'no_person'
  }

  const target = safeReturnTo(returnTo)

  if (!person.password_set) {
    window.location.replace(`${todoTwoRoutes.setPassword()}?returnTo=${encodeURIComponent(target)}`)
    return null
  }

  window.location.replace(target)
  return null
}
