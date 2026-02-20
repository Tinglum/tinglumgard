'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import type { ChickenWeekAvailability } from '@/lib/chickens/types'

interface CalendarGridProps {
  calendar: ChickenWeekAvailability[]
  onSelectWeek: (week: ChickenWeekAvailability) => void
  selectedWeekKey?: string | null
}

export function ChickenCalendarGrid({ calendar, onSelectWeek, selectedWeekKey }: CalendarGridProps) {
  const { lang } = useLanguage()

  // Get all unique breed IDs across calendar
  const allBreeds = new Map<string, { name: string; slug: string; accentColor: string }>()
  for (const week of calendar) {
    for (const breed of week.breeds) {
      if (!allBreeds.has(breed.breedId)) {
        allBreeds.set(breed.breedId, { name: breed.breedName, slug: breed.breedSlug, accentColor: breed.accentColor })
      }
    }
  }

  const breedIds = Array.from(allBreeds.keys())

  if (breedIds.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        {lang === 'en' ? 'No chickens available at this time.' : 'Ingen kyllinger tilgjengelig for oyeblikket.'}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-left p-3 bg-neutral-50 border border-neutral-200 font-medium text-neutral-600 min-w-[100px]">
              {lang === 'en' ? 'Week' : 'Uke'}
            </th>
            {breedIds.map((breedId) => {
              const breed = allBreeds.get(breedId)!
              return (
                <th key={breedId} className="p-3 bg-neutral-50 border border-neutral-200 text-center min-w-[120px]">
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: breed.accentColor }} />
                    <span className="font-medium text-neutral-700 text-xs">{breed.name}</span>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {calendar.map((week) => (
            <tr
              key={`${week.year}-${week.weekNumber}`}
              className={cn(
                'cursor-pointer',
                selectedWeekKey === `${week.year}-${week.weekNumber}` && 'bg-neutral-100/60'
              )}
              onClick={() => onSelectWeek(week)}
            >
              <td className="p-3 border border-neutral-200 bg-white">
                <div className="font-medium text-neutral-900">{lang === 'en' ? 'Week' : 'Uke'} {week.weekNumber}</div>
                <div className="text-xs text-neutral-500">{week.pickupMonday}</div>
              </td>
              {breedIds.map((breedId) => {
                const breedData = week.breeds.find((b) => b.breedId === breedId)

                if (!breedData || breedData.totalAvailable === 0) {
                  return (
                    <td key={breedId} className="p-3 border border-neutral-200 bg-neutral-50 text-center">
                      <span className="text-xs text-neutral-400">{lang === 'en' ? 'Sold out' : 'Utsolgt'}</span>
                    </td>
                  )
                }

                const minAge = Math.min(...breedData.hatches.map((h) => h.ageWeeks))
                const maxAge = Math.max(...breedData.hatches.map((h) => h.ageWeeks))
                const ageText = minAge === maxAge ? `${minAge}u` : `${minAge}-${maxAge}u`

                const bgColor = breedData.totalAvailable > 10 ? 'bg-green-50 hover:bg-green-100' :
                  breedData.totalAvailable > 3 ? 'bg-amber-50 hover:bg-amber-100' : 'bg-red-50 hover:bg-red-100'

                return (
                  <td key={breedId}
                    className={cn(
                      'p-3 border border-neutral-200 text-center transition-colors',
                      bgColor,
                      selectedWeekKey === `${week.year}-${week.weekNumber}` && 'ring-2 ring-neutral-900 ring-inset bg-neutral-100'
                    )}
                  >
                    <div className="font-medium text-neutral-900">{breedData.totalAvailable}</div>
                    <div className="text-xs text-neutral-500">{ageText}</div>
                    <div className="text-xs font-medium" style={{ color: allBreeds.get(breedId)?.accentColor }}>
                      {breedData.minPrice === breedData.maxPrice
                        ? `kr ${breedData.minPrice}`
                        : `kr ${breedData.minPrice}-${breedData.maxPrice}`}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
