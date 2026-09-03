import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { getPublicConfig } from '@/lib/todotwo/config'

/**
 * The only database entry point for TodoTwo request paths.
 *
 * This client carries the caller's Supabase session, so every query runs as
 * that user and Row Level Security is the access boundary. It is bound to the
 * `todotwo` schema, which means it physically cannot read the storefront's
 * tables in `public` — orders, Vipps payments and the rest are unreachable from
 * here even if a query asks for them.
 *
 * Never import the service-role client into a request path. See
 * lib/todotwo/db-privileged.ts, and the guard test in tests/todotwo/guards.
 */
export function getTodoTwoClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicConfig()
  const cookieStore = cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'todotwo' },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot set cookies. Session refresh happens in
          // middleware instead, so this is safe to swallow.
        }
      },
    },
  })
}

/**
 * A session-bound client for reading Supabase's own schemas, chiefly `auth`.
 * Same session and same RLS; only the default schema differs.
 */
export function getTodoTwoAuthClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicConfig()
  const cookieStore = cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // See above.
        }
      },
    },
  })
}
