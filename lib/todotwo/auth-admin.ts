import { createClient } from '@supabase/supabase-js'

/**
 * SERVICE-ROLE CLIENT IN A REQUEST PATH — a deliberate, narrow exception.
 *
 * Standing rule R2 bans the service role outside cron handlers and scripts,
 * because it bypasses Row Level Security. This module is the single exception,
 * and it exists because sign-in mail now goes through Mailgun like the rest of
 * the farm's email rather than through Supabase's built-in mailer. Generating a
 * magic link without sending it is an auth-admin operation, and there is no
 * user session to act on behalf of — by definition, nobody is signed in yet.
 *
 * What keeps it safe:
 *
 *   - It exposes exactly one operation, and that operation reads no table.
 *     There is no query surface here for RLS to have protected.
 *   - Its only caller is app/api/todotwo/auth/send-link, which rate-limits
 *     before calling and answers identically whether or not the address has
 *     access, so it is not a membership oracle.
 *   - The generated link is emailed to the address it belongs to. It is never
 *     returned to the caller.
 *
 * If you find yourself wanting to add a second function here, that is the
 * signal to stop and use an RLS policy or a security-definer function instead.
 */

let cached: ReturnType<typeof buildAuthAdminClient> | null = null

function buildAuthAdminClient(url: string, serviceRoleKey: string) {
  // Default schema on purpose: this touches auth, never todotwo.
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function client() {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
  const serviceRoleKey = process.env.TODOTWO_SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('TodoTwo auth admin requires the Supabase URL and service-role key.')
  }

  cached = buildAuthAdminClient(url, serviceRoleKey)
  return cached
}

export interface GeneratedLink {
  actionLink: string
}

/**
 * A one-time sign-in link for an address, without sending it.
 *
 * `magiclink` requires the user to exist; `invite` creates one. TodoTwo accounts
 * are created on first sign-in from a person row an administrator prepared, so
 * the first attempt needs the second form and every later one the first. Trying
 * magiclink first keeps the common path cheap.
 */
export async function generateSignInLink(
  email: string,
  redirectTo: string
): Promise<GeneratedLink | null> {
  const supabase = client()

  const magic = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })

  if (magic.data?.properties?.action_link) {
    return { actionLink: magic.data.properties.action_link }
  }

  // No auth user yet: this is someone signing in for the first time.
  const invite = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  })

  if (invite.data?.properties?.action_link) {
    return { actionLink: invite.data.properties.action_link }
  }

  return null
}

/**
 * Records a sign-in attempt and reports whether it is within the limits.
 * Rate limiting lives in Postgres because Netlify functions are short-lived and
 * plural, which makes an in-process counter decorative.
 */
export async function claimLinkRequest(email: string, ip: string | null): Promise<boolean> {
  const supabase = client()
  const { data, error } = await supabase
    .schema('todotwo')
    .rpc('claim_link_request', { p_email: email, p_ip: ip })

  // Fail closed: if the ledger cannot be written, do not send.
  if (error) return false
  return data === true
}

/** Whether an administrator has added this address. Server-side only. */
export async function emailIsInvited(email: string): Promise<boolean> {
  const supabase = client()
  const { data, error } = await supabase
    .schema('todotwo')
    .rpc('email_is_invited', { p_email: email })

  if (error) return false
  return data === true
}
