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

  // Revalidates the token and writes refreshed cookies through setAll above.
  // Server components cannot set cookies, so if this does not happen here the
  // session silently expires mid-visit.
  await supabase.auth.getUser()

  return response
}
