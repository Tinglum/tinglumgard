'use client'

import { ChickenCartProvider } from '@/contexts/chickens/ChickenCartContext'

export default function KyllingerLayout({ children }: { children: React.ReactNode }) {
  return <ChickenCartProvider>{children}</ChickenCartProvider>
}
