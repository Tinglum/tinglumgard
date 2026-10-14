'use client'

import { PigSalesV3 } from '@/components/pig-v3/PigSalesV3'
import { usePageTrack } from '@/hooks/usePageTrack'

export default function HomePage() {
  usePageTrack('pig_browse', '/')
  return <PigSalesV3 standalone={false} />
}
