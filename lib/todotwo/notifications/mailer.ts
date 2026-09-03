import { sendViaMailgun } from '@/lib/email/provider-mailgun'
import type { Sender } from '@/lib/todotwo/notifications/types'

/**
 * TodoTwo's outbound email.
 *
 * A thin wrapper over the farm's existing Mailgun sender rather than a second
 * provider: one pipeline, one sender identity, one place to look when a message
 * does not arrive — the same path that already carries the egg order emails.
 *
 * An earlier version of this module used Resend, which nothing else on this
 * site uses. RESEND_API_KEY sits in .env.local as a leftover and EMAIL_FROM is
 * still the placeholder noreply@yourdomain.com; Mailgun (EU region) is what
 * actually sends, via MAILGUN_API_KEY and MAILGUN_DOMAIN.
 */

export interface MailerConfig {
  domain: string
  /** Present only so the dispatcher can report which provider it used. */
  provider: 'mailgun'
}

/** Null when Mailgun is not configured, so the dispatcher can stay inert. */
export function getMailerConfig(): MailerConfig | null {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  if (!apiKey || !domain) return null
  return { domain, provider: 'mailgun' }
}

/**
 * Is this provider error worth another attempt?
 *
 * Rate limits, upstream faults and network trouble pass. A rejected recipient,
 * a bad key or an unverified domain will fail identically forever — retrying
 * those only burns the queue's attempts and delays someone noticing.
 */
export function isRetryableError(error: string | undefined): boolean {
  if (!error) return false
  const text = error.toLowerCase()

  if (text.includes('not configured')) return false
  if (/\b(400|401|403|404|422)\b/.test(text)) return false

  return (
    /\b(408|429|5\d{2})\b/.test(text) ||
    text.includes('timeout') ||
    text.includes('network') ||
    text.includes('econnreset') ||
    text.includes('fetch failed')
  )
}

/** Escapes text destined for an HTML body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Plain text to a minimal HTML body, since Mailgun wants both. */
export function textToHtml(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('\n')

  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#191d18">\n${paragraphs}\n</div>`
}

export function createMailgunSender(): Sender {
  return async ({ to, subject, text }) => {
    const result = await sendViaMailgun({
      to,
      subject,
      text,
      html: textToHtml(text),
      // Tags TodoTwo mail so it is separable in Mailgun's logs from the order
      // and egg messages travelling the same domain.
      headers: { 'X-Tinglumgard-App': 'todotwo' },
    })

    return {
      sent: result.success,
      providerId: result.id,
      error: result.error,
      retryable: result.success ? false : isRetryableError(result.error),
    }
  }
}
