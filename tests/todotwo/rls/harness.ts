import { createClient } from '@supabase/supabase-js'

/**
 * Clients are built through named factories so the schema-bound return types
 * are inferred. Annotating with SupabaseClient defaults the schema generic to
 * "public" and will not typecheck against a todotwo-bound client.
 */
function buildSchemaClient(url: string, key: string) {
  return createClient(url, key, {
    db: { schema: 'todotwo' },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function buildDefaultClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type TodoTwoTestClient = ReturnType<typeof buildSchemaClient>
export type DefaultTestClient = ReturnType<typeof buildDefaultClient>

/**
 * Fixtures for Row Level Security tests.
 *
 * The point of these tests is that hiding a button is not security. Each
 * fixture signs in as a real Supabase user and issues real queries, so what is
 * asserted is what Postgres actually enforces.
 *
 * Fixture users get a password purely so the tests can sign in without a
 * mailbox. The application itself uses magic links only.
 */

const PRODUCTION_REFS = new Set([
  // The live Tinglumgård project. These tests create and delete data; they must
  // never point here, whatever the environment says.
  'ryqjwtzgkrrpxpdqgkbn',
])

export interface RlsEnv {
  url: string
  anonKey: string
  serviceRoleKey: string
  projectRef: string
}

export function readRlsEnv(): RlsEnv | null {
  const url = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.TODOTWO_SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey || !serviceRoleKey) return null

  const match = /^https:\/\/([a-z0-9]+)\.supabase\.(co|in)$/i.exec(url.trim())
  if (!match) throw new Error(`Not a Supabase project URL: ${url}`)

  const projectRef = match[1]

  if (PRODUCTION_REFS.has(projectRef)) {
    throw new Error(
      `Refusing to run RLS tests against ${projectRef}: that is a production project. ` +
        'Point NEXT_PUBLIC_TODOTWO_SUPABASE_URL at the development project.'
    )
  }

  const expected = process.env.TODOTWO_DEV_PROJECT_REF
  if (expected && expected !== projectRef) {
    throw new Error(
      `Connected project ${projectRef} does not match TODOTWO_DEV_PROJECT_REF (${expected}).`
    )
  }

  return { url, anonKey, serviceRoleKey, projectRef }
}

export function adminClient(env: RlsEnv): TodoTwoTestClient {
  return buildSchemaClient(env.url, env.serviceRoleKey)
}

/** Service-role client bound to the default schema, for auth admin calls. */
export function adminAuthClient(env: RlsEnv): DefaultTestClient {
  return buildDefaultClient(env.url, env.serviceRoleKey)
}

export interface Actor {
  email: string
  authUserId: string
  personId: string
  /** Signed-in, anon-key client bound to the todotwo schema. RLS applies. */
  db: TodoTwoTestClient
}

export const FIXTURE_PASSWORD = 'todotwo-rls-fixture-password-2026'
const FIXTURE_PREFIX = 'rls-fixture-'

function fixtureEmail(label: string): string {
  return `${FIXTURE_PREFIX}${label}-${Date.now()}@todotwo.invalid`
}

/**
 * Creates an auth user, a matching person, and optionally roles, then returns a
 * client signed in as them.
 */
export async function createActor(
  env: RlsEnv,
  label: string,
  roles: string[],
  opts: { fullName?: string; isActive?: boolean } = {}
): Promise<Actor> {
  const email = fixtureEmail(label)
  const auth = adminAuthClient(env)
  const admin = adminClient(env)

  const { data: created, error: createError } = await auth.auth.admin.createUser({
    email,
    password: FIXTURE_PASSWORD,
    email_confirm: true,
  })
  if (createError || !created.user) {
    throw new Error(`Could not create fixture user ${label}: ${createError?.message}`)
  }

  const { data: person, error: personError } = await admin
    .from('people')
    .insert({
      auth_user_id: created.user.id,
      full_name: opts.fullName ?? `RLS Fixture ${label}`,
      email,
      is_active: opts.isActive ?? true,
    })
    .select('id')
    .single()

  if (personError || !person) {
    throw new Error(`Could not create fixture person ${label}: ${personError?.message}`)
  }

  if (roles.length > 0) {
    const { error: roleError } = await admin
      .from('role_assignments')
      .insert(roles.map((role) => ({ person_id: person.id as string, role })))
    if (roleError) {
      throw new Error(`Could not assign roles to ${label}: ${roleError.message}`)
    }
  }

  const signedIn = buildSchemaClient(env.url, env.anonKey)

  const { error: signInError } = await signedIn.auth.signInWithPassword({
    email,
    password: FIXTURE_PASSWORD,
  })
  if (signInError) {
    throw new Error(`Could not sign in fixture ${label}: ${signInError.message}`)
  }

  return { email, authUserId: created.user.id, personId: person.id as string, db: signedIn }
}

/** An unauthenticated client — what a stranger with the publishable key gets. */
export function anonymousClient(env: RlsEnv): TodoTwoTestClient {
  return buildSchemaClient(env.url, env.anonKey)
}

export async function destroyActor(env: RlsEnv, actor: Actor): Promise<void> {
  const admin = adminClient(env)
  const auth = adminAuthClient(env)

  await admin.from('role_assignments').delete().eq('person_id', actor.personId)
  await admin.from('people_private').delete().eq('person_id', actor.personId)
  await admin.from('people').delete().eq('id', actor.personId)
  await auth.auth.admin.deleteUser(actor.authUserId)
}

/** Removes anything a crashed run left behind. */
export async function cleanupFixtures(env: RlsEnv): Promise<void> {
  const auth = adminAuthClient(env)
  const admin = adminClient(env)

  const { data } = await auth.auth.admin.listUsers({ page: 1, perPage: 200 })
  const stale = (data?.users ?? []).filter((user) => user.email?.startsWith(FIXTURE_PREFIX))

  for (const user of stale) {
    const { data: people } = await admin.from('people').select('id').eq('auth_user_id', user.id)
    for (const person of people ?? []) {
      await admin.from('role_assignments').delete().eq('person_id', person.id as string)
      await admin.from('people_private').delete().eq('person_id', person.id as string)
      await admin.from('people').delete().eq('id', person.id as string)
    }
    await auth.auth.admin.deleteUser(user.id)
  }
}
