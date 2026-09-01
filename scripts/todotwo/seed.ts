/**
 * TodoTwo development seed.
 *
 * Refuses to run unless TODOTWO_SEED_ALLOWED=true and the connected project ref
 * matches TODOTWO_DEV_PROJECT_REF, and refuses outright against any known
 * production project. It only ever writes to the todotwo schema.
 *
 * IMPORTANT (standing rule R5a): every person here is invented. The development
 * database must never contain a real applicant, Workawayer, phone number or
 * emergency contact.
 *
 *   npm run todotwo:seed
 */
import path from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const PRODUCTION_REFS = new Set(['ryqjwtzgkrrpxpdqgkbn'])

function fail(message: string): never {
  console.error(`\n  Seed aborted: ${message}\n`)
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
const serviceRoleKey = process.env.TODOTWO_SUPABASE_SERVICE_ROLE_KEY

if (!url) fail('NEXT_PUBLIC_TODOTWO_SUPABASE_URL is not set. See docs/todotwo/SETUP.md.')
if (!serviceRoleKey) fail('TODOTWO_SUPABASE_SERVICE_ROLE_KEY is not set. See docs/todotwo/SETUP.md.')

if (process.env.TODOTWO_SEED_ALLOWED !== 'true') {
  fail('TODOTWO_SEED_ALLOWED is not "true". This guard exists so seeding cannot reach production.')
}

const refMatch = /^https:\/\/([a-z0-9]+)\.supabase\.(co|in)$/i.exec(url.trim())
if (!refMatch) fail(`NEXT_PUBLIC_TODOTWO_SUPABASE_URL is not a Supabase project URL: ${url}`)
const connectedRef = refMatch[1]

if (PRODUCTION_REFS.has(connectedRef)) {
  fail(`${connectedRef} is a production project. Never seed it.`)
}

const expectedRef = process.env.TODOTWO_DEV_PROJECT_REF
if (!expectedRef) fail('TODOTWO_DEV_PROJECT_REF is not set.')
if (expectedRef !== connectedRef) {
  fail(`Connected project is ${connectedRef} but TODOTWO_DEV_PROJECT_REF says ${expectedRef}.`)
}

const db = createClient(url, serviceRoleKey, {
  db: { schema: 'todotwo' },
  auth: { autoRefreshToken: false, persistSession: false },
})

const LOCATIONS = [
  { slug: 'hovedhuset', name: 'Hovedhuset', kind: 'building', sort_order: 10 },
  { slug: 'laven', name: 'Låven', kind: 'building', sort_order: 20 },
  { slug: 'verkstedet', name: 'Verkstedet', kind: 'building', sort_order: 30 },
  { slug: 'honsehuset', name: 'Hønsehuset', kind: 'building', sort_order: 40 },
  { slug: 'geiteinnhegningen', name: 'Geiteinnhegningen', kind: 'enclosure', sort_order: 50 },
  { slug: 'grisebeitet', name: 'Grisebeitet', kind: 'enclosure', sort_order: 60 },
  { slug: 'drivhuset', name: 'Drivhuset', kind: 'building', sort_order: 70 },
  { slug: 'hytta-nord', name: 'Hytta nord', kind: 'building', sort_order: 80 },
  { slug: 'hytta-sor', name: 'Hytta sør', kind: 'building', sort_order: 90 },
  { slug: 'jordet-ovre', name: 'Øvre jordet', kind: 'field', sort_order: 100 },
  { slug: 'jordet-nedre', name: 'Nedre jordet', kind: 'field', sort_order: 110 },
  { slug: 'skogen', name: 'Skogen', kind: 'forest', sort_order: 120 },
  { slug: 'elva', name: 'Elva', kind: 'water', sort_order: 130 },
] as const

async function main() {
  console.log(`\n  Seeding todotwo schema on ${connectedRef} …\n`)

  const { error: locationError } = await db
    .from('locations')
    .upsert(LOCATIONS as unknown as Record<string, unknown>[], { onConflict: 'slug' })

  if (locationError) fail(`locations: ${locationError.message}`)
  console.log(`  locations       ${LOCATIONS.length} upserted`)

  const { error: settingsError } = await db.from('settings').upsert(
    [
      {
        key: 'farm.name',
        value: 'Tinglumgård',
        description: 'Vist i overskrifter og e-post.',
      },
      {
        key: 'farm.timezone',
        value: 'Europe/Oslo',
        description: 'Referanse. Koden bruker FARM_TZ i lib/todotwo/time.ts.',
      },
      {
        key: 'seed.synthetic_only',
        value: true,
        description:
          'Utviklingsdatabasen skal aldri inneholde ekte persondata. Se STANDING-RULES R5a.',
      },
    ],
    { onConflict: 'key' }
  )

  if (settingsError) fail(`settings: ${settingsError.message}`)
  console.log('  settings        3 upserted')

  console.log(
    '\n  Done. No people were created: accounts are linked to auth users, so run\n' +
      '  scripts/todotwo/create-admin.ts to give Kenneth an account.\n'
  )
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)))
