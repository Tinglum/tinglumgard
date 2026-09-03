import type { Metadata } from 'next'

import { CallbackHandler } from '@/app/todotwo/auth/callback/callback-handler'

export const metadata: Metadata = { title: 'Logger inn' }
export const dynamic = 'force-dynamic'

/**
 * Magic-link landing.
 *
 * A page rather than a route handler because Supabase issues two shapes of
 * link and only one of them is visible to the server:
 *
 *   - PKCE (`?code=`) — what the browser client produces when someone submits
 *     the login form. Readable server-side.
 *   - Implicit (`#access_token=`) — what the admin generate_link API produces,
 *     which Phase 3 uses to invite Workawayers. URL fragments are never sent
 *     to the server, so this can only be handled in the browser.
 *
 * Handling both in one client component keeps a single code path.
 */
export default function TodoTwoAuthCallbackPage() {
  return <CallbackHandler />
}
