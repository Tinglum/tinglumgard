import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './bnimsp.css'

// Standalone BNI-branded section: override the inherited Tinglumgård title
// template, OpenGraph identity, and keep it out of search indexes.
export const metadata: Metadata = {
  title: { absolute: 'BNI MSP — Train the Trainer' },
  description: 'Nasjonal MSP 2026 — interaktiv trenermanual for BNI MSP-direktører.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'BNI MSP — Train the Trainer',
    description: 'Nasjonal MSP 2026 — interaktiv trenermanual for BNI MSP-direktører.',
    siteName: 'BNI MSP',
  },
}

export default function BnimspLayout({ children }: { children: ReactNode }) {
  return <div className="bni-scope min-h-screen bg-[#F4F4F5] text-[#18181B] antialiased">{children}</div>
}
