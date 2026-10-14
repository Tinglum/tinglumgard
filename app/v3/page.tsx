import type { Metadata } from 'next'
import { PigSalesV3 } from '@/components/pig-v3/PigSalesV3'

export const metadata: Metadata = {
  title: 'Ullgris. Gode middager. Din boks.',
  description: 'Mangalitsa fra Tinglum Gård. Utforsk stykningsdelene, sammenlign boksene og bestill din boks.',
  robots: { index: false, follow: false },
}

export default function PigSalesV3Page() {
  return <PigSalesV3 />
}
