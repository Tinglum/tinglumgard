# TodoTwo as an installed app

Phase 7. What TodoTwo does on a phone, what it does without a signal, and — in
detail — what it does not do.

## The spike, first

The plan flagged from the outset that a service worker might not survive
Next 13.5 + `@netlify/plugin-nextjs` 5.15.8. It does. The spike was:

1. Put a four-line worker at `public/todotwo/sw.js`.
2. Confirm it is served at `/todotwo/sw.js` with a JavaScript content type, in
   dev and from `next build && next start`.
3. Register it from a real Chromium and confirm it activates and controls the
   page.
4. Confirm `npm run build` still succeeds.

All four passed. The reason is that nothing about this worker goes through the
Next build: it is a static file in `public/`, exactly like the
`public/eggops-sw.js` that has been live on this site for some time. There is no
webpack plugin, no `next-pwa`, and no generated precache manifest, so there is
nothing for the Netlify adapter to mishandle and nothing that can fail a build.

That is also why `next-pwa` was rejected rather than used. It is unmaintained
for 13.5, it injects itself into `next.config.js`, and it would have made the
build the thing that has to keep working. A hand-written worker is smaller, and
its failure mode is "no offline copy" rather than "no deploy".

### One thing the spike did find

A service worker's scope defaults to the directory holding its script, so
`/todotwo/sw.js` controls `/todotwo/`. Scope matching is a plain string prefix,
and `/todotwo` is **not** prefixed by `/todotwo/` — so the Today view, which is
both the most used screen and the app's `start_url`, fell outside the worker
entirely. Offline it produced a browser network error.

The fix is a `Service-Worker-Allowed: /todotwo` header on the script, which is
the only reason `next.config.js` was touched. Verified present in `next dev` and
in `next start` against a production build.

**Not verified on Netlify.** `public/` files are served from Netlify's CDN, and
whether a `headers()` entry from `next.config.js` reaches a static asset there
has not been confirmed on a real deploy. Registration therefore falls back to
the default `/todotwo/` scope if the wide registration is rejected: everything
under `/todotwo/` still works offline, and only the Today URL itself does not.
**Check this after the first deploy** — see the checklist below.

## What is installed

`public/todotwo/manifest.webmanifest`, linked from `app/todotwo/layout.tsx`.

The manifest is a static file rather than an `app/todotwo/manifest.ts` route
because Next's manifest file convention is only recognised at the root of
`app/`, and a root manifest would advertise the storefront as an installable
app. A static file under `public/todotwo` is served at exactly the URL wanted
with no route to conflict with.

| | |
|---|---|
| name | TodoTwo — Tinglumgård |
| scope / start_url | `/todotwo` |
| display | `standalone` |
| theme_color | `#2f5d45`, the `--tt-accent` token |
| background_color | `#f7f7f4`, the `--tt-ground` token |
| icons | 192, 512, and a 512 maskable |
| shortcuts | Today, Upcoming |

Icons are generated, not drawn: a spruce-green rounded square with a paper-white
check mark, rendered by a short script that supersamples 4× and encodes PNG
directly. The maskable variant is full-bleed with the mark inside the 80% safe
zone, so a launcher that crops to a circle does not clip it. To regenerate,
write a generator producing `icon-192`, `icon-512`, `icon-maskable-512`,
`apple-touch-icon-180`, `shortcut-today-96` and `shortcut-upcoming-96` into
`public/todotwo/icons`; `tests/todotwo/unit/pwa-manifest.test.ts` fails if the
manifest ever names a file that is not there.

## What works offline

Read-only, which is what the plan specifies.

- **The app shell.** Manifest and icons are precached at install. Build output
  under `/_next/static/` is cached the first time it is used, cache-first.
- **Any TodoTwo screen you have opened with a signal.** Navigations are
  network-first: the live response is served and a copy stored. Without a
  network, the copy is served instead. In practice this means the Today view you
  looked at over breakfast is the one you get in the barn.
- **An honest fallback** for a screen with no copy: `/todotwo/offline`, itself
  cached while the session was live, or a small built-in page if even that is
  missing.

## What does not work offline

- **Anything that writes.** Completing a task goes straight to Supabase and
  fails visibly when there is no network. There is no mutation queue and no
  background sync — deliberately. A tick that silently disappears, or lands two
  hours later against a task somebody else already did, is worse than a tick
  that refuses.
- **Client-side navigation between screens.** Next's App Router fetches RSC
  payloads rather than documents, and those are not cached: a cached RSC payload
  is indistinguishable from a live one, which is the thing this phase most needs
  to avoid. Tapping a nav link offline fails. Reloading, or launching the
  installed app, goes through the document path and works. This is the sharpest
  edge in Phase 7.
- **The login screen and the auth callback** are never cached. A stale copy of
  either produces a sign-in loop.
- **Supabase requests.** Left entirely alone by the worker.

## Never showing stale data as live

The worker stores an `x-todotwo-cached-at` header with every page it caches, and
when it serves one back it injects a single script setting
`window.__TODOTWO_CACHED_AT__`. `ConnectionBanner` reads that global.

The point is that it is a fact, not an inference. A live document has no marker;
a cached one always does. There is no heuristic to be wrong about. The banner
distinguishes two situations that are easy to conflate:

- **"No connection"** — the network is gone, but this document is the live one
  you loaded. Nothing you change will save.
- **"Saved copy"** — this document came out of the cache, last refreshed at a
  stated time, which keeps counting up while the screen is open. Past an hour it
  becomes "Saved copy, and not a recent one".

`describeCacheAge` in `lib/todotwo/pwa/staleness.ts` is pure and has its own
tests, including the case where the device clock has moved backwards, which must
never render as "in three minutes".

## The home-screen widget

**A PWA cannot provide one.** A home-screen widget on iOS is a WidgetKit
extension and on Android an App Widget, both of which are native code in an
installed package with a native rendering pass the system runs on its own
schedule. There is no web API for it and none proposed. Anything on this page
that looked like a widget would be a lie.

What it would actually take: a thin native wrapper — a Swift app with a WidgetKit
extension, a Kotlin app with an App Widget provider — reading the same data
TodoTwo reads. That means an Apple Developer account, App Store review, a
signing pipeline and a store listing for a tool used by a handful of people on
one farm. It is a real option, not a fantasy, but it is a native-app project
rather than a phase of this one.

Two things ship instead, and they are what most of the perceived value of a
widget actually is:

**A count on the app icon.** The Badging API — `navigator.setAppBadge()` —
shows the number of tasks still due today on the installed icon, the same way
mail shows unread count. Android Chrome supports it; so does iOS 16.4+ for an
installed PWA. Where it is unsupported, nothing happens and nothing is said.

The count comes from the rendered Today view, watched with a `MutationObserver`,
because completion in `TaskRow` is optimistic — the tick lands before the server
hears about it, and the badge should drop at the same moment. The cost of that
choice: the badge only updates while Today is open. It does not refresh
overnight, so the number on the icon in the morning is last night's. A
`/api/todotwo/today/count` route called from the existing notification cron
would fix it; Phase 7 is not allowed to add one.

**Long-press shortcuts.** The installed icon offers Today and Upcoming, each
with its own icon. Well supported on Android, increasingly on iOS.

## Mobile

- Verified at 375px. The e2e suite asserts no horizontal scroll.
- `viewport-fit=cover` plus `env(safe-area-inset-*)` on the bottom navigation,
  the mobile header and the main column, so nothing sits under a notch or a home
  indicator in standalone mode.
- 44px minimum tap targets. `components/todotwo/ui/button.tsx` already enforced
  this; the completion toggle in `TaskRow` is a 28px circle and now carries a
  44px invisible hit area.

Those rules live in `components/todotwo/pwa/safe-area-styles.tsx` as a style
element rather than in `todotwo.css`, because Phase 7 may only write under
`components/todotwo/pwa/**`. They target the shell by its landmark roles, which
is why the selectors look indirect. **Fold them into `app/todotwo/todotwo.css`
and `app-shell.tsx` the next time the shell is touched** — as written they will
break silently if the shell's markup changes.

## Files

```
public/todotwo/sw.js                              the worker
public/todotwo/manifest.webmanifest               the manifest
public/todotwo/icons/*.png                        six generated icons
app/todotwo/(app)/offline/page.tsx                offline fallback screen
components/todotwo/pwa/service-worker-register.tsx
components/todotwo/pwa/connection-banner.tsx      offline + staleness notice
components/todotwo/pwa/app-badge.tsx              icon badge
components/todotwo/pwa/offline-actions.tsx
components/todotwo/pwa/safe-area-styles.tsx
lib/todotwo/pwa/constants.ts                      shared with the worker
lib/todotwo/pwa/staleness.ts                      pure, tested
lib/todotwo/pwa/badge.ts                          pure, tested
tests/todotwo/unit/pwa-*.test.ts(x)
tests/todotwo/e2e/pwa.spec.ts
```

Shared files touched: `app/todotwo/layout.tsx` (manifest and iOS metadata,
mounts the registrar), `app/todotwo/(app)/layout.tsx` (mounts the banner and the
badge), and `next.config.js` (the one header, explained above).

The worker cannot import from `lib/todotwo/pwa/constants.ts` — it runs outside
the bundle — so cache names appear in both places, and
`tests/todotwo/unit/pwa-manifest.test.ts` fails if they drift.

## Updating the worker

Bump `CACHE_VERSION` in `public/todotwo/sw.js` and
`TODOTWO_CACHE_VERSION` in `lib/todotwo/pwa/constants.ts` together. Old caches
are deleted on activate. The worker calls `skipWaiting()`, so a new version
takes over on the next navigation rather than waiting for every tab to close.

## Manual checklist

Signing in needs a mailbox, so the authenticated offline path is checked by hand.

1. **After the first Netlify deploy**, open DevTools → Application → Service
   Workers on `/todotwo` and confirm the scope reads `/todotwo`, not
   `/todotwo/`. If it reads `/todotwo/`, the CDN dropped the
   `Service-Worker-Allowed` header and the Today URL will not work offline —
   move the header into `netlify.toml`.
2. Sign in on a phone. Add to home screen. Confirm it opens without browser
   chrome and with a green status bar.
3. Long-press the icon: Today and Upcoming appear.
4. With tasks outstanding, background the app and check the icon carries a
   count. Complete one and confirm the count drops.
5. Open Today with a signal, enable airplane mode, then launch the app from the
   home screen. Today should appear with a "Saved copy" banner naming when it
   was refreshed.
6. Still offline, open a screen you have never visited. The offline page should
   appear, not a browser error.
7. Still offline, tap a task's completion circle. It must visibly fail rather
   than appear to succeed.
8. Back online, tap Refresh in the banner and confirm the banner disappears.
