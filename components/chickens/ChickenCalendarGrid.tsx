'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import type { ChickenWeekAvailability } from '@/lib/chickens/types'

interface CalendarGridProps {
  calendar: ChickenWeekAvailability[]
  onSelectWeek: (week: ChickenWeekAvailability) => void
  selectedWeekKey?: string | null
}

function toBookableWeek(week: ChickenWeekAvailability): ChickenWeekAvailability {
  const bookableBreeds = week.breeds
    .map((breed) => {
      const bookableHatches = breed.hatches.filter((hatch) => hatch.ageWeeks >= 1 && hatch.availableHens > 0)
      if (bookableHatches.length === 0) return null

      const prices = bookableHatches.map((hatch) => hatch.pricePerHen)
      const totalAvailable = bookableHatches.reduce((sum, hatch) => sum + hatch.availableHens, 0)

      return {
        ...breed,
        hatches: bookableHatches,
        totalAvailable,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
      }
    })
    .filter((breed): breed is ChickenWeekAvailability['breeds'][number] => Boolean(breed))

  return { ...week, breeds: bookableBreeds }
}

export function ChickenCalendarGrid({ calendar, onSelectWeek, selectedWeekKey }: CalendarGridProps) {
  const { lang } = useLanguage()
  const locale = lang === 'en' ? 'en-GB' : 'nb-NO'

  const weeks = [...calendar]
    .map(toBookableWeek)
    .sort((a, b) => a.pickupMonday.localeCompare(b.pickupMonday))

  const hasBookableWeeks = weeks.some((week) => week.breeds.length > 0)
  if (!hasBookableWeeks) {
    return (
      <div className="text-center py-12 text-neutral-500">
        {lang === 'en' ? 'No chickens available at this time.' : 'Ingen kyllinger tilgjengelig for oyeblikket.'}
      </div>
    )
  }

  const monthMap = new Map<string, { label: string; weeks: ChickenWeekAvailability[] }>()
  for (const week of weeks) {
    const date = new Date(`${week.pickupMonday}T12:00:00Z`)
    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
    const month = monthMap.get(monthKey)
    if (month) {
      month.weeks.push(week)
    } else {
      monthMap.set(monthKey, { label, weeks: [week] })
    }
  }

  return (
    <div className="space-y-6">
      {Array.from(monthMap.entries()).map(([monthKey, month]) => (
        <div key={monthKey} className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="text-base font-medium text-neutral-900">
            {month.label}
          </h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {month.weeks.map((week) => {
              const weekKey = `${week.year}-${week.weekNumber}`
              const isSelected = selectedWeekKey === weekKey
              const totalAvailable = week.breeds.reduce((sum, breed) => sum + breed.totalAvailable, 0)
              const allHatches = week.breeds.flatMap((breed) => breed.hatches)
              const minAge = allHatches.length > 0 ? Math.min(...allHatches.map((hatch) => hatch.ageWeeks)) : 0
              const maxAge = allHatches.length > 0 ? Math.max(...allHatches.map((hatch) => hatch.ageWeeks)) : 0
              const ageText = minAge === maxAge ? `${minAge}u` : `${minAge}-${maxAge}u`

              return (
                <button
                  key={weekKey}
                  type="button"
                  onClick={() => onSelectWeek(week)}
                  className={cn(
                    'rounded-lg border p-4 text-left transition-colors',
                    'border-neutral-200 hover:bg-neutral-50',
                    isSelected && 'border-neutral-900 bg-neutral-100 ring-1 ring-neutral-900'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-medium text-neutral-900">
                        {lang === 'en' ? 'Week' : 'Uke'} {week.weekNumber}
                      </div>
                      <div className="text-sm text-neutral-500">
                        {new Date(`${week.pickupMonday}T12:00:00Z`).toLocaleDateString(locale, {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-neutral-900">{totalAvailable}</div>
                      <div className="text-xs text-neutral-500">
                        {lang === 'en' ? 'hens' : 'honer'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-neutral-600">
                    <span>
                      {week.breeds.length} {lang === 'en' ? 'breeds' : 'raser'}
                    </span>
                    <span>
                      {lang === 'en' ? 'Age' : 'Alder'} {ageText}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

