'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ChickenBreedCard } from '@/components/chickens/ChickenBreedCard'
import { ChickenCalendarGrid } from '@/components/chickens/ChickenCalendarGrid'
import { ChickenOrderForm } from '@/components/chickens/ChickenOrderForm'
import type { ChickenWeekAvailability } from '@/lib/chickens/types'

export default function KyllingerPage() {
  const { lang, t } = useLanguage()
  const chickens = (t as any).chickens || {}

  const [breeds, setBreeds] = useState<any[]>([])
  const [calendar, setCalendar] = useState<ChickenWeekAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<ChickenWeekAvailability | null>(null)
  const [selectedOption, setSelectedOption] = useState<{
    weekNumber: number
    year: number
    breedId: string
    hatchId: string
    ageWeeks: number
    pricePerHen: number
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
  }

  const selectedWeekBookableBreeds = selectedWeek
    ? selectedWeek.breeds
      .map((breed) => {
        const hatches = breed.hatches.filter((hatch) => hatch.ageWeeks >= 1 && hatch.availableHens > 0)
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
    : []

  const selectedBreed = selectedOption ? breeds.find((b: any) => b.id === selectedOption.breedId) : null
  const selectedWeekBreed = selectedOption
    ? selectedWeekBookableBreeds.find((b) => b.breedId === selectedOption.breedId)
    : null
  const selectedWeekKey = selectedWeek ? `${selectedWeek.year}-${selectedWeek.weekNumber}` : null

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero */}
      <div className="bg-gradient-to-b from-neutral-900 to-neutral-800 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-light mb-4">
            {chickens.pageTitle || (lang === 'en' ? 'Live Chickens' : 'Livende kyllinger')}
          </h1>
          <p className="text-lg text-neutral-300 max-w-2xl mx-auto">
            {chickens.pageSubtitle || (lang === 'en'
              ? 'Heritage breed chicks and hens from Tinglum farm. Price increases weekly as chickens grow.'
              : 'Rasekyllinger og honer fra Tinglum gard. Prisen oker ukentlig etter hvert som kyllingene vokser.'
            )}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-16">
        {loading ? (
          <div className="text-center py-12 text-neutral-500">
            {lang === 'en' ? 'Loading...' : 'Laster...'}
          </div>
        ) : (
          <>
            {/* Breed Cards */}
            <section>
              <h2 className="text-2xl font-light text-neutral-900 mb-6">
                {chickens.breedsTitle || (lang === 'en' ? 'Our Breeds' : 'Vare raser')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {breeds.map((breed: any) => (
                  <ChickenBreedCard key={breed.id} breed={breed} />
                ))}
              </div>
            </section>

            {/* Availability Calendar */}
            <section>
              <h2 className="text-2xl font-light text-neutral-900 mb-2">
                {chickens.calendarTitle || (lang === 'en' ? 'Availability Calendar' : 'Tilgjengelighetskalender')}
              </h2>
              <p className="text-sm text-neutral-500 mb-6">
                {lang === 'en'
                  ? 'Choose a month/week first. Then choose breed and age from available hatches in that week.'
                  : 'Velg maned og uke forst. Deretter velger du rase og alder fra tilgjengelige kull i den uken.'
                }
              </p>
              <ChickenCalendarGrid
                calendar={calendar}
                onSelectWeek={handleSelectWeek}
                selectedWeekKey={selectedWeekKey}
              />
            </section>

            {/* Week Options */}
            {selectedWeek && (
              <section id="week-options">
                <h2 className="text-2xl font-light text-neutral-900 mb-2">
                  {lang === 'en'
                    ? `Choose chickens for week ${selectedWeek.weekNumber}`
                    : `Velg kyllinger for uke ${selectedWeek.weekNumber}`}
                </h2>
                <p className="text-sm text-neutral-500 mb-6">
                  {lang === 'en'
                    ? `Pickup week starts ${selectedWeek.pickupMonday}. You can choose from multiple hatches and ages (minimum age: 1 week).`
                    : `Henteuken starter ${selectedWeek.pickupMonday}. Du kan velge mellom flere kull og aldre (minimumsalder: 1 uke).`}
                </p>

                {selectedWeekBookableBreeds.length === 0 ? (
                  <div className="rounded-xl border border-neutral-200 bg-white p-6 text-neutral-500 text-sm">
                    {lang === 'en'
                      ? 'No bookable chickens in this week. Choose another week.'
                      : 'Ingen bestillbare kyllinger i denne uken. Velg en annen uke.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedWeekBookableBreeds.map((breed) => (
                      <div key={breed.breedId} className="rounded-xl border border-neutral-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: breed.accentColor }} />
                            <h3 className="font-medium text-neutral-900">{breed.breedName}</h3>
                          </div>
                          <span className="text-xs text-neutral-500">
                            {lang === 'en'
                              ? `${breed.totalAvailable} hens available`
                              : `${breed.totalAvailable} honer tilgjengelig`}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2">
                          {[...breed.hatches].sort((a, b) => a.ageWeeks - b.ageWeeks).map((hatch) => {
                            const isSelected =
                              selectedOption?.weekNumber === selectedWeek.weekNumber &&
                              selectedOption?.year === selectedWeek.year &&
                              selectedOption?.breedId === breed.breedId &&
                              selectedOption?.hatchId === hatch.hatchId

                            return (
                              <button
                                key={hatch.hatchId}
                                type="button"
                                onClick={() => setSelectedOption({
                                  weekNumber: selectedWeek.weekNumber,
                                  year: selectedWeek.year,
                                  breedId: breed.breedId,
                                  hatchId: hatch.hatchId,
                                  ageWeeks: hatch.ageWeeks,
                                  pricePerHen: hatch.pricePerHen,
                                })}
                                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                                  isSelected
                                    ? 'border-neutral-900 bg-neutral-100'
                                    : 'border-neutral-200 hover:bg-neutral-50'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm font-medium text-neutral-900">
                                    {lang === 'en' ? 'Age' : 'Alder'}: {hatch.ageWeeks}u
                                  </div>
                                  <div className="text-sm font-medium text-neutral-900">
                                    kr {hatch.pricePerHen}
                                  </div>
                                </div>
                                <div className="mt-1 text-xs text-neutral-500">
                                  {lang === 'en'
                                    ? `Hatch ${hatch.hatchId.slice(0, 8)} | ${hatch.availableHens} hens available`
                                    : `Kull ${hatch.hatchId.slice(0, 8)} | ${hatch.availableHens} honer tilgjengelig`}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Order Form */}
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
