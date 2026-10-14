import type { Metadata } from 'next'
import { PigSalesV2 } from '@/components/pig-v2/PigSalesV2'

export const metadata: Metadata = {
  title: 'Ullgris fra Tinglum Gård - november 2026',
  description: 'Utforsk stykningsdelene, finn riktig ullgris-boks og reserver novemberlevering fra Tinglum Gård.',
  robots: { index: false, follow: false },
}

export default function PigSalesV2Page() {
  return <PigSalesV2 />
}
