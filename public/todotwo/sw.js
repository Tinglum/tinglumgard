/*
 * TodoTwo service worker. Hand-written on purpose.
 *
 * next-pwa / Workbox were considered and rejected: next-pwa is effectively
 * unmaintained for Next 13.5, injects a webpack plugin into next.config.js, and
 * would ship a build step and a Workbox runtime for behaviour this file
 * expresses in a couple of hundred lines. Nothing here is compiled, which also
 * means this worker cannot break the Netlify build — it is a static file in
 * public/, exactly like the existing public/eggops-sw.js.
 *
 * Scope is /todotwo/ because the script lives at /todotwo/sw.js. The storefront
 * is deliberately outside that scope and is never touched by this worker.
 *
 * READ-ONLY OFFLINE. There is no background sync and no mutation queue. Writes
 * (completing a task) go straight to Supabase and fail visibly when offline.
 * That is the intended behaviour, not an omission.
 *
 * Cache names are duplicated in lib/todotwo/pwa/constants.ts and a unit test
 * fails if the two drift.
 *
 * Also handles `push` and `notificationclick` (below, near the end of the
 * file) for Web Push. That is unrelated to the caching above — no cache is
 * read or written for a push — and just as hand-written for the same reason.
 */

const CACHE_VERSION = 'v1'
const ASSET_CACHE = 'todotwo-assets-' + CACHE_VERSION
const PAGE_CACHE = 'todotwo-pages-' + CACHE_VERSION
const KEEP = [ASSET_CACHE, PAGE_CACHE]

const OFFLINE_URL = '/todotwo/offline'
const CACHED_AT_HEADER = 'x-todotwo-cached-at'

// Last resort, for when even the offline page was never cached.
const OFFLINE_HTML = [
  '<!doctype html><html lang="en"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  '<title>Offline — TodoTwo</title>',
  '<style>body{margin:0;min-height:100svh;display:flex;align-items:center;justify-content:center;',
  'background:#f7f7f4;color:#191d18;font:400 16px/1.5 system-ui,sans-serif;padding:2rem}',
  'main{max-width:24rem;text-align:center}h1{font-size:1.25rem;margin:0 0 .5rem}',
  'p{margin:0;color:#4c524a}</style></head><body><main>',
  '<h1>No connection</h1>',
  '<p>TodoTwo has nothing saved for this screen yet. Open it once with a signal ',
  'and it will be here next time.</p>',
  '</main></body></html>',
].join('')

// The app shell: things every TodoTwo screen needs and that contain no personal
// data. Fetched at install so a first offline launch has an icon and a manifest
// rather than a broken one.
const SHELL = [
  '/todotwo/manifest.webmanifest',
  '/todotwo/icons/icon-192.png',
  '/todotwo/icons/icon-512.png',
  '/todotwo/icons/icon-maskable-512.png',
]

/** Navigations we are willing to keep a copy of. */
function isCacheablePage(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname === '/todotwo' || url.pathname.startsWith('/todotwo/')) &&
    // The login screen and the auth callback carry one-time state. Serving a
    // stale copy of either produces a confusing loop.
    !url.pathname.startsWith('/todotwo/login') &&
    !url.pathname.startsWith('/todotwo/auth')
  )
}

/** Immutable build output. Safe to serve from cache indefinitely. */
function isBuildAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(ASSET_CACHE)
      // Individually, so one 404 does not abandon the whole install.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key)))
      )
      .then(() => primeOfflinePage())
      .then(() => self.clients.claim())
  )
})

/**
 * Pull the offline fallback into the cache while we still have the network and
 * the session cookie. It sits behind auth, so this only succeeds for a signed
 * in browser — which is the only browser that will ever need it.
 */
async function primeOfflinePage() {
  try {
    const response = await fetch(OFFLINE_URL, { credentials: 'include' })
    if (response.ok && !response.redirected) {
      await putPage(new Request(OFFLINE_URL), response.clone())
    }
  } catch (error) {
    // No network at activate time. The fallback is primed on the next
    // successful navigation instead.
  }
}

/** Store an HTML response together with the moment it was taken. */
async function putPage(request, response) {
  const body = await response.blob()
  const headers = new Headers(response.headers)
  headers.set(CACHED_AT_HEADER, new Date().toISOString())
  // Set-Cookie must never be replayed out of a cache.
  headers.delete('set-cookie')
  const cache = await caches.open(PAGE_CACHE)
  await cache.put(
    new Request(new URL(request.url).pathname),
    new Response(body, { status: 200, statusText: 'OK', headers })
  )
}

/**
 * Rewrite cached HTML so the page knows, before React hydrates, that it is
 * looking at a copy rather than at live data. Without this the banner would
 * have to guess, and a wrong guess means showing stale work as current.
 */
async function markAsCached(response) {
  const cachedAt = response.headers.get(CACHED_AT_HEADER)
  const html = await response.text()
  const marker =
    '<script>window.__TODOTWO_CACHED_AT__=' + JSON.stringify(cachedAt || '') + ';</script>'
  const index = html.indexOf('</head>')
  const patched = index === -1 ? marker + html : html.slice(0, index) + marker + html.slice(index)
  const headers = new Headers(response.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.delete('content-length')
  return new Response(patched, { status: 200, statusText: 'OK', headers })
}

let priming = false
function primeOfflineIfMissing() {
  if (priming) return
  priming = true
  caches
    .open(PAGE_CACHE)
    .then((cache) => cache.match(OFFLINE_URL))
    .then((hit) => (hit ? undefined : primeOfflinePage()))
    .catch(() => undefined)
    .then(() => {
      priming = false
    })
}

async function handleNavigation(request) {
  const url = new URL(request.url)
  try {
    const response = await fetch(request)
    // Only a clean 200 from our own origin is worth keeping. A redirect to the
    // login screen means the session went away; caching that would strand the
    // Workawayer on a login page they cannot complete offline.
    if (response.ok && !response.redirected) {
      putPage(request, response.clone()).catch(() => undefined)
      if (url.pathname !== OFFLINE_URL) primeOfflineIfMissing()
    }
    return response
  } catch (error) {
    const cache = await caches.open(PAGE_CACHE)
    const exact = await cache.match(url.pathname)
    if (exact) return markAsCached(exact)

    const fallback = (await cache.match(OFFLINE_URL)) || (await cache.match('/todotwo'))
    if (fallback) return markAsCached(fallback)

    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }
}

async function handleAsset(request) {
  const cache = await caches.open(ASSET_CACHE)
  const hit = await cache.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone()).catch(() => undefined)
  return response
}

self.addEventListener('fetch', (event) => {
  const request = event.request

  // Reads only. Anything that changes state goes to the network untouched and
  // fails honestly when there is none.
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    if (!isCacheablePage(url)) return
    event.respondWith(handleNavigation(request))
    return
  }

  if (
    isBuildAsset(url) ||
    url.pathname.startsWith('/todotwo/icons/') ||
    url.pathname === '/todotwo/manifest.webmanifest'
  ) {
    event.respondWith(handleAsset(request))
  }

  // Everything else — the Supabase calls above all — is left alone. Serving a
  // cached API response would be indistinguishable from live data.
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TODOTWO_SKIP_WAITING') self.skipWaiting()
})

/**
 * Web Push. The payload is JSON built by lib/todotwo/notifications/push-sender.ts:
 * { title, body, url }. A malformed or missing payload still shows something
 * rather than silently dropping the event — a push with no visible result is
 * exactly the failure mode that gets a site's push permission revoked.
 */
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (error) {
    payload = {}
  }

  const title = payload.title || 'TodoTwo'
  const body = payload.body || ''
  const url = payload.url || '/todotwo'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/todotwo/icons/icon-192.png',
      badge: '/todotwo/icons/icon-192.png',
      data: { url },
    })
  )
})

/** Focus an existing TodoTwo tab if there is one, otherwise open a new one. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/todotwo'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
