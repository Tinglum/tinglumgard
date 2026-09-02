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
  const isQuest = pathname === '/quest' || pathname.startsWith('/quest/')
  // TodoTwo is an operational tool with its own shell, navigation and design
  // tokens — the storefront header, footer and booking CTA do not belong on it.
  const isTodoTwo = pathname === '/todotwo' || pathname.startsWith('/todotwo/')

  if (isEggOpsApp || isBnimsp || isQuest || isTodoTwo) {
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
