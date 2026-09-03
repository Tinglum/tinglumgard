import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { claimLinkRequest, emailIsInvited, generateRecoveryLink } from '@/lib/todotwo/auth-admin'
import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import { createMailgunSender, getMailerConfig } from '@/lib/todotwo/notifications/mailer'
import { absoluteUrl } from '@/lib/todotwo/host'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  email: z.string().trim().min(3).max(320),
})

/**
 * Sends a password-reset link, through Mailgun like everything else. Copies
 * app/api/todotwo/auth/send-link/route.ts's anti-enumeration shape exactly:
 * the response never differs based on whether the address has access. See
 * that route's doc comment for why.
 *
 * redirectTo forces returnTo to /todotwo/set-password rather than trusting the
 * caller, so a verified recovery link always lands on the set-password screen
 * — the callback handler's existing "redirect to returnTo" logic then needs no
 * special case for recovery at all.
 */
export async function POST(request: NextRequest) {
  if (!isTodoTwoEnabled()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json(
      { error: 'invalid_request', message: 'Enter an email address.' },
      { status: 400 }
    )
  }

  const email = parsed.email.toLowerCase()

  const accepted = NextResponse.json({
    ok: true,
    message: 'If that address has access, a password reset link is on its way.',
  })

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'That does not look like an email address.' },
      { status: 400 }
    )
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    null

  try {
    const allowed = await claimLinkRequest(email, ip)
    if (!allowed) {
      console.warn('[todotwo] password reset link rate limited', { ip })
      return accepted
    }

    if (!(await emailIsInvited(email))) {
      console.warn('[todotwo] password reset requested for an address with no access')
      return accepted
    }

    const mailer = getMailerConfig()
    if (!mailer) {
      console.error('[todotwo] cannot send password reset link: Mailgun is not configured')
      return accepted
    }

    const callback = new URL(absoluteUrl(todoTwoRoutes.authCallback()))
    callback.searchParams.set('returnTo', todoTwoRoutes.setPassword())

    const link = await generateRecoveryLink(email, callback.toString())
    if (!link) {
      console.error('[todotwo] could not generate a password reset link')
      return accepted
    }

    const send = createMailgunSender()
    const result = await send({
      to: email,
      subject: 'Reset your TodoTwo password',
      text: [
        'Someone asked to reset the TodoTwo password for this address.',
        '',
        'Open this link to set a new password. It works once and expires soon:',
        link.actionLink,
        '',
        'If this was not you, nothing has happened and you can ignore this email.',
      ].join('\n'),
    })

    if (!result.sent) {
      console.error('[todotwo] password reset link send failed', { error: result.error })
    }
  } catch (error) {
    console.error('[todotwo] forgot-password route failed', {
      message: error instanceof Error ? error.message : 'unknown',
    })
  }

  return accepted
}
