import type { Metadata } from 'next'
import { ChickenProviders } from './ChickenProviders'

export const metadata: Metadata = {
  title: 'Kyllinger',
  description:
    'Bestill levende kyllinger fra Tinglum Gård. Silverudds, Maran, Jersey Giant, Cream Legbar og Ayam Cemani. Hent på gården i Namdalseid.',
  openGraph: {
    title: 'Kyllinger — Tinglum Gård',
    description:
      'Bestill levende kyllinger fra sjeldne hønseraser. Hent på gården i Namdalseid.',
  },
}

export default function KyllingerLayout({ children }: { children: React.ReactNode }) {
  return <ChickenProviders>{children}</ChickenProviders>
}
