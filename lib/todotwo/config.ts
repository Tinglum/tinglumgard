import { z } from 'zod'

/**
 * TodoTwo environment configuration.
 *
 * Deliberately lazy: nothing is validated at module load, because this file is
 * imported from the shared middleware and must never break the storefront build
 * on Netlify when TodoTwo variables are absent. Validation happens the first
 * time TodoTwo actually needs a value.
 *
 * NEXT_PUBLIC_* values are read as static property accesses so Next can inline
 * them into the client bundle. Do not refactor them into dynamic lookups.
 */

const publicSchema = z.object({
  supabaseUrl: z.string().url('NEXT_PUBLIC_TODOTWO_SUPABASE_URL must be a URL'),
  supabaseAnonKey: z.string().min(20, 'NEXT_PUBLIC_TODOTWO_SUPABASE_ANON_KEY is missing or too short'),
})

/**
 * The VAPID public key, read separately from getPublicConfig() rather than
 * folded into publicSchema: it gates one optional feature (push) rather than
 * the whole module, so its absence should disable the "Enable notifications"
 * toggle, not throw for every other TodoTwo page. Null means push is off.
 */
export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_TODOTWO_VAPID_PUBLIC_KEY || null
}

/**
 * Note: the service-role credential is deliberately absent here. It is read
 * only inside lib/todotwo/db-privileged.ts, so that exactly one file in the
 * codebase mentions it and the isolation guard test can enforce that.
 */
const serverSchema = z.object({
  devProjectRef: z.string().min(1).optional(),
  seedAllowed: z.boolean(),
})

export type TodoTwoPublicConfig = z.infer<typeof publicSchema>
export type TodoTwoServerConfig = z.infer<typeof serverSchema>

let cachedPublic: TodoTwoPublicConfig | null = null
let cachedServer: TodoTwoServerConfig | null = null

function formatIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `  - ${issue.message}`).join('\n')
}

/**
 * The feature flag. Read directly rather than through the schema so that a
 * disabled TodoTwo never requires any other variable to be present.
 */
export function isTodoTwoEnabled(): boolean {
  return process.env.TODOTWO_ENABLED === 'true'
}

export function getPublicConfig(): TodoTwoPublicConfig {
  if (cachedPublic) return cachedPublic

  const parsed = publicSchema.safeParse({
    supabaseUrl: process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_ANON_KEY,
  })

  if (!parsed.success) {
    throw new Error(
      `TodoTwo is missing required public environment variables:\n${formatIssues(parsed.error)}\n` +
        'See docs/todotwo/SETUP.md.'
    )
  }

  cachedPublic = parsed.data
  return cachedPublic
}

export function getServerConfig(): TodoTwoServerConfig {
  if (cachedServer) return cachedServer

  const parsed = serverSchema.safeParse({
    devProjectRef: process.env.TODOTWO_DEV_PROJECT_REF || undefined,
    seedAllowed: process.env.TODOTWO_SEED_ALLOWED === 'true',
  })

  if (!parsed.success) {
    throw new Error(
      `TodoTwo server environment is invalid:\n${formatIssues(parsed.error)}\n` +
        'See docs/todotwo/SETUP.md.'
    )
  }

  cachedServer = parsed.data
  return cachedServer
}

/**
 * The Supabase project ref the app is currently pointed at, derived from the
 * URL rather than trusted from a separate variable. Used by the seed guard so
 * that a mismatched TODOTWO_DEV_PROJECT_REF cannot be used to wave a seed
 * through against the wrong database.
 */
export function getConnectedProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_TODOTWO_SUPABASE_URL
  if (!url) return null
  const match = /^https:\/\/([a-z0-9]+)\.supabase\.(co|in)$/i.exec(url.trim())
  return match ? match[1] : null
}

/** Reset caches. Test helper only. */
export function __resetConfigCacheForTests(): void {
  cachedPublic = null
  cachedServer = null
}
