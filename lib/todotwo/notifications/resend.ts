import type { SendResult, Sender } from '@/lib/todotwo/notifications/types'

/**
 * The Resend transport.
 *
 * Talked to over plain fetch rather than the `resend` package: adding a
 * dependency for one POST is not worth it, and this way the module has no
 * import cost in a request bundle.
 *
 * The existing storefront mailer (lib/email/provider-mailgun.ts) was read first
 * and deliberately not reused — it is Mailgun, it defaults its From address to
 * the storefront's, and it returns a shape with no notion of whether a failure
 * is worth retrying, which is the one thing the outbox needs to know.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export interface ResendConfig {
  apiKey: string
  from: string
}

/**
 * Configuration, or null.
 *
 * Null is a normal state, not an error. Resend's sending domain for the farm is
 * not verified yet, so a deployment without a key must be inert rather than
 * broken: the dispatcher checks this first and leaves the queue untouched.
 */
export function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim()

  if (!apiKey || !from) return null

  return { apiKey, from }
}

/**
 * Which HTTP failures are worth another go.
 *
 * 429 and 5xx are transient. 401, 403 and 422 mean the key, the domain or the
 * address is wrong, and no amount of waiting fixes that — those fail once and
 * keep their error text where a human can read it.
 */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

export function createResendSender(config: ResendConfig): Sender {
  return async function send({ to, subject, text }): Promise<SendResult> {
    let response: Response
    try {
      response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: config.from, to: [to], subject, text }),
      })
    } catch (error) {
      // DNS, TLS, timeout. Always worth another attempt.
      return {
        sent: false,
        retryable: true,
        error: `Could not reach Resend: ${error instanceof Error ? error.message : String(error)}`,
      }
    }

    const raw = await response.text()

    if (!response.ok) {
      let detail = raw.slice(0, 500)
      try {
        const parsed = JSON.parse(raw) as { message?: string; error?: string }
        detail = parsed.message || parsed.error || detail
      } catch {
        // Not JSON. The raw body is more useful than nothing.
      }

      return {
        sent: false,
        retryable: isRetryableStatus(response.status),
        error: `Resend ${response.status}: ${detail}`,
      }
    }

    let providerId: string | undefined
    try {
      providerId = (JSON.parse(raw) as { id?: string }).id
    } catch {
      // A 2xx with an unreadable body still means accepted.
    }

    return { sent: true, retryable: false, providerId }
  }
}
