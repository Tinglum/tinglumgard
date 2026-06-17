import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './bnimsp.css'

export const metadata: Metadata = {
  title: 'BNI MSP — Train the Trainer',
  description: 'Nasjonal MSP 2026 — interaktiv trenermanual for BNI MSP-direktører.',
}

export default function BnimspLayout({ children }: { children: ReactNode }) {
  return <div className="bni-scope min-h-screen bg-[#F4F4F5] text-[#18181B] antialiased">{children}</div>
}
