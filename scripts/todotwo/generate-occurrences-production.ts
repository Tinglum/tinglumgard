/**
 * One-time production run of generate-occurrences.ts, targeting production
 * explicitly instead of refusing it. See generate-occurrences.ts for the
 * regular (dev-only, production-refusing) version this mirrors.
 *
 * Credentials come only from PROD_TODOTWO_SUPABASE_URL /
 * PROD_TODOTWO_SUPABASE_SERVICE_ROLE_KEY — never from .env.local — so this
 * can never be run by accident against the wrong project.
 *
 *   PROD_TODOTWO_SUPABASE_URL=... PROD_TODOTWO_SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/todotwo/generate-occurrences-production.ts
 */
import { createClient } from '@supabase/supabase-js'

import { generateOccurrences } from '../../lib/todotwo/generate'

const url = process.env.PROD_TODOTWO_SUPABASE_URL
const key = process.env.PROD_TODOTWO_SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('\n  Missing PROD_TODOTWO_SUPABASE_URL or PROD_TODOTWO_SUPABASE_SERVICE_ROLE_KEY.\n')
  process.exit(1)
}

const ref = /^https:\/\/([a-z0-9]+)\.supabase\.(co|in)$/i.exec(url.trim())?.[1]
if (ref !== 'dofhlyvexecwlqmrzutd') {
  console.error(`\n  Refusing: connected ref is "${ref}", not production.\n`)
  process.exit(1)
}

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
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
