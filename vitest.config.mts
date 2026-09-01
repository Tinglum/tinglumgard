import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Scoped to tests/todotwo on purpose. The rest of this repository has no tests
 * and this config must not start asserting on it by accident.
 *
 * RLS tests live in tests/todotwo/rls and need a live database, so they run
 * from vitest.rls.config.ts instead. Playwright owns tests/todotwo/e2e.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, '.') },
  },
  test: {
    include: ['tests/todotwo/**/*.test.ts', 'tests/todotwo/**/*.test.tsx'],
    exclude: ['tests/todotwo/rls/**', 'tests/todotwo/e2e/**', 'node_modules/**'],
    environment: 'node',
    environmentMatchGlobs: [['tests/todotwo/**/*.test.tsx', 'jsdom']],
    setupFiles: ['tests/todotwo/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
})
