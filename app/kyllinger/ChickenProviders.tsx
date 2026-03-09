'use client'

import { ChickenCartProvider } from '@/contexts/chickens/ChickenCartContext'

export function ChickenProviders({ children }: { children: React.ReactNode }) {
  return <ChickenCartProvider>{children}</ChickenCartProvider>
}
