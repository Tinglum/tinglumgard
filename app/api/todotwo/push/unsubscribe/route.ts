import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import { getTodoTwoClient } from '@/lib/todotwo/db'
import { requireTodoTwoApiUser } from '@/lib/todotwo/auth'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  endpoint: z.string().url(),
})

/**
 * Removes a browser's push subscription. A plain RLS delete would work from
 * the client directly (delete_own policy keyed on current_person_id()), but a
 * route mirrors subscribe/ for symmetry and keeps the endpoint value off the
 * client's own error paths.
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

  const { error } = await db
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', parsed.endpoint)
    .eq('person_id', authResult.principal.person.id)

  if (error) {
    return NextResponse.json(
      { error: 'unsubscribe_failed', message: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true })
}
