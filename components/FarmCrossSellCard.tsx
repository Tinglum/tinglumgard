'use client'

import Link from 'next/link'
import { ArrowRight, Egg, Feather, Package2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

type ProductSection = 'pigs' | 'eggs' | 'chickens'
type CardVariant = 'feature' | 'strip' | 'compact'

const CARD_THEME: Record<
  ProductSection,
  {
    icon: typeof Package2
    accent: string
    accentSoft: string
    accentBorder: string
    href: string
  }
> = {
  pigs: {
    icon: Package2,
    accent: 'text-amber-900',
    accentSoft: 'bg-amber-50',
    accentBorder: 'border-amber-200',
    href: '/',
  },
  eggs: {
    icon: Egg,
    accent: 'text-teal-900',
    accentSoft: 'bg-teal-50',
    accentBorder: 'border-teal-200',
    href: '/rugeegg',
  },
  chickens: {
    icon: Feather,
    accent: 'text-violet-900',
    accentSoft: 'bg-violet-50',
    accentBorder: 'border-violet-200',
    href: '/kyllinger',
  },
}

export function FarmCrossSellCard({
  product,
  variant = 'feature',
  className,
}: {
  product: ProductSection
  variant?: CardVariant
  className?: string
}) {
  const { t } = useLanguage()
  const theme = CARD_THEME[product]
  const Icon = theme.icon
  const copy = t.crossSell.cards[product]

  if (variant === 'compact') {
    return (
      <article
        className={cn(
          'rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]',
          className
        )}
      >
        <div className="mb-3 flex items-center gap-3">
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full border',
              theme.accentSoft,
              theme.accentBorder,
              theme.accent
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{copy.badge}</p>
            <h3 className="text-base font-semibold text-neutral-900">{copy.title}</h3>
          </div>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-neutral-600">{copy.descriptionShort}</p>

        <Link
          href={theme.href}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300"
        >
          {copy.primaryCta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </article>
    )
  }

  if (variant === 'strip') {
    return (
      <article
        className={cn(
          'overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_30px_80px_-25px_rgba(0,0,0,0.16)]',
          className
        )}
      >
        <div className="grid gap-5 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-2xl border',
                  theme.accentSoft,
                  theme.accentBorder,
                  theme.accent
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">{copy.badge}</p>
                <h3 className="text-xl font-semibold text-neutral-900">{copy.title}</h3>
              </div>
            </div>

            <p className="max-w-3xl text-sm leading-7 text-neutral-600 md:text-base">{copy.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {copy.highlights.map((highlight: string) => (
                <span
                  key={highlight}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium',
                    theme.accentSoft,
                    theme.accentBorder,
                    theme.accent
                  )}
                >
                  {highlight}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:min-w-[220px]">
            <span className="text-xs font-medium text-neutral-500">{copy.meta}</span>
            <Link
              href={theme.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-20px_rgba(0,0,0,0.5)]"
            >
              {copy.primaryCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      className={cn(
        'overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_30px_80px_-25px_rgba(0,0,0,0.16)]',
        className
      )}
    >
      <div className="border-b border-neutral-200 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.16),_transparent_45%),linear-gradient(180deg,#ffffff_0%,#faf7f2_100%)] p-6">
        <div className="mb-5 flex items-start gap-4">
          <div
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-2xl border',
              theme.accentSoft,
              theme.accentBorder,
              theme.accent
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">{copy.badge}</p>
            <h3 className="text-2xl font-semibold tracking-tight text-neutral-900">{copy.title}</h3>
            <p className="mt-3 text-sm leading-7 text-neutral-600">{copy.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {copy.highlights.map((highlight: string) => (
            <span
              key={highlight}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium',
                theme.accentSoft,
                theme.accentBorder,
                theme.accent
              )}
            >
              {highlight}
            </span>
          ))}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm leading-6 text-neutral-600">{copy.meta}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={theme.href}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-20px_rgba(0,0,0,0.5)]"
          >
            {copy.primaryCta}
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href={theme.href}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-900 transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300"
          >
            {copy.secondaryCta}
          </Link>
        </div>
      </div>
    </article>
  )
}
