/**
 * Guarded migration runner.
 *
 * `npm run todotwo:migrate` used to be a bare `supabase db push`, which is a
 * loaded gun: it replays every unrecorded file in supabase/migrations against
 * whichever project happens to be linked — including the ad-hoc storefront SQL
 * that predates the CLI — and the production guard lived only in the other
 * scripts, not in that one.
 *
 * This refuses production, states which project it is about to touch, and
 * pushes only the TodoTwo migrations by building a temporary project directory
 * containing one file per migration version. The deduplication is necessary
 * because supabase/migrations holds several files that parse to the same
 * version (20260130_*, and others), which the CLI cannot reconcile.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const PRODUCTION_REFS = new Set(['dofhlyvexecwlqmrzutd'])

function fail(message: string): never {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

const linkedRefPath = path.resolve(process.cwd(), 'supabase/.temp/project-ref')
if (!fs.existsSync(linkedRefPath)) {
  fail('No linked Supabase project. Run: npx supabase link --project-ref <ref>')
}

const linkedRef = fs.readFileSync(linkedRefPath, 'utf8').trim()

if (PRODUCTION_REFS.has(linkedRef)) {
  fail(
    `Refusing to migrate ${linkedRef} — that is the production project holding live orders and\n` +
      '  Vipps payment records. Production is migrated deliberately and by hand; see\n' +
      '  docs/todotwo/DEPLOYMENT.md.'
  )
}

const expectedRef = process.env.TODOTWO_DEV_PROJECT_REF
if (expectedRef && expectedRef !== linkedRef) {
  fail(`Linked project is ${linkedRef} but TODOTWO_DEV_PROJECT_REF says ${expectedRef}.`)
}

// One representative file per version, so the CLI can reconcile the history.
const source = path.resolve(process.cwd(), 'supabase/migrations')
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'todotwo-migrate-'))
const target = path.join(workdir, 'supabase', 'migrations')
fs.mkdirSync(target, { recursive: true })

fs.copyFileSync(
  path.resolve(process.cwd(), 'supabase/config.toml'),
  path.join(workdir, 'supabase', 'config.toml')
)
fs.cpSync(
  path.resolve(process.cwd(), 'supabase/.temp'),
  path.join(workdir, 'supabase', '.temp'),
  { recursive: true }
)

const seen = new Set<string>()
let copied = 0
for (const file of fs.readdirSync(source).sort()) {
  if (!file.endsWith('.sql')) continue
  const version = /^(\d+)_/.exec(file)?.[1]
  if (!version || seen.has(version)) continue
  seen.add(version)
  fs.copyFileSync(path.join(source, file), path.join(target, file))
  copied += 1
}

console.log(`\n  Project ${linkedRef} · ${copied} migration versions\n`)

const args = ['supabase', 'db', 'push', '--workdir', workdir, ...process.argv.slice(2)]

try {
  execFileSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' })
} catch {
  fail('Migration failed. Nothing further was attempted.')
} finally {
  fs.rmSync(workdir, { recursive: true, force: true })
}
