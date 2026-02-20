'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import type { ChickenWeekAvailability } from '@/lib/chickens/types'

interface CalendarGridProps {
  calendar: ChickenWeekAvailability[]
  onSelectCell: (weekNumber: number, year: number, breedId: string, hatchId: string, ageWeeks: number, pricePerHen: number) => void
  selectedCell?: { weekNumber: number; year: number; breedId: string } | null
}

export function ChickenCalendarGrid({ calendar, onSelectCell, selectedCell }: CalendarGridProps) {
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
            <tr key={`${week.year}-${week.weekNumber}`}>
              <td className="p-3 border border-neutral-200 bg-white">
                <div className="font-medium text-neutral-900">{lang === 'en' ? 'Week' : 'Uke'} {week.weekNumber}</div>
                <div className="text-xs text-neutral-500">{week.pickupMonday}</div>
              </td>
              {breedIds.map((breedId) => {
                const breedData = week.breeds.find((b) => b.breedId === breedId)
                const isSelected = selectedCell?.weekNumber === week.weekNumber &&
                  selectedCell?.year === week.year &&
                  selectedCell?.breedId === breedId

                if (!breedData || breedData.totalAvailable === 0) {
                  return (
                    <td key={breedId} className="p-3 border border-neutral-200 bg-neutral-50 text-center">
                      <span className="text-xs text-neutral-400">{lang === 'en' ? 'Sold out' : 'Utsolgt'}</span>
                    </td>
                  )
                }

                const bestHatch = breedData.hatches.reduce((best, h) =>
                  h.availableHens > (best?.availableHens || 0) ? h : best, breedData.hatches[0])

                const bgColor = breedData.totalAvailable > 10 ? 'bg-green-50 hover:bg-green-100' :
                  breedData.totalAvailable > 3 ? 'bg-amber-50 hover:bg-amber-100' : 'bg-red-50 hover:bg-red-100'

                return (
                  <td key={breedId}
                    className={cn(
                      'p-3 border border-neutral-200 text-center cursor-pointer transition-colors',
                      bgColor,
                      isSelected && 'ring-2 ring-neutral-900 ring-inset bg-neutral-100'
                    )}
                    onClick={() => onSelectCell(week.weekNumber, week.year, breedId, bestHatch.hatchId, bestHatch.ageWeeks, bestHatch.pricePerHen)}
                  >
                    <div className="font-medium text-neutral-900">{breedData.totalAvailable}</div>
                    <div className="text-xs text-neutral-500">{bestHatch.ageWeeks}u</div>
                    <div className="text-xs font-medium" style={{ color: allBreeds.get(breedId)?.accentColor }}>
                      kr {bestHatch.pricePerHen}
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
