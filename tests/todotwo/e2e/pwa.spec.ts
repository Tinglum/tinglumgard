import { expect, test, type Page } from '@playwright/test'

/**
 * Land on the login screen with the worker registered and activated.
 *
 * Nothing here waits around on that page: signed out, the site navigates away
 * from /todotwo/login to / a few seconds after load, and a test that lingers
 * loses its execution context mid-evaluate. That redirect predates Phase 7.
 *
 * An active registration — not a controlled page — is what the offline tests
 * need: the worker handles any in-scope navigation once it is activated,
 * whether or not the document that registered it is under its control.
 */
async function withActiveWorker(page: Page): Promise<void> {
  await page.goto('/todotwo/login', { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    return registration.active?.state
  })
}

/**
 * Phase 7's user-visible contract: TodoTwo is installable, it registers a
 * worker scoped to itself and nothing else, and losing the network produces an
 * honest screen rather than the browser's dinosaur.
 *
 * Everything here runs signed out. The cached-Today path needs a mailbox to
 * sign in, so it is a manual check in docs/todotwo/PWA.md — a fake session
 * would prove nothing about the real one.
 */

test.describe('installability', () => {
  test('the layout links a manifest and declares the installed look', async ({ page }) => {
    await page.goto('/todotwo/login')

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/todotwo/manifest.webmanifest'
    )
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#2f5d45')
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
      'content',
      'yes'
    )
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/todotwo/icons/apple-touch-icon-180.png'
    )
    // The storefront's root layout emits a viewport tag too; TodoTwo's own is
    // the one that carries viewport-fit, so assert on the last of them.
    await expect(page.locator('meta[name="viewport"]').last()).toHaveAttribute(
      'content',
      /viewport-fit=cover/
    )
  })

  test('the manifest is served, parses, and scopes itself to /todotwo', async ({ request }) => {
    const response = await request.get('/todotwo/manifest.webmanifest')
    expect(response.status()).toBe(200)

    const manifest = JSON.parse(await response.text())
    expect(manifest.name).toBe('TodoTwo — Tinglumgård')
    expect(manifest.display).toBe('standalone')
    expect(manifest.scope).toBe('/todotwo')
    expect(manifest.start_url).toBe('/todotwo')
    expect(manifest.theme_color).toBe('#2f5d45')
    expect(manifest.shortcuts.map((s: { url: string }) => s.url)).toEqual([
      '/todotwo',
      '/todotwo/upcoming',
    ])
  })

  test('every icon the manifest names really exists', async ({ request }) => {
    const manifest = JSON.parse(await (await request.get('/todotwo/manifest.webmanifest')).text())
    const sources: string[] = [
      ...manifest.icons.map((icon: { src: string }) => icon.src),
      ...manifest.shortcuts.flatMap((shortcut: { icons: { src: string }[] }) =>
        shortcut.icons.map((icon) => icon.src)
      ),
    ]

    for (const src of sources) {
      const response = await request.get(src)
      expect(response.status(), `${src}`).toBe(200)
      expect(response.headers()['content-type']).toContain('image/png')
    }
  })
})

test.describe('service worker', () => {
  test('is served as JavaScript, allowed to widen its scope to /todotwo', async ({ request }) => {
    const response = await request.get('/todotwo/sw.js')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('javascript')
    // Without this header the worker cannot control /todotwo itself, which is
    // the app's start_url. See next.config.js.
    expect(response.headers()['service-worker-allowed']).toBe('/todotwo')
  })

  test('registers, activates and takes control of the page', async ({ page }) => {
    await page.goto('/todotwo/login')

    const scope = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      return registration.scope
    })
    // /todotwo, not /todotwo/ — the wider scope that covers the Today view.
    expect(scope).toMatch(/\/todotwo$/)

    // Control arrives via clients.claim() on activate; a reload guarantees it.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect
      .poll(async () => {
        try {
          return await page.evaluate(() => !!navigator.serviceWorker.controller)
        } catch {
          return false
        }
      })
      .toBe(true)
  })

  test('leaves the storefront alone', async ({ page }) => {
    await page.goto('/todotwo/login')
    await page.evaluate(() => navigator.serviceWorker.ready)

    await page.goto('/')
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller)
    expect(controlled).toBe(false)
  })
})

test.describe('offline', () => {
  test('answers a lost connection with an explanation, not a browser error', async ({
    page,
    context,
  }) => {
    await withActiveWorker(page)

    await context.setOffline(true)
    try {
      // Signed out, nothing authenticated was ever cached, so this exercises
      // the worker's last-resort fallback rather than a cached Today.
      await page.goto('/todotwo')
      await expect(page.getByRole('heading', { name: 'No connection' })).toBeVisible()
    } finally {
      await context.setOffline(false)
    }
  })

  test('serves a cached screen and stamps it as a copy', async ({ page, context }) => {
    await withActiveWorker(page)

    // Signing in needs a mailbox, so the cache is seeded here with a stand-in
    // for the Today document the worker would have stored. What is under test
    // is the worker's behaviour when the network is gone and a copy exists.
    const cachedAt = '2026-01-02T03:04:05.000Z'
    await page.evaluate(async (stamp) => {
      const cache = await caches.open('todotwo-pages-v1')
      await cache.put(
        new Request('/todotwo'),
        new Response('<html><head><title>Today</title></head><body><h1>Feed the pigs</h1></body></html>', {
          headers: { 'content-type': 'text/html; charset=utf-8', 'x-todotwo-cached-at': stamp },
        })
      )
    }, cachedAt)

    await context.setOffline(true)
    try {
      await page.goto('/todotwo')
      await expect(page.getByRole('heading', { name: 'Feed the pigs' })).toBeVisible()
      // The marker the connection banner reads. Without it, cached work would
      // be indistinguishable from live work.
      expect(await page.evaluate(() => (window as any).__TODOTWO_CACHED_AT__)).toBe(cachedAt)
    } finally {
      await context.setOffline(false)
    }
  })
})
