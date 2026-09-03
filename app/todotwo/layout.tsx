import type { Metadata } from 'next'

import { SafeAreaStyles } from '@/components/todotwo/pwa/safe-area-styles'
import { ServiceWorkerRegister } from '@/components/todotwo/pwa/service-worker-register'
import { TODOTWO_MANIFEST_URL } from '@/lib/todotwo/pwa/constants'

import './todotwo.css'

// Next 13.5 has no separate `viewport` export — it belongs in metadata here.
// When this repository moves to Next 14+, split it out.
export const metadata: Metadata = {
  // `absolute` escapes the root layout's "%s | Tinglum Gård" template — TodoTwo
  // is a tool, not a page of the storefront. `template` still applies to child
  // segments that set their own title.
  title: {
    absolute: 'TodoTwo — Tinglumgård',
    template: '%s — TodoTwo',
  },
  description: 'Drift, oppgaver og folk på Tinglumgård.',
  robots: { index: false, follow: false },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
  // The manifest is a static file under public/todotwo rather than an
  // app/todotwo/manifest.ts route: Next's manifest file convention is only
  // recognised at the root of app/, and a root manifest would advertise the
  // storefront as an installable app. See docs/todotwo/PWA.md.
  manifest: TODOTWO_MANIFEST_URL,
  // Matches --tt-accent. Only the light value is given: iOS does not react to
  // a media-scoped theme colour, and a green status bar reads correctly in
  // both schemes.
  themeColor: '#2f5d45',
  applicationName: 'TodoTwo',
  appleWebApp: {
    capable: true,
    title: 'TodoTwo',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/todotwo/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/todotwo/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/todotwo/icons/apple-touch-icon-180.png', sizes: '180x180' }],
  },
}

/**
 * The TodoTwo root. Provides the scoped design tokens and nothing else — the
 * login screen lives inside this layout, so authentication cannot be required
 * here. That happens in the nested (app) layout.
 *
 * The service worker registers from here rather than from the authenticated
 * subtree so that the app shell is cached from the first visit, including for
 * someone who lands on the login screen and installs from there.
 */
export default function TodoTwoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="todotwo-root">
      <SafeAreaStyles />
      <ServiceWorkerRegister />
      {children}
    </div>
  )
}
