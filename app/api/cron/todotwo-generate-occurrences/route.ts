import { NextRequest, NextResponse } from 'next/server'

import { generateOccurrences } from '@/lib/todotwo/generate'
// PRIVILEGED. This runs from GitHub Actions cron with no user session, so
// auth.uid() is null and every RLS policy would evaluate to false. This is the
// case db-privileged.ts exists for — see app/api/cron/todotwo-notifications.
import { getPrivilegedClientForCronOnly } from '@/lib/todotwo/db-privileged'
import { isTodoTwoEnabled } from '@/lib/todotwo/config'

export const dynamic = 'force-dynamic'

/**
 * Rolls active recurring series forward so occurrences always exist at least
 * four days ahead. Each series' own horizon_days is honoured (and generally
 * exceeds four days already, matching the manual script's ~4-week window) —
 * over-generating further is harmless and expected, since insertion is
 * idempotent via the unique index on (series_id, occurrence_date).
 *
 * Same auth pattern as every other TodoTwo cron handler: POST with an
 * `x-cron-secret` header, compared in constant time. Always answers 200 once
 * it ran; a per-series expansion error is reported in the body rather than
 * failing the whole run, since one bad rrule must not stop the others.
 */
async function isAuthorized(request: NextRequest): Promise<{ ok: boolean; status: number; error?: string }> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return { ok: false, status: 500, error: 'CRON_SECRET is not configured on the server' }
  }

  const token = request.headers.get('x-cron-secret')
  if (!token) return { ok: false, status: 401, error: 'Missing cron token' }

  const { timingSafeEqual } = await import('crypto')
  const secretBuf = Buffer.from(secret)
  const tokenBuf = Buffer.from(token)
  const valid = secretBuf.length === tokenBuf.length && timingSafeEqual(secretBuf, tokenBuf)

  return valid ? { ok: true, status: 200 } : { ok: false, status: 401, error: 'Invalid cron token' }
}

export async function POST(request: NextRequest) {
  const auth = await isAuthorized(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!isTodoTwoEnabled()) {
    return NextResponse.json(
      { error: 'disabled', message: 'TODOTWO_ENABLED is not true.' },
      { status: 503 }
    )
  }

  try {
    const db = getPrivilegedClientForCronOnly()
    // No horizonDaysOverride: each series' own horizon_days is used, and it
    // already comfortably exceeds MIN_HORIZON_DAYS for every series seeded so
    // far. The override exists only as a floor should that ever not hold.
    const result = await generateOccurrences(db)

    const shortfall = result.errors.length > 0

    return NextResponse.json({
      ok: true,
      seriesProcessed: result.seriesProcessed,
      occurrencesCreated: result.occurrencesCreated,
      occurrencesSkipped: result.occurrencesSkipped,
      from: result.from,
      to: result.to,
      errors: result.errors,
      note: shortfall ? 'Some series could not be expanded; see errors.' : undefined,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'generate_failed',
        message: error instanceof Error ? error.message : 'Unknown generation error',
      },
      { status: 500 }
    )
  }
}
