import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Row Level Security tests. These talk to the real development Supabase
 * project, create and destroy fixture users, and must never run against
 * production — the guard in tests/todotwo/rls/harness.ts enforces that.
 *
 * Separate from vitest.config.mts so `npm test` stays fast and offline.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, '.') },
  },
  test: {
    include: ['tests/todotwo/rls/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/todotwo/rls/load-env.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Fixtures share a database; running files in parallel makes failures lie.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
})
