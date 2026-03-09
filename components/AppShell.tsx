'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { BackgroundLayer } from '@/components/BackgroundLayer'
import { Toaster } from '@/components/ui/toaster'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || ''
  const isEggOpsApp = pathname.startsWith('/drift/egg-ops')

  if (isEggOpsApp) {
    return (
      <>
        <main className="relative min-h-screen">
          {children}
        </main>
        <Toaster />
      </>
    )
  }

  return (
    <>
      <BackgroundLayer />
      <Header />
      <main className="relative min-h-screen pt-20">
        {children}
      </main>
      <Footer />
      <Toaster />
    </>
  )
}
