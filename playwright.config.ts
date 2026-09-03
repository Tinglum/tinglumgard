import { defineConfig, devices } from '@playwright/test'

const PORT = 3003
const BASE_URL = process.env.TODOTWO_E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`

/**
 * End-to-end tests for TodoTwo only. The storefront has no e2e coverage and
 * this config deliberately does not add any — that is not Phase 0's job.
 *
 * Mobile viewport by default: TodoTwo is used on a phone, in a barn.
 */
export default defineConfig({
  testDir: './tests/todotwo/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    locale: 'nb-NO',
    timezoneId: 'Europe/Oslo',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.TODOTWO_E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
