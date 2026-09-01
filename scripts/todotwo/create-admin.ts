/**
 * Creates a TodoTwo account and links it to a person.
 *
 * Accounts are administrator-created by design: the login screen sets
 * shouldCreateUser: false, so a stranger who finds /todotwo/login cannot make
 * one for themselves.
 *
 *   npm run todotwo:create-admin -- kenneth@tinglum.com "Kenneth Tinglum" super_admin
 *
 * No password is set or handled. The person signs in with a magic link.
 */
import path from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const PRODUCTION_REFS = new Set(['ryqjwtzgkrrpxpdqgkbn'])
const VALID_ROLES = ['super_admin', 'farm_admin', 'coordinator', 'workawayer', 'applicant']

function fail(message: string): never {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

const [email, fullName, ...roles] = process.argv.slice(2)

if (!email || !fullName) {
  fail(
    'Usage: npm run todotwo:create-admin -- <email> "<full name>" [role ...]\n' +
      `  roles: ${VALID_ROLES.join(', ')} (default: super_admin)`
  )
}

const wantedRoles = roles.length > 0 ? roles : ['super_admin']
for (const role of wantedRoles) {
  if (!VALID_ROLES.includes(role)) fail(`Unknown role "${role}". Valid: ${VALID_ROLES.join(', ')}`)
}

const url = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
const serviceRoleKey = process.env.TODOTWO_SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceRoleKey) fail('Missing TodoTwo Supabase environment. See docs/todotwo/SETUP.md.')

const refMatch = /^https:\/\/([a-z0-9]+)\.supabase\.(co|in)$/i.exec(url.trim())
if (!refMatch) fail(`Not a Supabase project URL: ${url}`)
const connectedRef = refMatch[1]

if (PRODUCTION_REFS.has(connectedRef)) {
  fail(
    `Refusing to run against ${connectedRef}, which is production. ` +
      'Create production accounts deliberately, not with a dev script.'
  )
}

const auth = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const db = createClient(url, serviceRoleKey, {
  db: { schema: 'todotwo' },
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`\n  Project ${connectedRef}\n`)

  const { data: list } = await auth.auth.admin.listUsers({ page: 1, perPage: 1000 })
  let authUser = list?.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())

  if (authUser) {
    console.log(`  auth user       exists (${authUser.id})`)
  } else {
    const { data: created, error } = await auth.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (error || !created.user) fail(`Could not create auth user: ${error?.message}`)
    authUser = created.user
    console.log(`  auth user       created (${authUser.id})`)
  }

  const { data: existingPerson } = await db
    .from('people')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  let personId = existingPerson?.id as string | undefined

  if (personId) {
    console.log(`  person          exists (${personId})`)
  } else {
    const { data: person, error } = await db
      .from('people')
      .insert({ auth_user_id: authUser.id, full_name: fullName, email })
      .select('id')
      .single()
    if (error || !person) fail(`Could not create person: ${error?.message}`)
    personId = person.id as string
    console.log(`  person          created (${personId})`)
  }

  for (const role of wantedRoles) {
    const { data: held } = await db
      .from('role_assignments')
      .select('id')
      .eq('person_id', personId)
      .eq('role', role)
      .is('revoked_at', null)
      .maybeSingle()

    if (held) {
      console.log(`  role            ${role} (already held)`)
      continue
    }

    const { error } = await db.from('role_assignments').insert({ person_id: personId, role })
    if (error) fail(`Could not assign ${role}: ${error.message}`)
    console.log(`  role            ${role} granted`)
  }

  console.log(`\n  Done. ${email} can now sign in at /todotwo/login with a magic link.\n`)
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)))
