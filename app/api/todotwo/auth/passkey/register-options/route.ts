import { generateRegistrationOptions } from '@simplewebauthn/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { requireTodoTwoApiUser } from '@/lib/todotwo/auth'
import { getTodoTwoClient } from '@/lib/todotwo/db'
import {
  WEBAUTHN_CHALLENGE_COOKIE,
  WEBAUTHN_CHALLENGE_MAX_AGE_SECONDS,
  WEBAUTHN_CHALLENGE_PATH,
  getRelyingPartyId,
} from '@/lib/todotwo/webauthn'

export const dynamic = 'force-dynamic'

/** Registering a new passkey for the signed-in person. */
export async function POST() {
  const auth = await requireTodoTwoApiUser()
  if (!auth.ok) return auth.response

  const db = getTodoTwoClient()
  const { data: existing } = await db
    .from('webauthn_credentials')
    .select('credential_id, transports')
    .eq('person_id', auth.principal.person.id)

  const options = await generateRegistrationOptions({
    rpName: 'TodoTwo',
    rpID: getRelyingPartyId(),
    userID: new TextEncoder().encode(auth.principal.person.id),
    userName: auth.principal.email ?? auth.principal.person.fullName,
    userDisplayName: auth.principal.person.fullName,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    excludeCredentials: (existing ?? []).map((row) => ({
      id: row.credential_id as string,
      transports: (row.transports as string[] | null) ?? undefined,
    })),
  })

  const response = NextResponse.json(options)
  cookies().set(WEBAUTHN_CHALLENGE_COOKIE, options.challenge, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: WEBAUTHN_CHALLENGE_PATH,
    maxAge: WEBAUTHN_CHALLENGE_MAX_AGE_SECONDS,
  })
  return response
}
