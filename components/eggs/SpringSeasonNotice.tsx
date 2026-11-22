'use client'

import { AlertTriangle, Snowflake } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface SpringSeasonNoticeProps {
  variant?: 'full' | 'compact'
  className?: string
}

export function SpringSeasonNotice({
  variant = 'full',
  className = '',
}: SpringSeasonNoticeProps) {
  const { t } = useLanguage()
  const copy = t.eggs.springSeasonNotice

  if (!copy) return null

  if (variant === 'compact') {
    return (
      <div
        role="note"
        className={`rounded-xl border border-amber-200/90 bg-amber-50/80 px-4 py-3.5 text-sm text-amber-950 ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <Snowflake className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="font-medium text-amber-950">{copy.badge}</div>
            <p className="text-xs sm:text-sm leading-relaxed text-amber-900/90">
              {copy.compactBody}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section
      role="note"
      aria-label={copy.badge}
      className={`rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/80 to-white/90 p-5 sm:p-6 shadow-sm ${className}`}
    >
      <div className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-900">
            <Snowflake className="h-3.5 w-3.5" />
            {copy.badge}
          </span>
          <h2 className="text-lg sm:text-xl font-normal tracking-tight text-neutral-900">
            {copy.title}
          </h2>
          <p className="text-sm text-neutral-700 leading-relaxed max-w-3xl">
            {copy.body}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="flex items-start gap-3 rounded-xl border border-sky-200/70 bg-sky-50/60 p-3.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
              <Snowflake className="h-4 w-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-medium text-neutral-900">{copy.frostTitle}</h3>
              <p className="text-xs leading-relaxed text-neutral-700">{copy.frostBody}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-medium text-neutral-900">{copy.productionTitle}</h3>
              <p className="text-xs leading-relaxed text-neutral-700">{copy.productionBody}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
