import { createClient } from '@supabase/supabase-js'

/**
 * PRIVILEGED CLIENT — BYPASSES ROW LEVEL SECURITY.
 *
 * This is deliberately named awkwardly so that its appearance in a diff is
 * obvious. It must only ever be imported from:
 *
 *   - app/api/cron/todotwo-*  (scheduled work with no user session)
 *   - scripts/todotwo/*       (migrations, seeding, local tooling)
 *
 * It must NEVER be imported from app/todotwo/**, app/api/todotwo/** or
 * components/todotwo/**. A guard test in tests/todotwo/guards fails the build
 * if it is. If you find yourself wanting it in a request path, the answer is an
 * RLS policy or a security-definer function, not this.
 *
 * Every call site must carry a comment explaining why RLS cannot serve it.
 */

// Built through a named factory so the schema-bound return type is inferred.
// Annotating with ReturnType<typeof createClient> would default the schema
// generic to "public" and fail to typecheck.
function build(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    db: { schema: 'todotwo' },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

let cached: ReturnType<typeof build> | null = null

export function getPrivilegedClientForCronOnly() {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
  const serviceRoleKey = process.env.TODOTWO_SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'TodoTwo privileged client requires NEXT_PUBLIC_TODOTWO_SUPABASE_URL and TODOTWO_SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  cached = build(url, serviceRoleKey)
  return cached
}
