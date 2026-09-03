'use client'

import * as React from 'react'

import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { TODOTWO_BASE, todoTwoRoutes } from '@/lib/todotwo/routes'

type Failure = 'no_code' | 'exchange_failed' | 'no_person'

function failTo(reason: Failure): void {
  window.location.replace(`${todoTwoRoutes.login()}?error=${reason}`)
}

/** Only ever redirect within TodoTwo — an open redirect on the back of a
 *  legitimate login email is a phishing vector. */
function safeReturnTo(value: string | null): string {
  return value && value.startsWith(TODOTWO_BASE) ? value : TODOTWO_BASE
}

export function CallbackHandler() {
  const ran = React.useRef(false)

  React.useEffect(() => {
    // Effects run twice under React strict mode in development, and a magic
    // link is single-use — the second run would consume an already-spent code.
    if (ran.current) return
    ran.current = true

    void (async () => {
      const supabase = getTodoTwoBrowserClient()
      const params = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))

      const code = params.get('code')
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      const returnTo = safeReturnTo(params.get('returnTo'))

      if (params.get('error') || hash.get('error')) {
        failTo('exchange_failed')
        return
      }

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            failTo('exchange_failed')
            return
          }
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            failTo('exchange_failed')
            return
          }
        } else {
          failTo('no_code')
          return
        }
      } catch {
        failTo('exchange_failed')
        return
      }

      // A valid Supabase user is not by itself permission to be here. Accounts
      // are created by an administrator and linked to a todotwo.people row;
      // without that link, discard the session rather than leaving someone
      // half-signed-in.
      //
      // Filter by auth_user_id explicitly: an admin's RLS policy returns every
      // person, so an unfiltered maybeSingle() would error on multiple rows.
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        failTo('exchange_failed')
        return
      }

      // First sign-in: link this auth user to the person row an administrator
      // prepared for their email. Idempotent, and it can only claim a row that
      // matches the caller's own verified address and is not already linked.
      await supabase.rpc('claim_person')

      const { data: person } = await supabase
        .from('people')
        .select('id')
        .eq('auth_user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle()

      if (!person) {
        await supabase.auth.signOut()
        failTo('no_person')
        return
      }

      // replace() so the spent link does not sit in history.
      window.location.replace(returnTo)
    })()
  }, [])

  return (
    <div className="flex min-h-[100svh] items-center justify-center px-4">
      <p className="text-sm text-[var(--tt-ink-2)]" role="status">
        Signing you in …
      </p>
    </div>
  )
}
