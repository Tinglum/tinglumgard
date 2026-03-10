'use client'

import { useEffect } from 'react'
import { EggOpsDailyCollection } from '@/components/eggops/EggOpsDailyCollection'

export default function EggOpsPage() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/eggops-sw.js').catch(() => {
      // Non-blocking.
    })
  }, [])

  return (
    <main className="min-h-screen bg-neutral-50">
      <EggOpsDailyCollection />
    </main>
  )
}
