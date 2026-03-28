'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ChickenBreedCard } from '@/components/chickens/ChickenBreedCard'
import { ChickenCalendarGrid } from '@/components/chickens/ChickenCalendarGrid'
import { ChickenOrderForm } from '@/components/chickens/ChickenOrderForm'
import type { ChickenWeekAvailability } from '@/lib/chickens/types'
import { trackChickenFunnel } from '@/lib/chickens/analytics'
import { useToast } from '@/hooks/use-toast'
import { OtherProductsRow } from '@/components/OtherProductsRow'
import { MobileProductDock } from '@/components/MobileProductDock'

interface SelectedHatchOption {
  id: string
  weekNumber: number
  year: number
  breedId: string
  hatchId: string
  ageWeeks: number
  pricePerHen: number
  availableHens: number
}

export default function KyllingerPage() {
  const { lang, t } = useLanguage()
  const { toast } = useToast()
  const chickens = (t as any).chickens
  const commonCopy = chickens.common
  const locale = lang === 'en' ? 'en-GB' : 'nb-NO'

  const formatCopy = (template: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce(
      (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
      template
    )

  const formatPickupDate = (date: string) =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    })

  const [breeds, setBreeds] = useState<any[]>([])
  const [calendar, setCalendar] = useState<ChickenWeekAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<ChickenWeekAvailability | null>(null)
  const [activeBreedFilter, setActiveBreedFilter] = useState<string>('all')
  const [hatchSort, setHatchSort] = useState<'age' | 'price'>('age')
  const [selectedOptions, setSelectedOptions] = useState<Record<string, SelectedHatchOption>>({})

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [breedsRes, calendarRes] = await Promise.all([
          fetch('/api/chickens/breeds'),
          fetch('/api/chickens/availability'),
        ])
        if (breedsRes.ok) setBreeds(await breedsRes.json())
        if (calendarRes.ok) setCalendar(await calendarRes.json())
      } catch (err) {
        console.error('Failed to load chicken data:', err)
        toast({
          title: chickens.pageTitle,
          description: chickens.page.loadErrorDescription,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const breedById = useMemo(() => {
    const map = new Map<string, any>()
    for (const breed of breeds) {
      map.set(breed.id, breed)
    }
    return map
  }, [breeds])

  const handleSelectWeek = (week: ChickenWeekAvailability) => {
    setSelectedWeek(week)
    setSelectedOptions({})
    setActiveBreedFilter('all')

    const totalAvailable = week.breeds.reduce((sum, breed) => sum + breed.totalAvailable, 0)
    trackChickenFunnel('week_selected', {
      weekNumber: week.weekNumber,
      year: week.year,
      pickupMonday: week.pickupMonday,
      totalAvailable,
      breedsCount: week.breeds.length,
    })
  }

  const selectedWeekKey = selectedWeek ? `${selectedWeek.year}-${selectedWeek.weekNumber}` : null
  const selectedWeekBookableBreeds = useMemo(() => {
    if (!selectedWeek) return []

    return selectedWeek.breeds
      .map((breed) => {
        const hatches = breed.hatches
          .filter((hatch) => hatch.ageWeeks >= 1 && hatch.availableHens > 0)
          .sort((a, b) => {
            if (hatchSort === 'price') return a.pricePerHen - b.pricePerHen
            if (a.ageWeeks === b.ageWeeks) return a.pricePerHen - b.pricePerHen
            return a.ageWeeks - b.ageWeeks
          })

        if (hatches.length === 0) {
          return { ...breed, hatches: [], totalAvailable: 0 }
        }

        const prices = hatches.map((hatch) => hatch.pricePerHen)
        return {
          ...breed,
          hatches,
          totalAvailable: hatches.reduce((sum, hatch) => sum + hatch.availableHens, 0),
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
        }
      })
      .filter((breed) => breed.hatches.length > 0)
  }, [hatchSort, selectedWeek])

  useEffect(() => {
    if (!selectedWeekKey || selectedWeekBookableBreeds.length === 0) {
      setActiveBreedFilter('all')
      return
    }
    setActiveBreedFilter((prev) => {
      if (prev === 'all') {
        return 'all'
      }
      if (selectedWeekBookableBreeds.some((breed) => breed.breedId === prev)) {
        return prev
      }
      return 'all'
    })
  }, [selectedWeekBookableBreeds, selectedWeekKey])

  const visibleBreeds = activeBreedFilter === 'all'
    ? selectedWeekBookableBreeds
    : selectedWeekBookableBreeds.filter((breed) => breed.breedId === activeBreedFilter)

  const selectedCount = Object.keys(selectedOptions).length

  const handleBreedFilterChange = (breedId: string) => {
    setActiveBreedFilter(breedId)
    if (!selectedWeek || breedId === 'all') return

    const breed = selectedWeekBookableBreeds.find((item) => item.breedId === breedId)
    if (!breed) return

    trackChickenFunnel('breed_selected', {
      weekNumber: selectedWeek.weekNumber,
      year: selectedWeek.year,
      breedId: breed.breedId,
      breedName: breed.breedName,
      availableHens: breed.totalAvailable,
    })
  }

  const handleToggleHatch = (
    week: ChickenWeekAvailability,
    breed: ChickenWeekAvailability['breeds'][number],
    hatch: ChickenWeekAvailability['breeds'][number]['hatches'][number]
  ) => {
    const id = `${breed.breedId}:${hatch.hatchId}`

    setSelectedOptions((prev) => {
      const next = { ...prev }
      const alreadySelected = Boolean(next[id])

      if (alreadySelected) {
        delete next[id]
      } else {
        next[id] = {
          id,
          weekNumber: week.weekNumber,
          year: week.year,
          breedId: breed.breedId,
          hatchId: hatch.hatchId,
          ageWeeks: hatch.ageWeeks,
          pricePerHen: hatch.pricePerHen,
          availableHens: hatch.availableHens,
        }
      }

      trackChickenFunnel('hatch_selected', {
        weekNumber: week.weekNumber,
        year: week.year,
        breedId: breed.breedId,
        breedName: breed.breedName,
        hatchId: hatch.hatchId,
        ageWeeks: hatch.ageWeeks,
        pricePerHen: hatch.pricePerHen,
        availableHens: hatch.availableHens,
        selected: !alreadySelected,
      })

      return next
    })
  }

  const removeSelectedLine = (lineId: string) => {
    setSelectedOptions((prev) => {
      const next = { ...prev }
      delete next[lineId]
      return next
    })
  }

  const selectedOrderLines = useMemo(() => {
    return Object.values(selectedOptions).map((item) => {
      const breed = breedById.get(item.breedId)
      const weekBreed = selectedWeekBookableBreeds.find((b) => b.breedId === item.breedId)
      return {
        id: item.id,
        breedId: item.breedId,
        breedName: breed?.name || weekBreed?.breedName || '',
        breedSlug: breed?.slug || weekBreed?.breedSlug || '',
        accentColor: breed?.accent_color || weekBreed?.accentColor || '#6B7280',
        hatchId: item.hatchId,
        ageWeeks: item.ageWeeks,
        pricePerHen: item.pricePerHen,
        pricePerRooster: (() => {
          const slug = (breed?.slug || weekBreed?.breedSlug || '').toLowerCase()
          const defaultPrice = slug === 'ayam-cemani' ? 400 : 200
          return Number(breed?.rooster_price_nok) || defaultPrice
        })(),
        sellRoosters: (() => {
          const slug = (breed?.slug || weekBreed?.breedSlug || '').toLowerCase()
          const isCreamLegbar = slug === 'cream-legbar'
          return item.ageWeeks >= 10 && !isCreamLegbar
        })(),
        maxAvailableHens: item.availableHens,
      }
    })
  }, [breedById, selectedOptions, selectedWeekBookableBreeds])

  return (
    <div className="min-h-screen bg-stone-50 pb-28 md:pb-10">
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl py-16 md:py-24">
        <div className="text-center max-w-6xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-normal tracking-tight text-neutral-900 mb-6 leading-tight">
            {chickens.pageTitle}
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 mb-12 leading-relaxed max-w-prose mx-auto">
            {chickens.pageSubtitle}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        {loading ? (
          <div className="space-y-8 animate-pulse">
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={`step-skeleton-${idx}`} className="rounded-lg border border-neutral-200 p-3 space-y-2">
                    <div className="h-4 w-24 bg-neutral-200 rounded" />
                    <div className="h-3 w-40 bg-neutral-100 rounded" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={`breed-skeleton-${idx}`} className="rounded-xl border border-neutral-200 bg-white h-44" />
              ))}
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={`week-skeleton-${idx}`} className="rounded-lg border border-neutral-200 h-28" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-2xl font-light text-neutral-900 mb-4">
                {chickens.breedsTitle}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {breeds.map((breed: any) => (
                  <ChickenBreedCard key={breed.id} breed={breed} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-neutral-900 mb-2">
                {chickens.calendarTitle}
              </h2>
              <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  {chickens.page.bookingStepsTitle}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <p className="text-[11px] font-semibold text-neutral-500">1</p>
                    <p className="text-sm font-medium text-neutral-900">{chickens.stepCards.chooseWeekTitle}</p>
                    <p className="text-xs text-neutral-600">{chickens.stepCards.chooseWeekDesc}</p>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <p className="text-[11px] font-semibold text-neutral-500">2</p>
                    <p className="text-sm font-medium text-neutral-900">{chickens.stepCards.chooseHatchesTitle}</p>
                    <p className="text-xs text-neutral-600">{chickens.stepCards.chooseHatchesDesc}</p>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <p className="text-[11px] font-semibold text-neutral-500">3</p>
                    <p className="text-sm font-medium text-neutral-900">{chickens.stepCards.completeBookingTitle}</p>
                    <p className="text-xs text-neutral-600">{chickens.stepCards.completeBookingDesc}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-neutral-600">
                  {chickens.page.chooseMonthWeekHint}
                </p>
              </div>

              <ChickenCalendarGrid
                calendar={calendar}
                onSelectWeek={handleSelectWeek}
                selectedWeekKey={selectedWeekKey}
              />
            </section>

            {selectedWeek && (
              <section id="week-options">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-light text-neutral-900">
                    {formatCopy(chickens.page.chooseForWeek, { week: selectedWeek.weekNumber })}
                  </h2>

                  <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setHatchSort('age')}
                      className={`rounded px-2 py-1 ${hatchSort === 'age' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
                    >
                      {chickens.page.sortByAge}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHatchSort('price')}
                      className={`rounded px-2 py-1 ${hatchSort === 'price' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
                    >
                      {chickens.page.sortByPrice}
                    </button>
                  </div>
                </div>

                <p className="text-sm text-neutral-500 mb-4">
                  {formatCopy(chickens.page.pickupStartsHint, { date: formatPickupDate(selectedWeek.pickupMonday) })}
                </p>

                {selectedWeekBookableBreeds.length === 0 ? (
                  <div className="rounded-xl border border-neutral-200 bg-white p-6 text-neutral-500 text-sm">
                    {chickens.page.noBookableThisWeek}
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleBreedFilterChange('all')}
                        className={`hidden md:inline-flex rounded-full border px-3 py-1.5 text-xs ${
                          activeBreedFilter === 'all'
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white text-neutral-700'
                        }`}
                      >
                        {chickens.page.allBreeds}
                      </button>

                      {selectedWeekBookableBreeds.map((breed) => (
                        <button
                          key={breed.breedId}
                          type="button"
                          onClick={() => handleBreedFilterChange(breed.breedId)}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                            activeBreedFilter === breed.breedId
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-200 bg-white text-neutral-700'
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: breed.accentColor }} />
                          {breed.breedName}
                        </button>
                      ))}

                      {selectedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedOptions({})}
                          className="ml-auto rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700"
                        >
                          {formatCopy(chickens.page.clearSelected, { count: selectedCount })}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {visibleBreeds.map((breed) => (
                        <div key={breed.breedId} className="rounded-xl border border-neutral-200 bg-white p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: breed.accentColor }} />
                              <h3 className="font-medium text-neutral-900">{breed.breedName}</h3>
                            </div>
                            <span className="text-xs text-neutral-500">
                              {formatCopy(chickens.page.hensAvailableCount, { count: breed.totalAvailable })}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {breed.hatches.map((hatch) => {
                              const lineId = `${breed.breedId}:${hatch.hatchId}`
                              const isSelected = Boolean(selectedOptions[lineId])

                              return (
                                <button
                                  key={hatch.hatchId}
                                  type="button"
                                  onClick={() => handleToggleHatch(selectedWeek, breed, hatch)}
                                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                                    isSelected
                                      ? 'border-neutral-900 bg-neutral-100'
                                      : 'border-neutral-200 hover:bg-neutral-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 text-sm">
                                    <span className="font-medium text-neutral-900">
                                      {chickens.page.age}: {hatch.ageWeeks}{commonCopy.ageWeekShort}
                                    </span>
                                    <span className="font-medium text-neutral-900">{commonCopy.currency} {hatch.pricePerHen}</span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-neutral-500">
                                    <span>{chickens.page.hatch} {hatch.hatchId.slice(0, 8)}</span>
                                    <span>
                                      {formatCopy(chickens.page.hensAvailableCount, { count: hatch.availableHens })}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <div className="mt-1 text-xs font-medium text-neutral-700">
                                      {chickens.page.selected}
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {selectedWeek && selectedOrderLines.length > 0 && (
              <section id="order-form" className="space-y-4">
                <ChickenOrderForm
                  selection={{
                    weekNumber: selectedWeek.weekNumber,
                    year: selectedWeek.year,
                    items: selectedOrderLines,
                  }}
                  onClose={() => setSelectedOptions({})}
                  onRemoveLine={removeSelectedLine}
                />
              </section>
            )}

            <OtherProductsRow currentSection="chickens" />
          </>
        )}
      </div>

      <MobileProductDock />
    </div>
  )
}
