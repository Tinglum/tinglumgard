import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from '@simplewebauthn/server'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

import {
  bumpWebauthnCounter,
  findWebauthnCredentialById,
  mintSessionForEmail,
} from '@/lib/todotwo/auth-admin'
import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import {
  WEBAUTHN_CHALLENGE_COOKIE,
  WEBAUTHN_CHALLENGE_PATH,
  getRelyingPartyId,
  getRelyingPartyOrigin,
} from '@/lib/todotwo/webauthn'

export const dynamic = 'force-dynamic'

function base64ToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'))
}

/**
 * No auth required — this IS how someone signs in with a passkey. Every
 * failure answers with the same generic shape; the credential-id lookup is the
 * only place account existence could leak, and that lookup is not attacker-
 * guessable (see lib/todotwo/auth-admin.ts).
 */
export async function POST(request: NextRequest) {
  if (!isTodoTwoEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const challenge = cookies().get(WEBAUTHN_CHALLENGE_COOKIE)?.value
  if (!challenge) {
    return NextResponse.json({ error: 'passkey_not_recognized' }, { status: 400 })
  }

  let body: { response: AuthenticationResponseJSON }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'passkey_not_recognized' }, { status: 400 })
  }

  const credentialId = body.response?.id
  if (!credentialId) {
    return NextResponse.json({ error: 'passkey_not_recognized' }, { status: 400 })
  }

  const stored = await findWebauthnCredentialById(credentialId)
  if (!stored) {
    return NextResponse.json({ error: 'passkey_not_recognized' }, { status: 400 })
  }

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: getRelyingPartyOrigin(),
      expectedRPID: getRelyingPartyId(),
      credential: {
        id: stored.credentialId,
        publicKey: base64ToBytes(stored.publicKey),
        counter: stored.counter,
        transports: stored.transports ?? undefined,
      },
    })
  } catch {
    return NextResponse.json({ error: 'passkey_not_recognized' }, { status: 400 })
  }

  if (!verification.verified) {
    return NextResponse.json({ error: 'passkey_not_recognized' }, { status: 400 })
  }

  await bumpWebauthnCounter(stored.credentialId, verification.authenticationInfo.newCounter)

  const session = await mintSessionForEmail(stored.email)
  if (!session) {
    return NextResponse.json({ error: 'passkey_not_recognized' }, { status: 400 })
  }

  const response = NextResponse.json({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  })
  response.cookies.set(WEBAUTHN_CHALLENGE_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: WEBAUTHN_CHALLENGE_PATH,
    maxAge: 0,
  })
  return response
}
