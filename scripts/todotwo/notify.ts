/**
 * Drains the TodoTwo notification outbox from a terminal.
 *
 *   npx tsx scripts/todotwo/notify.ts
 *   npx tsx scripts/todotwo/notify.ts --limit 5
 *   npx tsx scripts/todotwo/notify.ts --dry-run
 *
 * Same code path as app/api/cron/todotwo-notifications, so what happens here is
 * what happens on the schedule. Safe to run repeatedly: rows are claimed before
 * they are sent and the dedupe key means there is only ever one row per
 * notification.
 *
 * --dry-run reports what would be attempted and sends nothing. It does not
 * touch the queue, so a dry run leaves the rows exactly as it found them.
 *
 * There is no npm script for this: package.json is out of scope for the phase
 * that added the file. Invoke it with npx tsx as above.
 */
import path from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

import { dispatchOutbox } from '../../lib/todotwo/notifications/dispatch'
import { getMailerConfig } from '../../lib/todotwo/notifications/mailer'
import { MAX_ATTEMPTS } from '../../lib/todotwo/notifications/retry'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const PRODUCTION_REFS = new Set(['dofhlyvexecwlqmrzutd'])

function fail(message: string): never {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitIndex = args.indexOf('--limit')
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : undefined
if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
  fail('--limit takes a positive whole number.')
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

async function main() {
  if (dryRun) {
    const { data, error } = await db
      .from('notification_outbox')
      .select('id, recipient_email, subject, attempts, next_attempt_at, status')
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .lte('next_attempt_at', new Date().toISOString())
      .order('next_attempt_at', { ascending: true })
      .limit(limit ?? 50)

    if (error) fail(error.message)

    console.log(`\n  ${data?.length ?? 0} notifications due. Nothing was sent.\n`)
    for (const row of data ?? []) {
      console.log(`    ${row.recipient_email}  attempt ${Number(row.attempts) + 1}  ${row.subject}`)
    }
    console.log()
    return
  }

  if (!getMailerConfig()) {
    console.log('\n  MAILGUN_API_KEY or MAILGUN_DOMAIN is absent. Nothing will be sent and the queue')
    console.log('  will be left exactly as it is.\n')
  }

  const result = await dispatchOutbox(db, limit ? { limit } : {})

  console.log()
  console.log(`    configured   ${result.configured}`)
  console.log(`    considered   ${result.considered}`)
  console.log(`    sent         ${result.sent}`)
  console.log(`    retrying     ${result.retrying}`)
  console.log(`    failed       ${result.failed}`)
  console.log(`    skipped      ${result.skipped}`)

  if (result.errors.length > 0) {
    console.log(`\n  ${result.errors.length} rows could not be updated:`)
    for (const e of result.errors) console.log(`    ${e.id}: ${e.message}`)
  }
  console.log()
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)))
