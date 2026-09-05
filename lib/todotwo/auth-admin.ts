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
 * Passkey login is the same category: the WebAuthn assertion is verified
 * against a stored credential before any session exists, so there is nobody to
 * act on behalf of yet either. findWebauthnCredentialById and
 * bumpWebauthnCounter extend the exception to that lookup, and
 * mintSessionForEmail turns a verified assertion into a real Supabase session.
 *
 * What keeps it safe:
 *
 *   - generateSignInLink / generateRecoveryLink read no table — there is no
 *     query surface here for RLS to have protected — and the generated link is
 *     emailed to the address it belongs to, or (for passkey login) redeemed
 *     immediately server-side and never shown to anyone.
 *   - findWebauthnCredentialById is looked up by credential_id, a large random
 *     value minted by authenticator hardware, not a guessable human input like
 *     an email address — so unlike an email-keyed lookup, this is not a
 *     membership oracle. It is the same reasoning that moved email_is_invited
 *     behind this exception rather than exposing it as an anon-callable SQL
 *     function (see 20260903090400_todotwo_security_hardening.sql).
 *   - The callers of the sign-in-link functions rate-limit before calling and
 *     answer identically whether or not the address has access.
 *
 * If you find yourself wanting to add a function that takes an email address
 * or other guessable input and returns account-linked data, that is the signal
 * to stop and use an RLS policy or a security-definer function instead.
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

/**
 * A one-time password-reset link for an address, without sending it. Mirrors
 * generateSignInLink but requests Supabase's `recovery` link type, which lands
 * the person on the callback with a verified identity so set-password can call
 * auth.updateUser without asking for their old password.
 */
export async function generateRecoveryLink(
  email: string,
  redirectTo: string
): Promise<GeneratedLink | null> {
  const supabase = client()

  const recovery = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (recovery.data?.properties?.action_link) {
    return { actionLink: recovery.data.properties.action_link }
  }

  // 'recovery' requires an existing auth user, and in TodoTwo one is not
  // created until a person's first sign-in — an administrator adds a person
  // row, and Supabase makes the account when they first come through a link.
  // So for everyone who has never signed in, recovery fails with "User with
  // this email not found" and, because this route answers the same way no
  // matter what, they get a cheerful "a link is on its way" and no email,
  // for ever.
  //
  // For someone with no account there is no password to reset: what they
  // actually need is the way in. Fall back to the same invite/magiclink
  // ladder generateSignInLink uses, which creates the account, and let the
  // callback's password_set check land them on the set-password screen.
  return generateSignInLink(email, redirectTo)
}

export interface StoredWebauthnCredential {
  credentialId: string
  publicKey: string
  counter: number
  transports: string[] | null
  personId: string
  email: string
}

/**
 * Looks up a passkey by its credential id, joined to the owning person's auth
 * email. Safe as a broad service-role lookup (see the module doc comment):
 * credential_id is not a guessable or enumerable value.
 */
export async function findWebauthnCredentialById(
  credentialId: string
): Promise<StoredWebauthnCredential | null> {
  const supabase = client()

  const { data: row, error } = await supabase
    .schema('todotwo')
    .from('webauthn_credentials')
    .select('credential_id, public_key, counter, transports, person_id')
    .eq('credential_id', credentialId)
    .maybeSingle()

  if (error || !row) return null

  const { data: person, error: personError } = await supabase
    .schema('todotwo')
    .from('people')
    .select('auth_user_id')
    .eq('id', row.person_id as string)
    .is('deleted_at', null)
    .maybeSingle()

  if (personError || !person?.auth_user_id) return null

  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
    person.auth_user_id as string
  )

  if (authError || !authUser?.user?.email) return null

  return {
    credentialId: row.credential_id as string,
    publicKey: row.public_key as string,
    counter: Number(row.counter),
    transports: (row.transports as string[] | null) ?? null,
    personId: row.person_id as string,
    email: authUser.user.email,
  }
}

/**
 * Bumps a passkey's stored counter after a successful assertion, only if the
 * new value is strictly greater than what is stored — a stale or repeated
 * counter is the standard signal of a cloned authenticator.
 */
export async function bumpWebauthnCounter(credentialId: string, counter: number): Promise<void> {
  const supabase = client()

  await supabase
    .schema('todotwo')
    .from('webauthn_credentials')
    .update({ counter, last_used_at: new Date().toISOString() })
    .eq('credential_id', credentialId)
    .lt('counter', counter)
}

/**
 * Mints a real Supabase session for an address that has just been verified by
 * some other means (here, a WebAuthn assertion) — the standard technique for
 * bridging a custom authentication method into Supabase auth. A magic link is
 * generated but never sent or shown to anyone; only its token is redeemed
 * immediately, server-side, against the anon-key client, which is the same
 * client an end user's browser would use.
 */
export async function mintSessionForEmail(
  email: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const supabase = client()

  const generated = await supabase.auth.admin.generateLink({ type: 'magiclink', email })
  const hashedToken = generated.data?.properties?.hashed_token
  if (!hashedToken) return null

  const url = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const anonClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await anonClient.auth.verifyOtp({
    token_hash: hashedToken,
    type: 'magiclink',
  })

  if (error || !data.session) return null

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  }
}
