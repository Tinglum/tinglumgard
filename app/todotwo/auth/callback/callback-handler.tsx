'use client'

import * as React from 'react'

import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import { finishSignIn, safeReturnTo } from '@/lib/todotwo/finish-sign-in'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

type Failure = 'no_code' | 'exchange_failed' | 'no_person'

function failTo(reason: Failure): void {
  window.location.replace(`${todoTwoRoutes.login()}?error=${reason}`)
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
      // finishSignIn discards the session and reports no_person when that
      // link is missing, rather than leaving someone half-signed-in. It also
      // routes to set-password when password_set is false, which covers both
      // first-time confirmation and (since forgot-password forces returnTo to
      // /todotwo/set-password) the password-recovery flow, with no special
      // casing needed here.
      const failure = await finishSignIn(returnTo)
      if (failure) {
        failTo(failure)
      }
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
