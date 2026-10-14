'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { FarmHeader } from '@/components/farm/FarmHeader'
import { FarmFooter } from '@/components/farm/FarmFooter'
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
  const isStorefrontV2 = pathname === '/v2' || pathname.startsWith('/v2/')
  const isStorefrontV3 = pathname === '/v3' || pathname.startsWith('/v3/')

  const independent = isBnimsp || isQuest || isTodoTwo || isStorefrontV2 || isStorefrontV3
  const operational = isEggOpsApp || pathname.startsWith('/admin') || pathname.startsWith('/milk')
  const section = operational ? 'operations' : pathname === '/' ? 'home' : pathname.startsWith('/bestill') ? 'checkout' : pathname.startsWith('/rugeegg') ? 'eggs' : pathname.startsWith('/kyllinger') ? 'chickens' : pathname.startsWith('/oppskrifter') ? 'recipes' : pathname.startsWith('/min-side') ? 'account' : 'information'

  useEffect(() => {
    if (independent) document.body.removeAttribute('data-farm-design')
    else document.body.setAttribute('data-farm-design', section)
    return () => document.body.removeAttribute('data-farm-design')
  }, [independent, section])

  if (independent) {
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
    <div className="farm-site" data-section={section} data-mode={operational ? 'operations' : 'storefront'} data-path={pathname}>
      <FarmHeader operational={operational} />
      <main id="farm-main" tabIndex={-1} className={`farm-content ${section === 'home' ? 'farm-home' : ''}`}>
        {children}
      </main>
      <FarmFooter operational={operational} compact={section === 'checkout' || pathname === '/rugeegg/handlekurv' || pathname.startsWith('/rugeegg/bestill/')} />
      <Toaster />
    </div>
  )
}
