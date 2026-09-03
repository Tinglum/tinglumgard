/**
 * Materialises recurring routines into dated occurrences.
 *
 *   npm run todotwo:generate
 *
 * Safe to run repeatedly: a unique index on (series_id, occurrence_date) makes
 * it idempotent, and existing occurrences are never overwritten.
 */
import path from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

import { generateOccurrences } from '../../lib/todotwo/generate'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const PRODUCTION_REFS = new Set(['ryqjwtzgkrrpxpdqgkbn'])

function fail(message: string): never {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
const key = process.env.TODOTWO_SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) fail('Missing TodoTwo Supabase environment. See docs/todotwo/SETUP.md.')

const ref = /^https:\/\/([a-z0-9]+)\.supabase\.(co|in)$/i.exec(url.trim())?.[1]
if (!ref) fail(`Not a Supabase project URL: ${url}`)
if (PRODUCTION_REFS.has(ref)) fail(`${ref} is production. Refusing to run.`)

const db = createClient(url, key, {
  db: { schema: 'todotwo' },
  auth: { autoRefreshToken: false, persistSession: false },
})

generateOccurrences(db)
  .then((result) => {
    console.log(`\n  Generated ${result.from} to ${result.to}\n`)
    console.log(`    series processed     ${result.seriesProcessed}`)
    console.log(`    occurrences created  ${result.occurrencesCreated}`)
    console.log(`    already present      ${result.occurrencesSkipped}`)
    if (result.errors.length > 0) {
      console.log(`\n  ${result.errors.length} series could not be expanded:`)
      for (const e of result.errors) console.log(`    ${e.series}: ${e.message}`)
    }
    console.log()
  })
  .catch((error) => fail(error instanceof Error ? error.message : String(error)))
