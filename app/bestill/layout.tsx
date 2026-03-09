import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bestill Mangalitsa',
  description:
    'Velg din Mangalitsa ullgris-boks og bestill direkte fra Tinglum Gård. Ferdig pakket, klar for fryseren. Levering i Trøndelag.',
  openGraph: {
    title: 'Bestill Mangalitsa — Tinglum Gård',
    description:
      'Velg din Mangalitsa ullgris-boks og bestill direkte fra Tinglum Gård.',
  },
}

export default function BestillLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
