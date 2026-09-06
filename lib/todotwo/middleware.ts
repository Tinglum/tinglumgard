import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import { isTodoTwoApiPath } from '@/lib/todotwo/routes'

/**
 * TodoTwo's slice of the shared middleware.
 *
 * Two jobs, in order:
 *   1. Honour the TODOTWO_ENABLED kill switch. With it off, TodoTwo does not
 *      exist as far as the outside world is concerned.
 *   2. Refresh the Supabase session so server components see a live token.
 *
 * This runs only for TodoTwo paths. It never sees a storefront request, and it
 * must never change behaviour for one.
 */
export async function handleTodoTwoMiddleware(request: NextRequest): Promise<NextResponse> {
  if (!isTodoTwoEnabled()) {
    if (isTodoTwoApiPath(request.nextUrl.pathname)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return new NextResponse('Not found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_ANON_KEY

  // Enabled but unconfigured: let the request through so the page raises a
  // clear configuration error rather than a silent 404 no one can diagnose.
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // Refresh, but only when there is something to refresh.
  //
  // This used to call getUser() unconditionally, which is a round trip to the
  // auth server on every single request. Two costs, and the second is the one
  // that bit us: every call is another chance to rotate the refresh token, and
  // with rotation on, a token rotated here while a slow (cold-starting)
  // function is still rendering with the previous one is how a working session
  // turns into a login screen.
  //
  // So: read the session from the cookie — untrusted, but perfectly good for
  // "is this about to expire?" — and only reach for the network when it is.
  // Authorization is not decided here; getTodoTwoUser() revalidates properly
  // on the page. This is only about keeping the cookie alive.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    const expiresAt = session.expires_at ?? 0
    const secondsLeft = expiresAt - Math.floor(Date.now() / 1000)

    // A comfortable margin: long enough that a page render never begins with a
    // token that dies mid-flight, short enough that we are not refreshing on
    // every visit.
    if (secondsLeft < 5 * 60) {
      const { error } = await supabase.auth.refreshSession()
      // A failed refresh is left alone deliberately. Clearing the cookie here
      // would sign somebody out over a blip; leaving it means the page tries
      // again, and a genuinely dead session fails there instead.
      if (error) return response
    }
  }

  return response
}
