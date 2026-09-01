/**
 * Punycode-aware host handling.
 *
 * tinglumgård.no is an internationalised domain. Browsers and mail clients send
 * and display it inconsistently: some use the Unicode form, some the ASCII
 * (punycode) form xn--tinglumgrd-85a.no. Existing middleware already accounts
 * for this on the eggops subdomain; TodoTwo does the same everywhere it builds
 * a link, compares a host, or receives a webhook.
 *
 * The canonical form for anything machine-readable is ASCII.
 */

export const UNICODE_APEX = 'tinglumgård.no'
export const ASCII_APEX = 'xn--tinglumgrd-85a.no'

/** Both spellings of the apex, plus the plain ASCII alias already in use. */
const KNOWN_APEXES = [ASCII_APEX, UNICODE_APEX, 'tinglumgard.no'] as const

function stripPort(host: string): string {
  // IPv6 literals are bracketed; anything else splits on the last colon.
  if (host.startsWith('[')) return host.slice(0, host.indexOf(']') + 1)
  const colon = host.lastIndexOf(':')
  return colon === -1 ? host : host.slice(0, colon)
}

export function normalizeHost(host: string | null | undefined): string {
  if (!host) return ''
  return stripPort(host.trim().toLowerCase())
}

/** True for the apex or any subdomain of it, in either spelling. */
export function isTinglumgardHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host)
  if (!normalized) return false
  return KNOWN_APEXES.some((apex) => normalized === apex || normalized.endsWith(`.${apex}`))
}

/** Convert a Unicode host to its ASCII form. Other hosts pass through. */
export function toAsciiHost(host: string | null | undefined): string {
  const normalized = normalizeHost(host)
  if (!normalized) return ''
  return normalized.replace(UNICODE_APEX, ASCII_APEX)
}

/**
 * Absolute URL for links that leave the app: magic links, webhook callbacks,
 * anything pasted into an email. Always ASCII, so it survives mail clients and
 * HTTP clients that will not encode Unicode hosts.
 */
export function absoluteUrl(path: string, baseUrlOverride?: string): string {
  const base =
    baseUrlOverride ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    'http://localhost:3003'

  const url = new URL(path, base)
  url.hostname = toAsciiHost(url.hostname) || url.hostname
  return url.toString()
}
