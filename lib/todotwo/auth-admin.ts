import { createClient } from '@supabase/supabase-js'
import { addFarmDays } from '@/lib/todotwo/time'
import { selectHandoffCandidates, type OccurrenceCandidate } from '@/lib/todotwo/domain/onboarding'

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
 * Ask Supabase Auth to deliver the link itself. This is the fallback when the
 * farm's Mailgun account is unavailable or has reached its daily quota.
 * The caller has already checked the invite list and rate limit.
 */
export async function sendProviderSignInLink(email: string, redirectTo: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_ANON_KEY
  if (!url || !anonKey) return false

  const anonClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await anonClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
  })
  return !error
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
 * First-time sign-in is also TodoTwo registration. Reuse a returning person's
 * permanent row when possible, otherwise create a Workawayer starting today.
 */
export async function registerFirstTimePerson(
  name: string,
  email: string,
  farmStartDate: string
): Promise<boolean> {
  const supabase = client().schema('todotwo')
  const normalizedEmail = email.trim().toLowerCase()
  const fullName = name.trim()
  if (!fullName || !normalizedEmail) return false

  const { data: existing, error: lookupError } = await supabase
    .from('people')
    .select('id, is_active, deleted_at')
    .ilike('email', normalizedEmail)
    .maybeSingle()
  if (lookupError) return false

  let personId = existing?.id as string | undefined
  if (personId) {
    const { error } = await supabase
      .from('people')
      .update({
        full_name: fullName,
        email: normalizedEmail,
        is_active: true,
        deleted_at: null,
        leave_date: null,
        farm_start_date: farmStartDate,
      })
      .eq('id', personId)
    if (error) return false
  } else {
    const { data: created, error } = await supabase
      .from('people')
      .insert({ full_name: fullName, email: normalizedEmail, farm_start_date: farmStartDate })
      .select('id')
      .single()
    if (error || !created) return false
    personId = created.id as string
  }

  const { data: role, error: roleLookupError } = await supabase
    .from('role_assignments')
    .select('id')
    .eq('person_id', personId)
    .eq('role', 'workawayer')
    .is('revoked_at', null)
    .maybeSingle()
  if (roleLookupError) return false
  if (!role) {
    const { error } = await supabase
      .from('role_assignments')
      .insert({ person_id: personId, role: 'workawayer' })
    if (error) return false
  }

  try {
    await scheduleOnboardingRamp(supabase, personId, farmStartDate)
  } catch (error) {
    // Registration and the sign-in email must still succeed if rota planning
    // is temporarily unavailable; the failure remains visible in server logs.
    console.error('[todotwo] onboarding schedule failed', {
      message: error instanceof Error ? error.message : 'unknown',
    })
  }

  return true
}

async function scheduleOnboardingRamp(
  db: ReturnType<ReturnType<typeof client>['schema']>,
  personId: string,
  startDate: string
): Promise<void> {
  const householdDate = addFarmDays(startDate, 3)
  const animalDate = addFarmDays(startDate, 4)
  const [{ data: projects }, { data: tasks }, { data: assignments }] = await Promise.all([
    db.from('projects').select('id, name, slug'),
    db.from('tasks_resolved').select('id, title, due_date, project_id, status')
      .in('due_date', [householdDate, animalDate]).eq('status', 'assigned'),
    db.from('task_assignments').select('task_id, person_id').is('unassigned_at', null),
  ])
  const typedProjects = (projects ?? []) as { id: string; name: string; slug: string }[]
  const householdProjects = new Set(typedProjects
    .filter((project) => /house|home|kitchen|meal|clean/i.test(`${project.name} ${project.slug}`))
    .map((project) => project.id))
  const animalProjects = new Set(typedProjects
    .filter((project) => /animal/i.test(`${project.name} ${project.slug}`))
    .map((project) => project.id))
  const rows = (tasks ?? []) as { id: string; title: string; due_date: string; project_id: string | null }[]
  const holderByTask = new Map<string, string>()
  const loadByHolder = new Map<string, number>()
  for (const assignment of (assignments ?? []) as { task_id: string; person_id: string }[]) {
    holderByTask.set(assignment.task_id, assignment.person_id)
    loadByHolder.set(assignment.person_id, (loadByHolder.get(assignment.person_id) ?? 0) + 1)
  }
  const candidate = (task: typeof rows[number]): OccurrenceCandidate | null => {
    const holderPersonId = holderByTask.get(task.id)
    return !holderPersonId || holderPersonId === personId ? null : {
      taskId: task.id, holderPersonId,
      holderLoadInWindow: loadByHolder.get(holderPersonId) ?? 0,
      dueDate: task.due_date,
    }
  }
  const household = rows
    .filter((task) => task.due_date === householdDate && task.project_id && householdProjects.has(task.project_id))
    .map(candidate).filter((item): item is OccurrenceCandidate => item !== null)
  const householdTasks = selectHandoffCandidates(household, 0)
  const animalRows = rows.filter((task) =>
    task.due_date === animalDate && task.project_id !== null && animalProjects.has(task.project_id))
  const animalCandidates = new Map(animalRows.map((task) => [task.id, candidate(task)]))
  const animalShift = [
    ['Goats', 'Chickens + Ducks'],
    ['Pigs', 'Rabbits'],
  ].map((labels) => animalRows
    .filter((task) => labels.some((label) => task.title.startsWith(label)))
    .map((task) => animalCandidates.get(task.id))
    .filter((item): item is OccurrenceCandidate => Boolean(item)))
    .filter((shift) => shift.length >= 4)
    .sort((a, b) => b.reduce((sum, item) => sum + item.holderLoadInWindow, 0) -
      a.reduce((sum, item) => sum + item.holderLoadInWindow, 0))[0] ?? []
  for (const task of [...householdTasks, ...animalShift]) {
    const { error } = await db.rpc('assign_task', { p_task_id: task.taskId, p_person_id: personId })
    if (error) throw new Error(`Could not schedule onboarding: ${error.message}`)
  }
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
