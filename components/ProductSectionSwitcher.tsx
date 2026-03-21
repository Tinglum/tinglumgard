'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Egg, Feather, Package2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

type ProductSection = 'pigs' | 'eggs' | 'chickens'

const SECTION_META: Record<
  ProductSection,
  {
    href: string
    icon: typeof Package2
  }
> = {
  pigs: {
    href: '/',
    icon: Package2,
  },
  eggs: {
    href: '/rugeegg',
    icon: Egg,
  },
  chickens: {
    href: '/kyllinger',
    icon: Feather,
  },
}

export function ProductSectionSwitcher({ className }: { className?: string }) {
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
    <div
      className={cn(
        'rounded-2xl border border-neutral-200 bg-white/90 p-3 text-left shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] backdrop-blur',
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            {t.crossSell.switcherLabel}
          </p>
        </div>
        <p className="hidden text-xs text-neutral-500 sm:block">{t.crossSell.switcherHint}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['pigs', 'eggs', 'chickens'] as ProductSection[]).map((section) => {
          const isActive = currentSection === section
          const Icon = SECTION_META[section].icon

          return (
            <Link
              key={section}
              href={SECTION_META[section].href}
              className={cn(
                'min-w-[140px] flex-1 rounded-xl border px-3 py-3 text-left transition-all duration-200',
                isActive
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-[0_16px_32px_-18px_rgba(0,0,0,0.6)]'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:-translate-y-0.5 hover:border-neutral-300 hover:text-neutral-900'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-semibold">{labels[section]}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
