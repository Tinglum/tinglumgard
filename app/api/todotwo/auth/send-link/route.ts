import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { claimLinkRequest, emailIsInvited, generateSignInLink } from '@/lib/todotwo/auth-admin'
import { isTodoTwoEnabled } from '@/lib/todotwo/config'
import { createMailgunSender, getMailerConfig } from '@/lib/todotwo/notifications/mailer'
import { absoluteUrl } from '@/lib/todotwo/host'
import { todoTwoRoutes } from '@/lib/todotwo/routes'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  email: z.string().trim().min(3).max(320),
  returnTo: z.string().trim().max(200).optional(),
})

/**
 * Sends a sign-in link, through Mailgun like the rest of the farm's email.
 *
 * The single most important property here: the response is identical whether or
 * not the address has access. Anything else turns this into a membership oracle
 * — feed it addresses, watch which ones behave differently, learn who lives on
 * the farm. That is the same mistake the earlier anon-callable
 * email_is_invited made, and moving it into an HTTP route would not have fixed
 * it.
 *
 * Everything that could differ is therefore swallowed: unknown address, rate
 * limit hit, Mailgun down, link generation failed. All of it is logged
 * server-side; the caller is told only that a link is on its way if the address
 * has access.
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

  // Deliberately vague, and the only success shape this route has.
  const accepted = NextResponse.json({
    ok: true,
    message: 'If that address has access, a sign-in link is on its way.',
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
    // Claimed before anything else, so a flood is throttled whether or not the
    // addresses exist. Fails closed.
    const allowed = await claimLinkRequest(email, ip)
    if (!allowed) {
      console.warn('[todotwo] sign-in link rate limited', { ip })
      return accepted
    }

    if (!(await emailIsInvited(email))) {
      console.warn('[todotwo] sign-in link requested for an address with no access')
      return accepted
    }

    const mailer = getMailerConfig()
    if (!mailer) {
      console.error('[todotwo] cannot send sign-in link: Mailgun is not configured')
      return accepted
    }

    const returnTo =
      parsed.returnTo && parsed.returnTo.startsWith('/todotwo') ? parsed.returnTo : undefined

    const callback = new URL(absoluteUrl(todoTwoRoutes.authCallback()))
    if (returnTo) callback.searchParams.set('returnTo', returnTo)

    const link = await generateSignInLink(email, callback.toString())
    if (!link) {
      console.error('[todotwo] could not generate a sign-in link')
      return accepted
    }

    const send = createMailgunSender()
    const result = await send({
      to: email,
      subject: 'Your TodoTwo sign-in link',
      text: [
        'Someone asked for a sign-in link for TodoTwo at Tinglumgård.',
        '',
        'Open this link to sign in. It works once and expires in an hour:',
        link.actionLink,
        '',
        'If this was not you, nothing has happened and you can ignore this email.',
      ].join('\n'),
    })

    if (!result.sent) {
      // Logged without the address: server logs must not become a record of who
      // is on the farm either.
      console.error('[todotwo] sign-in link send failed', { error: result.error })
    }
  } catch (error) {
    console.error('[todotwo] sign-in link route failed', {
      message: error instanceof Error ? error.message : 'unknown',
    })
  }

  return accepted
}
