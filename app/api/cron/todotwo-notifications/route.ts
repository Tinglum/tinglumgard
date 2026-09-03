import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { dispatchOutbox } from '@/lib/todotwo/notifications/dispatch'
// PRIVILEGED. The dispatcher marks rows sent or failed, and no user role holds
// insert, update or delete on todotwo.notification_outbox — deliberately, so a
// person cannot clear their own failed send. There is also no session here:
// this runs from GitHub Actions cron, so auth.uid() is null and every RLS
// policy would evaluate to false. This is the case db-privileged.ts exists for.
import { getPrivilegedClientForCronOnly } from '@/lib/todotwo/db-privileged'
import { isTodoTwoEnabled } from '@/lib/todotwo/config'

export const dynamic = 'force-dynamic'

/**
 * Drains the TodoTwo notification outbox.
 *
 * Invoked the same way as every other cron handler in this repository:
 * POST with an `x-cron-secret` header. Compared in constant time, matching
 * app/api/cron/email-dispatch.
 *
 * Always answers 200 when it ran, even if nothing could be sent. A failed send
 * is recorded on the row and reported in the body; it is not a failure of the
 * run, and returning 500 would just make the scheduler noisy about a state the
 * queue is already handling.
 */

const bodySchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
})

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

  // A body is optional; an empty one is the normal case from the scheduler.
  let limit: number | undefined
  const raw = await request.text()
  if (raw.trim().length > 0) {
    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Body must be JSON.' },
        { status: 400 }
      )
    }

    const parsed = bodySchema.safeParse(parsedJson)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_request', message: parsed.error.issues.map((i) => i.message).join('; ') },
        { status: 400 }
      )
    }
    limit = parsed.data.limit
  }

  try {
    const db = getPrivilegedClientForCronOnly()
    const result = await dispatchOutbox(db, limit ? { limit } : {})

    return NextResponse.json({
      ok: true,
      ...result,
      note: result.configured
        ? undefined
        : 'RESEND_API_KEY or EMAIL_FROM is absent. The queue was left untouched.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'dispatch_failed',
        message: error instanceof Error ? error.message : 'Unknown dispatch error',
      },
      { status: 500 }
    )
  }
}
