import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Structural guards. These are the rules that a code review would otherwise
 * have to catch every time, so they are asserted instead.
 */

const REPO_ROOT = path.resolve(__dirname, '../../..')

const REQUEST_PATH_DIRS = [
  'app/todotwo',
  'app/api/todotwo',
  'components/todotwo',
  'lib/todotwo',
]

/** Files allowed to reference the service-role credential at all. */
const PRIVILEGED_ALLOWLIST = new Set(
  [
    'lib/todotwo/db-privileged.ts',
  ].map((p) => path.normalize(p))
)

function walk(dir: string): string[] {
  const absolute = path.join(REPO_ROOT, dir)
  if (!fs.existsSync(absolute)) return []

  const out: string[] = []
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(relative))
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(relative)
    }
  }
  return out
}

describe('service-role isolation', () => {
  const files = REQUEST_PATH_DIRS.flatMap(walk)

  it('finds TodoTwo source to scan', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it('never references the service-role key outside the privileged module', () => {
    const offenders = files.filter((file) => {
      if (PRIVILEGED_ALLOWLIST.has(path.normalize(file))) return false
      const source = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8')
      return (
        source.includes('TODOTWO_SUPABASE_SERVICE_ROLE_KEY') ||
        source.includes('SUPABASE_SERVICE_ROLE_KEY')
      )
    })

    expect(offenders, `service-role key referenced in: ${offenders.join(', ')}`).toEqual([])
  })

  it('never imports the storefront service-role client', () => {
    const offenders = files.filter((file) => {
      const source = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8')
      return /from\s+['"]@\/lib\/supabase\/server['"]/.test(source) || /\bsupabaseAdmin\b/.test(source)
    })

    expect(offenders, `storefront admin client used in: ${offenders.join(', ')}`).toEqual([])
  })

  it('never imports the privileged client into a request path', () => {
    const requestPaths = ['app/todotwo', 'app/api/todotwo', 'components/todotwo'].flatMap(walk)

    const offenders = requestPaths.filter((file) => {
      const source = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8')
      return source.includes('db-privileged') || source.includes('getPrivilegedClientForCronOnly')
    })

    expect(offenders, `privileged client reached a request path: ${offenders.join(', ')}`).toEqual(
      []
    )
  })
})

describe('storefront isolation', () => {
  it('modifies no shared file outside the documented allowlist', () => {
    // Compares against main rather than trusting a reviewer to notice.
    //
    // Both committed and uncommitted work counts: `git diff main` covers the
    // working tree, and `ls-files --others` catches new files that have not
    // been added yet. Using `main...HEAD` alone would pass vacuously before the
    // first commit on a branch, which is exactly when a mistake is likeliest.
    let changed: string
    try {
      const versus = execFileSync('git', ['diff', '--name-only', 'main'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      })
      const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      })
      changed = `${versus}\n${untracked}`
    } catch {
      // Detached checkout or missing main (CI shallow clone): nothing to assert.
      return
    }

    const allowedShared = new Set([
      'middleware.ts',
      'package.json',
      'package-lock.json',
      'vitest.config.mts',
      'vitest.rls.config.mts',
      
      'playwright.config.ts',
      'supabase/config.toml',
      'supabase/.gitignore',
      '.github/workflows/quality-guard.yml',
      '.gitignore',
    ])

    // Editor and agent tooling, untracked on main before this branch existed.
    const isTooling = (file: string) => file.startsWith('.claude/')

    const isTodoTwoOwned = (file: string) =>
      file.startsWith('app/todotwo/') ||
      file.startsWith('app/api/todotwo/') ||
      file.startsWith('app/api/cron/todotwo-') ||
      file.startsWith('components/todotwo/') ||
      file.startsWith('lib/todotwo/') ||
      file.startsWith('tests/todotwo/') ||
      file.startsWith('docs/todotwo/') ||
      file.startsWith('scripts/todotwo/') ||
      /^supabase\/migrations\/\d+_todotwo_/.test(file)

    const offenders = changed
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) => !isTodoTwoOwned(file) && !allowedShared.has(file) && !isTooling(file))

    expect(offenders, `unexpected shared files changed: ${offenders.join(', ')}`).toEqual([])
  })
})

describe('migration hygiene', () => {
  const migrationsDir = path.join(REPO_ROOT, 'supabase/migrations')
  const todoTwoMigrations = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.includes('_todotwo_') && name.endsWith('.sql'))

  it('ships at least the Phase 0 migrations', () => {
    expect(todoTwoMigrations.length).toBeGreaterThanOrEqual(3)
  })

  it('names every migration with a sortable timestamp', () => {
    for (const name of todoTwoMigrations) {
      expect(name, `bad migration name: ${name}`).toMatch(/^\d{14}_todotwo_[a-z0-9_]+\.sql$/)
    }
  })

  it('gives every migration a rollback block', () => {
    for (const name of todoTwoMigrations) {
      const source = fs.readFileSync(path.join(migrationsDir, name), 'utf8')
      expect(source, `missing ROLLBACK block: ${name}`).toContain('-- ROLLBACK:')
    }
  })

  it('touches nothing outside the todotwo schema', () => {
    for (const name of todoTwoMigrations) {
      const source = fs.readFileSync(path.join(migrationsDir, name), 'utf8')
      const statements = source
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')

      // Any DDL naming public.* would be reaching into the storefront.
      expect(statements, `${name} references public schema objects`).not.toMatch(
        /\b(create|alter|drop)\s+table\s+(if\s+(not\s+)?exists\s+)?public\./i
      )
    }
  })

  it('never drops a non-todotwo object', () => {
    for (const name of todoTwoMigrations) {
      const source = fs.readFileSync(path.join(migrationsDir, name), 'utf8')
      const dropLines = source
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .filter((line) => /\bdrop\s+(table|schema|function|type|policy)/i.test(line))

      for (const line of dropLines) {
        expect(line, `${name}: drop outside todotwo — ${line.trim()}`).toMatch(/todotwo/i)
      }
    }
  })
})
