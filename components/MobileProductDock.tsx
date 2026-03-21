'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Egg, Feather, Package2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

type ProductSection = 'pigs' | 'eggs' | 'chickens'

const ITEMS: Record<
  ProductSection,
  {
    href: string
    icon: typeof Package2
  }
> = {
  pigs: { href: '/', icon: Package2 },
  eggs: { href: '/rugeegg', icon: Egg },
  chickens: { href: '/kyllinger', icon: Feather },
}

export function MobileProductDock() {
  const pathname = usePathname()
  const { t } = useLanguage()

  const currentSection: ProductSection = pathname?.startsWith('/rugeegg')
    ? 'eggs'
    : pathname?.startsWith('/kyllinger')
      ? 'chickens'
      : 'pigs'

  const labels = {
    pigs: t.crossSell.sections.pigs,
    eggs: t.crossSell.sections.eggs,
    chickens: t.crossSell.sections.chickens,
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 px-4 md:hidden">
      <div className="pointer-events-auto mx-auto max-w-sm rounded-2xl border border-neutral-200 bg-white/95 p-2 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="grid grid-cols-3 gap-2">
          {(['pigs', 'eggs', 'chickens'] as ProductSection[]).map((section) => {
            const isActive = currentSection === section
            const Icon = ITEMS[section].icon

            return (
              <Link
                key={section}
                href={ITEMS[section].href}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl px-2 py-2 text-center transition-colors',
                  isActive ? 'bg-neutral-900 text-white' : 'text-neutral-600'
                )}
              >
                <Icon className="mb-1 h-4 w-4" />
                <span className="text-[11px] font-semibold">{labels[section]}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
