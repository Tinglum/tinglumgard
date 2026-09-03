import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  TODOTWO_ASSET_CACHE,
  TODOTWO_MANIFEST_URL,
  TODOTWO_OFFLINE_URL,
  TODOTWO_PAGE_CACHE,
  TODOTWO_SW_SCOPE,
  TODOTWO_SW_URL,
} from '@/lib/todotwo/pwa/constants'
import { TODOTWO_BASE } from '@/lib/todotwo/routes'

const ROOT = process.cwd()
const MANIFEST_PATH = path.join(ROOT, 'public/todotwo/manifest.webmanifest')
const SW_PATH = path.join(ROOT, 'public/todotwo/sw.js')

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Record<string, any>
const swSource = readFileSync(SW_PATH, 'utf8')

/** public/x is served at /x, so a manifest URL maps back to a file on disk. */
function publicFile(url: string): string {
  return path.join(ROOT, 'public', url.replace(/^\//, ''))
}

describe('web app manifest', () => {
  it('is installable: name, icons, start_url, standalone display', () => {
    expect(manifest.name).toBe('TodoTwo — Tinglumgård')
    expect(manifest.short_name).toBe('TodoTwo')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe(TODOTWO_BASE)
    expect(manifest.scope).toBe(TODOTWO_BASE)
  })

  it('uses the --tt-accent token as its theme colour', () => {
    // Matches app/todotwo/todotwo.css. Lowercased on both sides so a casing
    // change in either place does not fail for the wrong reason.
    expect(String(manifest.theme_color).toLowerCase()).toBe('#2f5d45')
    expect(String(manifest.background_color).toLowerCase()).toBe('#f7f7f4')
  })

  it('scopes every URL it declares inside /todotwo', () => {
    const urls: string[] = [
      manifest.start_url,
      ...manifest.icons.map((icon: { src: string }) => icon.src),
      ...manifest.shortcuts.flatMap((shortcut: { url: string; icons?: { src: string }[] }) => [
        shortcut.url,
        ...(shortcut.icons ?? []).map((icon) => icon.src),
      ]),
    ]

    for (const url of urls) {
      expect(url.startsWith(TODOTWO_BASE)).toBe(true)
    }
  })

  it('references only icons that exist on disk', () => {
    const sources: string[] = [
      ...manifest.icons.map((icon: { src: string }) => icon.src),
      ...manifest.shortcuts.flatMap(
        (shortcut: { icons?: { src: string }[] }) =>
          (shortcut.icons ?? []).map((icon) => icon.src) as string[]
      ),
    ]

    expect(sources.length).toBeGreaterThan(0)
    for (const src of sources) {
      expect(existsSync(publicFile(src)), `${src} is missing`).toBe(true)
    }
  })

  it('ships the 192 and 512 icons installability requires, plus a maskable one', () => {
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(
      manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')
    ).toBe(true)
  })

  it('offers Today and Upcoming as long-press shortcuts', () => {
    const urls = manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url)
    expect(urls).toEqual([TODOTWO_BASE, `${TODOTWO_BASE}/upcoming`])
    for (const shortcut of manifest.shortcuts) {
      expect(shortcut.icons?.length).toBeGreaterThan(0)
    }
  })

  it('is served from the URL the layout links to', () => {
    expect(existsSync(publicFile(TODOTWO_MANIFEST_URL))).toBe(true)
  })
})

describe('service worker contract', () => {
  it('lives at the URL the app registers, so its scope is /todotwo/', () => {
    expect(existsSync(publicFile(TODOTWO_SW_URL))).toBe(true)
    expect(TODOTWO_SW_URL.startsWith(TODOTWO_SW_SCOPE)).toBe(true)
  })

  it('uses the same cache names the app reads', () => {
    // The worker is plain JS outside the bundle and cannot import the
    // constants, so this is the only thing keeping the two in step.
    expect(swSource).toContain(`'todotwo-assets-'`)
    expect(swSource).toContain(`'todotwo-pages-'`)
    const version = /const CACHE_VERSION = '([^']+)'/.exec(swSource)?.[1]
    expect(version).toBeTruthy()
    expect(`todotwo-assets-${version}`).toBe(TODOTWO_ASSET_CACHE)
    expect(`todotwo-pages-${version}`).toBe(TODOTWO_PAGE_CACHE)
  })

  it('agrees with the app on the offline fallback URL and the cached-at global', () => {
    expect(swSource).toContain(`const OFFLINE_URL = '${TODOTWO_OFFLINE_URL}'`)
    expect(swSource).toContain('window.__TODOTWO_CACHED_AT__=')
  })

  it('precaches only shell files that exist', () => {
    const shell = /const SHELL = \[([\s\S]*?)\]/.exec(swSource)?.[1] ?? ''
    const urls = (shell.match(/'[^']+'/g) ?? []).map((quoted) => quoted.slice(1, -1))
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(existsSync(publicFile(url)), `${url} is precached but missing`).toBe(true)
    }
  })

  it('never caches a mutation, and never caches the login screen', () => {
    expect(swSource).toContain(`request.method !== 'GET'`)
    expect(swSource).toContain(`'/todotwo/login'`)
    expect(swSource).toContain(`'/todotwo/auth'`)
  })
})
