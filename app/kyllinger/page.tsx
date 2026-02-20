'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ChickenBreedCard } from '@/components/chickens/ChickenBreedCard'
import { ChickenCalendarGrid } from '@/components/chickens/ChickenCalendarGrid'
import { ChickenOrderForm } from '@/components/chickens/ChickenOrderForm'
import type { ChickenWeekAvailability } from '@/lib/chickens/types'
import { trackChickenFunnel } from '@/lib/chickens/analytics'

export default function KyllingerPage() {
  const { lang, t } = useLanguage()
  const chickens = (t as any).chickens || {}

  const [breeds, setBreeds] = useState<any[]>([])
  const [calendar, setCalendar] = useState<ChickenWeekAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<ChickenWeekAvailability | null>(null)
  const [activeBreedFilter, setActiveBreedFilter] = useState<string>('all')
  const [hatchSort, setHatchSort] = useState<'age' | 'price'>('age')
  const [selectedOption, setSelectedOption] = useState<{
    weekNumber: number
    year: number
    breedId: string
    hatchId: string
    ageWeeks: number
    pricePerHen: number
    availableHens: number
  } | null>(null)

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
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleSelectWeek = (week: ChickenWeekAvailability) => {
    setSelectedWeek(week)
    setSelectedOption(null)

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
      if (prev !== 'all' && selectedWeekBookableBreeds.some((breed) => breed.breedId === prev)) {
        return prev
      }
      return selectedWeekBookableBreeds[0].breedId
    })
  }, [selectedWeekKey])

  const visibleBreeds = activeBreedFilter === 'all'
    ? selectedWeekBookableBreeds
    : selectedWeekBookableBreeds.filter((breed) => breed.breedId === activeBreedFilter)

  const selectedBreed = selectedOption ? breeds.find((b: any) => b.id === selectedOption.breedId) : null
  const selectedWeekBreed = selectedOption
    ? selectedWeekBookableBreeds.find((b) => b.breedId === selectedOption.breedId)
    : null

  const activeStep = !selectedWeek ? 1 : !selectedOption ? 2 : 3
  const stepCopy = lang === 'en'
    ? [
        { title: 'Choose week', desc: 'Select pickup week from monthly calendar' },
        { title: 'Choose breed & age', desc: 'Pick hatch and age for that week' },
        { title: 'Complete booking', desc: 'Set quantity and pay deposit with Vipps' },
      ]
    : [
        { title: 'Velg uke', desc: 'Velg henteuke i månedskalenderen' },
        { title: 'Velg rase og alder', desc: 'Velg kull og alder for valgt uke' },
        { title: 'Fullfør bestilling', desc: 'Velg antall og betal forskudd med Vipps' },
      ]

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

  const handleSelectHatch = (
    week: ChickenWeekAvailability,
    breed: ChickenWeekAvailability['breeds'][number],
    hatch: ChickenWeekAvailability['breeds'][number]['hatches'][number]
  ) => {
    setSelectedOption({
      weekNumber: week.weekNumber,
      year: week.year,
      breedId: breed.breedId,
      hatchId: hatch.hatchId,
      ageWeeks: hatch.ageWeeks,
      pricePerHen: hatch.pricePerHen,
      availableHens: hatch.availableHens,
    })

    trackChickenFunnel('hatch_selected', {
      weekNumber: week.weekNumber,
      year: week.year,
      breedId: breed.breedId,
      breedName: breed.breedName,
      hatchId: hatch.hatchId,
      ageWeeks: hatch.ageWeeks,
      pricePerHen: hatch.pricePerHen,
      availableHens: hatch.availableHens,
    })
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-gradient-to-b from-neutral-900 to-neutral-800 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-light mb-4">
            {chickens.pageTitle || (lang === 'en' ? 'Live Chickens' : 'Levende kyllinger')}
          </h1>
          <p className="text-lg text-neutral-300 max-w-2xl mx-auto">
            {chickens.pageSubtitle || (lang === 'en'
              ? 'Heritage breed chicks and hens from Tinglum farm. Price increases weekly as chickens grow.'
              : 'Rasekyllinger og høner fra Tinglum gård. Prisen øker ukentlig etter hvert som kyllingene vokser.'
            )}
          </p>
        </div>
      </div>

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
            <section className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {stepCopy.map((step, idx) => {
                  const stepNumber = idx + 1
                  const done = activeStep > stepNumber
                  const active = activeStep === stepNumber

                  return (
                    <div
                      key={step.title}
                      className={`rounded-lg border p-3 transition-colors ${
                        active
                          ? 'border-neutral-900 bg-neutral-50'
                          : done
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-neutral-200 bg-white'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            active
                              ? 'bg-neutral-900 text-white'
                              : done
                                ? 'bg-emerald-600 text-white'
                                : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          {stepNumber}
                        </span>
                        <h3 className="text-sm font-medium text-neutral-900">{step.title}</h3>
                      </div>
                      <p className="text-xs text-neutral-500">{step.desc}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-neutral-900 mb-4">
                {chickens.breedsTitle || (lang === 'en' ? 'Our Breeds' : 'Våre raser')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {breeds.map((breed: any) => (
                  <ChickenBreedCard key={breed.id} breed={breed} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-neutral-900 mb-2">
                {chickens.calendarTitle || (lang === 'en' ? 'Availability Calendar' : 'Tilgjengelighetskalender')}
              </h2>
              <p className="text-sm text-neutral-500 mb-4">
                {lang === 'en'
                  ? 'Choose month and week first. Then choose breed and age in that week.'
                  : 'Velg måned og uke først. Deretter velger du rase og alder i den uken.'}
              </p>

              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {lang === 'en'
                  ? 'Booking opens from age 1 week. Week 0 is never bookable.'
                  : 'Bestilling er mulig fra og med 1 ukes alder. Uke 0 er aldri bestillbar.'}
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
                    {lang === 'en'
                      ? `Choose chickens for week ${selectedWeek.weekNumber}`
                      : `Velg kyllinger for uke ${selectedWeek.weekNumber}`}
                  </h2>

                  <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setHatchSort('age')}
                      className={`rounded px-2 py-1 ${hatchSort === 'age' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
                    >
                      {lang === 'en' ? 'Sort: age' : 'Sorter: alder'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHatchSort('price')}
                      className={`rounded px-2 py-1 ${hatchSort === 'price' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
                    >
                      {lang === 'en' ? 'Sort: price' : 'Sorter: pris'}
                    </button>
                  </div>
                </div>

                <p className="text-sm text-neutral-500 mb-4">
                  {lang === 'en'
                    ? `Pickup starts ${selectedWeek.pickupMonday}. Multiple hatches and ages are shown for this week.`
                    : `Henting starter ${selectedWeek.pickupMonday}. Flere kull og aldre vises for denne uken.`}
                </p>

                {selectedWeekBookableBreeds.length === 0 ? (
                  <div className="rounded-xl border border-neutral-200 bg-white p-6 text-neutral-500 text-sm">
                    {lang === 'en'
                      ? 'No bookable chickens in this week. Choose another week.'
                      : 'Ingen bestillbare kyllinger i denne uken. Velg en annen uke.'}
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleBreedFilterChange('all')}
                        className={`hidden md:inline-flex rounded-full border px-3 py-1.5 text-xs ${
                          activeBreedFilter === 'all'
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white text-neutral-700'
                        }`}
                      >
                        {lang === 'en' ? 'All breeds' : 'Alle raser'}
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
                              {lang === 'en'
                                ? `${breed.totalAvailable} hens available`
                                : `${breed.totalAvailable} høner tilgjengelig`}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {breed.hatches.map((hatch) => {
                              const isSelected =
                                selectedOption?.weekNumber === selectedWeek.weekNumber &&
                                selectedOption?.year === selectedWeek.year &&
                                selectedOption?.breedId === breed.breedId &&
                                selectedOption?.hatchId === hatch.hatchId

                              return (
                                <button
                                  key={hatch.hatchId}
                                  type="button"
                                  onClick={() => handleSelectHatch(selectedWeek, breed, hatch)}
                                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                                    isSelected
                                      ? 'border-neutral-900 bg-neutral-100'
                                      : 'border-neutral-200 hover:bg-neutral-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 text-sm">
                                    <span className="font-medium text-neutral-900">
                                      {lang === 'en' ? 'Age' : 'Alder'}: {hatch.ageWeeks}u
                                    </span>
                                    <span className="font-medium text-neutral-900">kr {hatch.pricePerHen}</span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-neutral-500">
                                    <span>{lang === 'en' ? 'Hatch' : 'Kull'} {hatch.hatchId.slice(0, 8)}</span>
                                    <span>
                                      {hatch.availableHens} {lang === 'en' ? 'hens available' : 'høner tilgjengelig'}
                                    </span>
                                  </div>
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

            {selectedOption && (selectedBreed || selectedWeekBreed) && (
              <section id="order-form">
                <ChickenOrderForm
                  selection={{
                    breedId: selectedOption.breedId,
                    breedName: selectedBreed?.name || selectedWeekBreed?.breedName || '',
                    breedSlug: selectedBreed?.slug || selectedWeekBreed?.breedSlug || '',
                    accentColor: selectedBreed?.accent_color || selectedWeekBreed?.accentColor || '#6B7280',
                    hatchId: selectedOption.hatchId,
                    weekNumber: selectedOption.weekNumber,
                    year: selectedOption.year,
                    ageWeeks: selectedOption.ageWeeks,
                    pricePerHen: selectedOption.pricePerHen,
                    pricePerRooster: Number(selectedBreed?.rooster_price_nok) || 250,
                    sellRoosters: Boolean(selectedBreed?.sell_roosters),
                    maxAvailableHens: selectedOption.availableHens,
                  }}
                  onClose={() => setSelectedOption(null)}
                />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

