import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import {
  WEBAUTHN_CHALLENGE_COOKIE,
  WEBAUTHN_CHALLENGE_MAX_AGE_SECONDS,
  WEBAUTHN_CHALLENGE_PATH,
  getRelyingPartyId,
} from '@/lib/todotwo/webauthn'

export const dynamic = 'force-dynamic'

/**
 * No auth required — this is how someone signs in. Usernameless/discoverable
 * flow: allowCredentials is empty, so the authenticator (and its own UI) picks
 * which passkey to present rather than the server naming one up front.
 */
export async function POST() {
  if (!isTodoTwoEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const options = await generateAuthenticationOptions({
    rpID: getRelyingPartyId(),
    userVerification: 'required',
    allowCredentials: [],
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
