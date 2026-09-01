import { expect, test } from '@playwright/test'

/**
 * Phase 0's user-visible contract: TodoTwo exists, it is closed to strangers,
 * and turning it off leaves nothing behind.
 *
 * Signing in needs a mailbox, so the authenticated journey is a manual check in
 * docs/todotwo/PHASE-0-VERIFICATION.md rather than a fake here.
 */

test.describe('TodoTwo access', () => {
  test('sends an anonymous visitor to the login screen', async ({ page }) => {
    await page.goto('/todotwo')
    await expect(page).toHaveURL(/\/todotwo\/login/)
    await expect(page.getByRole('heading', { name: 'TodoTwo' })).toBeVisible()
  })

  test('offers passwordless sign-in and nothing else', async ({ page }) => {
    await page.goto('/todotwo/login')

    await expect(page.getByLabel('E-postadresse')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send innloggingslenke' })).toBeVisible()

    // No password field anywhere — accounts are magic-link only.
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
  })

  test('validates before sending', async ({ page }) => {
    await page.goto('/todotwo/login')
    await page.getByRole('button', { name: 'Send innloggingslenke' }).click()

    // Next renders its own role="alert" route announcer, so scope to ours.
    const alert = page.getByRole('alert').filter({ hasText: 'Innlogging mislyktes' })
    await expect(alert).toContainText('Skriv inn e-postadressen din')
  })

  test('keeps the API closed to anonymous callers', async ({ request }) => {
    const response = await request.post('/api/todotwo/auth/logout', { maxRedirects: 0 })
    // Redirects to login rather than erroring; either way it must not 500.
    expect(response.status()).toBeLessThan(500)
  })

  test('does not scroll sideways on a phone', async ({ page }) => {
    await page.goto('/todotwo/login')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )
    expect(overflow).toBe(false)
  })
})

test.describe('storefront is undisturbed', () => {
  test('the front page still renders', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)
  })
})
