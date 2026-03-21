'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { FarmCrossSellCard } from '@/components/FarmCrossSellCard'

type ProductSection = 'pigs' | 'eggs' | 'chickens'

export function OtherProductsRow({ currentSection }: { currentSection: ProductSection }) {
  const { t } = useLanguage()
  const products = (['pigs', 'eggs', 'chickens'] as ProductSection[]).filter(
    (product) => product !== currentSection
  )

  return (
    <section className="space-y-4">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
          {t.crossSell.otherProductsLabel}
        </p>
        <h2 className="mt-2 text-2xl font-light text-neutral-900">{t.crossSell.otherProductsTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{t.crossSell.otherProductsDescription}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {products.map((product) => (
          <FarmCrossSellCard key={product} product={product} variant="compact" />
        ))}
      </div>
    </section>
  )
}
