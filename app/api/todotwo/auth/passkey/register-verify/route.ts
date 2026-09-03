import { verifyRegistrationResponse, type RegistrationResponseJSON } from '@simplewebauthn/server'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

import { requireTodoTwoApiUser } from '@/lib/todotwo/auth'
import { getTodoTwoClient } from '@/lib/todotwo/db'
import {
  WEBAUTHN_CHALLENGE_COOKIE,
  WEBAUTHN_CHALLENGE_PATH,
  getRelyingPartyId,
  getRelyingPartyOrigin,
} from '@/lib/todotwo/webauthn'

export const dynamic = 'force-dynamic'

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

export async function POST(request: NextRequest) {
  const auth = await requireTodoTwoApiUser()
  if (!auth.ok) return auth.response

  const challenge = cookies().get(WEBAUTHN_CHALLENGE_COOKIE)?.value
  if (!challenge) {
    return NextResponse.json({ error: 'challenge_expired' }, { status: 400 })
  }

  let body: { response: RegistrationResponseJSON; deviceLabel?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: getRelyingPartyOrigin(),
      expectedRPID: getRelyingPartyId(),
    })
  } catch {
    return NextResponse.json({ error: 'verification_failed' }, { status: 400 })
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'verification_failed' }, { status: 400 })
  }

  const { credential } = verification.registrationInfo

  const db = getTodoTwoClient()
  const { error } = await db.rpc('save_webauthn_credential', {
    p_credential_id: credential.id,
    p_public_key: bytesToBase64(credential.publicKey),
    p_counter: credential.counter,
    p_transports: credential.transports ?? null,
    p_device_label:
      typeof body.deviceLabel === 'string' && body.deviceLabel.trim()
        ? body.deviceLabel.trim().slice(0, 80)
        : null,
  })

  if (error) {
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(WEBAUTHN_CHALLENGE_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: WEBAUTHN_CHALLENGE_PATH,
    maxAge: 0,
  })
  return response
}
