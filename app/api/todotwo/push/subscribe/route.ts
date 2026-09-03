import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import { getTodoTwoClient } from '@/lib/todotwo/db'
import { requireTodoTwoApiUser } from '@/lib/todotwo/auth'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

/**
 * Registers a browser's push subscription for the signed-in person.
 *
 * Goes through the ordinary session-bound client, not a security-definer
 * function: the RLS insert policy (person_id = current_person_id()) is
 * already the whole check a push endpoint needs — see the migration's
 * comment on why this is not treated like a credential.
 */
export async function POST(request: NextRequest) {
  if (!isTodoTwoEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const authResult = await requireTodoTwoApiUser()
  if (!authResult.ok) return authResult.response

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        message: error instanceof z.ZodError ? error.issues[0]?.message : 'Invalid request body.',
      },
      { status: 400 }
    )
  }

  const db = getTodoTwoClient()

  const { error } = await db.from('push_subscriptions').insert({
    person_id: authResult.principal.person.id,
    endpoint: parsed.endpoint,
    p256dh: parsed.keys.p256dh,
    auth_key: parsed.keys.auth,
  })

  // A unique violation on endpoint means this exact subscription is already
  // registered (the browser handed back the same endpoint it did last time) —
  // that is success, not an error. There is no update policy on this table by
  // design (see the migration), so a genuinely changed key pair arrives as a
  // new endpoint, not a conflict here.
  if (error && error.code !== '23505') {
    return NextResponse.json(
      { error: 'subscribe_failed', message: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true })
}
