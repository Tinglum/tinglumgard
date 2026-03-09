import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { EggProviders } from './EggProviders'

export const metadata: Metadata = {
  title: 'Rugeegg',
  description:
    'Bestill rugeegg fra sjeldne hønseraser. Silverudds, Maran, Jersey Giant, Cream Legbar og Ayam Cemani. Levering i Trøndelag.',
  openGraph: {
    title: 'Rugeegg — Tinglum Gård',
    description:
      'Bestill rugeegg fra sjeldne hønseraser. Silverudds, Maran, Jersey Giant, Cream Legbar og Ayam Cemani.',
  },
}

export default function RugeggLayout({ children }: { children: ReactNode }) {
  return <EggProviders>{children}</EggProviders>
}
