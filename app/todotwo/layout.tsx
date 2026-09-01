import type { Metadata } from 'next'

import './todotwo.css'

// Next 13.5 has no separate `viewport` export — it belongs in metadata here.
// When this repository moves to Next 14+, split it out.
export const metadata: Metadata = {
  title: {
    default: 'TodoTwo — Tinglumgård',
    template: '%s — TodoTwo',
  },
  description: 'Drift, oppgaver og folk på Tinglumgård.',
  robots: { index: false, follow: false },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
}

/**
 * The TodoTwo root. Provides the scoped design tokens and nothing else — the
 * login screen lives inside this layout, so authentication cannot be required
 * here. That happens in the nested (app) layout.
 */
export default function TodoTwoLayout({ children }: { children: React.ReactNode }) {
  return <div className="todotwo-root">{children}</div>
}
