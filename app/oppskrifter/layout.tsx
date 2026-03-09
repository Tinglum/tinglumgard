import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Oppskrifter',
  description:
    'Oppskrifter med Mangalitsa ullgris fra Tinglum Gård. Tips og inspirasjon til middagen.',
  openGraph: {
    title: 'Oppskrifter — Tinglum Gård',
    description:
      'Oppskrifter med Mangalitsa ullgris. Tips og inspirasjon til middagen.',
  },
}

export default function OppskrifterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
