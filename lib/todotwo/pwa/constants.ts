/**
 * Values shared between the app and the service worker.
 *
 * The service worker itself is plain JavaScript in `public/todotwo/sw.js` — it
 * runs outside the bundle and cannot import from here. The two therefore hold
 * the same literals twice, and `tests/todotwo/unit/pwa-sw-contract.test.ts`
 * fails if they drift apart. That is deliberate: a silent mismatch would mean
 * the offline banner reads a cache the worker never writes.
 */

/** Bump when the cached shape changes; old caches are deleted on activate. */
export const TODOTWO_CACHE_VERSION = 'v1' as const

export const TODOTWO_ASSET_CACHE = `todotwo-assets-${TODOTWO_CACHE_VERSION}` as const
export const TODOTWO_PAGE_CACHE = `todotwo-pages-${TODOTWO_CACHE_VERSION}` as const

export const TODOTWO_SW_URL = '/todotwo/sw.js' as const

/**
 * The scope we want: it includes `/todotwo` itself, which the default scope of
 * a script in that directory (`/todotwo/`) does not — scope matching is a plain
 * string prefix. Widening it requires the `Service-Worker-Allowed` header set
 * in next.config.js.
 */
export const TODOTWO_SW_SCOPE = '/todotwo' as const

/** What we get if that header does not survive the CDN. Still useful. */
export const TODOTWO_SW_FALLBACK_SCOPE = '/todotwo/' as const
export const TODOTWO_MANIFEST_URL = '/todotwo/manifest.webmanifest' as const
export const TODOTWO_OFFLINE_URL = '/todotwo/offline' as const

/**
 * Set by the worker on the HTML it serves from cache, and read back by the
 * offline banner. Present means: this document is not live.
 */
export const TODOTWO_CACHED_AT_GLOBAL = '__TODOTWO_CACHED_AT__' as const

declare global {
  interface Window {
    __TODOTWO_CACHED_AT__?: string
  }
}
