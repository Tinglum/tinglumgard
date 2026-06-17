'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { BackgroundLayer } from '@/components/BackgroundLayer'
import { Toaster } from '@/components/ui/toaster'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || ''
  const isEggOpsApp =
    pathname === '/egg' || pathname.startsWith('/egg/') || pathname.startsWith('/drift/egg-ops')
  // BNIMSP is a standalone, BNI-branded section — no Tinglumgård header/footer/background.
  const isBnimsp = pathname === '/bnimsp' || pathname.startsWith('/bnimsp/')

  if (isEggOpsApp || isBnimsp) {
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
      <main className="relative min-h-screen pt-14 sm:pt-20">
        {children}
      </main>
      <Footer />
      <Toaster />
    </>
  )
}
