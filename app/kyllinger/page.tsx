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
  const [selectedCell, setSelectedCell] = useState<{
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

  const handleSelectCell = (weekNumber: number, year: number, breedId: string, hatchId: string, ageWeeks: number, pricePerHen: number) => {
    setSelectedCell({ weekNumber, year, breedId, hatchId, ageWeeks, pricePerHen })
  }

  const selectedBreed = selectedCell ? breeds.find((b: any) => b.id === selectedCell.breedId) : null

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
                  ? 'Click a cell to select chickens for that breed and week. Numbers show available hens, age, and price.'
                  : 'Klikk pa en celle for a velge kyllinger for den rasen og uken. Tallene viser tilgjengelige honer, alder og pris.'
                }
              </p>
              <ChickenCalendarGrid
                calendar={calendar}
                onSelectCell={handleSelectCell}
                selectedCell={selectedCell}
              />
            </section>

            {/* Order Form */}
            {selectedCell && selectedBreed && (
              <section id="order-form">
                <ChickenOrderForm
                  selection={{
                    breedId: selectedCell.breedId,
                    breedName: selectedBreed.name,
                    breedSlug: selectedBreed.slug,
                    accentColor: selectedBreed.accent_color,
                    hatchId: selectedCell.hatchId,
                    weekNumber: selectedCell.weekNumber,
                    year: selectedCell.year,
                    ageWeeks: selectedCell.ageWeeks,
                    pricePerHen: selectedCell.pricePerHen,
                    pricePerRooster: Number(selectedBreed.rooster_price_nok) || 250,
                    sellRoosters: selectedBreed.sell_roosters,
                  }}
                  onClose={() => setSelectedCell(null)}
                />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
