'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import type { ChickenWeekAvailability } from '@/lib/chickens/types'

interface CalendarGridProps {
  calendar: ChickenWeekAvailability[]
  onSelectWeek: (week: ChickenWeekAvailability) => void
  selectedWeekKey?: string | null
}

type WeekStatus = 'bookable' | 'nearly_full' | 'sold_out'

interface WeekCard {
  week: ChickenWeekAvailability
  status: WeekStatus
  totalAvailable: number
  minAge: number | null
  maxAge: number | null
  reason?: string
}

interface MonthBucket {
  key: string
  label: string
  weeks: WeekCard[]
}

function toWeekCard(week: ChickenWeekAvailability, lang: 'en' | 'no'): WeekCard {
  const filteredBreeds = week.breeds
    .map((breed) => {
      const hatches = breed.hatches.filter((hatch) => hatch.ageWeeks >= 1 && hatch.availableHens > 0)
      if (hatches.length === 0) return null

      const prices = hatches.map((hatch) => hatch.pricePerHen)
      return {
        ...breed,
        hatches,
        totalAvailable: hatches.reduce((sum, hatch) => sum + hatch.availableHens, 0),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
      }
    })
    .filter((breed): breed is ChickenWeekAvailability['breeds'][number] => Boolean(breed))

  const filteredWeek: ChickenWeekAvailability = { ...week, breeds: filteredBreeds }
  const allHatches = filteredBreeds.flatMap((breed) => breed.hatches)
  const totalAvailable = filteredBreeds.reduce((sum, breed) => sum + breed.totalAvailable, 0)
  const minAge = allHatches.length > 0 ? Math.min(...allHatches.map((hatch) => hatch.ageWeeks)) : null
  const maxAge = allHatches.length > 0 ? Math.max(...allHatches.map((hatch) => hatch.ageWeeks)) : null

  if (totalAvailable <= 0) {
    return {
      week: filteredWeek,
      status: 'sold_out',
      totalAvailable: 0,
      minAge,
      maxAge,
      reason: lang === 'en'
        ? 'No bookable chickens this week (minimum booking age is 1 week).'
        : 'Ingen bestillbare kyllinger denne uken (minimumsalder for bestilling er 1 uke).',
    }
  }

  if (totalAvailable <= 8) {
    return {
      week: filteredWeek,
      status: 'nearly_full',
      totalAvailable,
      minAge,
      maxAge,
    }
  }

  return {
    week: filteredWeek,
    status: 'bookable',
    totalAvailable,
    minAge,
    maxAge,
  }
}

function chunkIntoPages<T>(items: T[], size: number): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size))
  }
  return pages
}

export function ChickenCalendarGrid({ calendar, onSelectWeek, selectedWeekKey }: CalendarGridProps) {
  const { lang } = useLanguage()
  const locale = lang === 'en' ? 'en-GB' : 'nb-NO'

  const monthBuckets = useMemo<MonthBucket[]>(() => {
    const weeks = [...calendar]
      .sort((a, b) => a.pickupMonday.localeCompare(b.pickupMonday))
      .map((week) => toWeekCard(week, lang as 'en' | 'no'))

    const buckets = new Map<string, MonthBucket>()
    for (const weekCard of weeks) {
      const date = new Date(`${weekCard.week.pickupMonday}T12:00:00Z`)
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })

      const existing = buckets.get(key)
      if (existing) {
        existing.weeks.push(weekCard)
      } else {
        buckets.set(key, { key, label, weeks: [weekCard] })
      }
    }

    return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key))
  }, [calendar, lang, locale])

  const [activeMonthKey, setActiveMonthKey] = useState<string>(monthBuckets[0]?.key || '')
  const [activePage, setActivePage] = useState(0)

  useEffect(() => {
    if (!monthBuckets.find((month) => month.key === activeMonthKey)) {
      setActiveMonthKey(monthBuckets[0]?.key || '')
      setActivePage(0)
    }
  }, [activeMonthKey, monthBuckets])

  const hasAnyBookable = monthBuckets.some((bucket) => bucket.weeks.some((week) => week.status !== 'sold_out'))
  if (!hasAnyBookable) {
    return (
      <div className="text-center py-12 text-neutral-500">
        {lang === 'en' ? 'No chickens available at this time.' : 'Ingen kyllinger tilgjengelig for \u00F8yeblikket.'}
      </div>
    )
  }

  const activeMonth = monthBuckets.find((month) => month.key === activeMonthKey) || monthBuckets[0]
  const pages = chunkIntoPages(activeMonth?.weeks || [], 4)
  const clampedPage = Math.min(activePage, Math.max(0, pages.length - 1))
  const currentWeeks = pages[clampedPage] || []

  const statusLabel = (status: WeekStatus) => {
    if (lang === 'en') {
      if (status === 'bookable') return 'Bookable'
      if (status === 'nearly_full') return 'Nearly full'
      return 'Sold out'
    }
    if (status === 'bookable') return 'Bestillbar'
    if (status === 'nearly_full') return 'Nesten full'
    return 'Utsolgt'
  }

  const statusBadgeClass = (status: WeekStatus) => {
    if (status === 'bookable') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    if (status === 'nearly_full') return 'bg-amber-100 text-amber-800 border-amber-200'
    return 'bg-neutral-100 text-neutral-600 border-neutral-200'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {monthBuckets.map((month) => (
          <button
            key={month.key}
            type="button"
            onClick={() => {
              setActiveMonthKey(month.key)
              setActivePage(0)
            }}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium capitalize',
              activeMonthKey === month.key
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
            )}
          >
            {month.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-900 capitalize">
            {activeMonth?.label}
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setActivePage((prev) => Math.max(0, prev - 1))}
              disabled={clampedPage === 0}
              className="rounded border border-neutral-200 px-2 py-1 text-neutral-600 disabled:opacity-40"
            >
              {lang === 'en' ? 'Prev' : 'Forrige'}
            </button>
            <span className="text-neutral-500">
              {Math.min(clampedPage + 1, Math.max(1, pages.length))}/{Math.max(1, pages.length)}
            </span>
            <button
              type="button"
              onClick={() => setActivePage((prev) => Math.min(Math.max(0, pages.length - 1), prev + 1))}
              disabled={clampedPage >= pages.length - 1}
              className="rounded border border-neutral-200 px-2 py-1 text-neutral-600 disabled:opacity-40"
            >
              {lang === 'en' ? 'Next' : 'Neste'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentWeeks.map((weekCard) => {
            const week = weekCard.week
            const weekKey = `${week.year}-${week.weekNumber}`
            const isSelected = selectedWeekKey === weekKey
            const isDisabled = weekCard.status === 'sold_out'
            const ageText = weekCard.minAge == null || weekCard.maxAge == null
              ? '-'
              : weekCard.minAge === weekCard.maxAge
                ? `${weekCard.minAge}u`
                : `${weekCard.minAge}-${weekCard.maxAge}u`

            return (
              <button
                key={weekKey}
                type="button"
                title={weekCard.reason || ''}
                disabled={isDisabled}
                onClick={() => !isDisabled && onSelectWeek(week)}
                className={cn(
                  'rounded-lg border p-4 text-left transition-all',
                  isDisabled
                    ? 'cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-75'
                    : 'border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-sm',
                  isSelected && !isDisabled && 'border-neutral-900 ring-2 ring-neutral-900/20 bg-neutral-50'
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-base font-semibold text-neutral-900">
                      {lang === 'en' ? 'Week' : 'Uke'} {week.weekNumber}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {new Date(`${week.pickupMonday}T12:00:00Z`).toLocaleDateString(locale, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </div>
                  </div>
                  <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', statusBadgeClass(weekCard.status))}>
                    {statusLabel(weekCard.status)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-neutral-500">{lang === 'en' ? 'Hens' : 'H\u00F8ner'}</div>
                    <div className="text-sm font-semibold text-neutral-900">{weekCard.totalAvailable}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500">{lang === 'en' ? 'Breeds' : 'Raser'}</div>
                    <div className="text-sm font-semibold text-neutral-900">{week.breeds.length}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500">{lang === 'en' ? 'Age' : 'Alder'}</div>
                    <div className="text-sm font-semibold text-neutral-900">{ageText}</div>
                  </div>
                </div>
              </button>
            )
          })}

          {Array.from({ length: Math.max(0, 4 - currentWeeks.length) }).map((_, idx) => (
            <div key={`placeholder-${idx}`} className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50" />
          ))}
        </div>
      </div>
    </div>
  )
}

