'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useOrder } from '@/contexts/eggs/EggOrderContext'
import { useCart } from '@/contexts/eggs/EggCartContext'
import { getBreedBySlug, getBreedInventory } from '@/lib/eggs/mock-data'
import { formatPrice } from '@/lib/eggs/utils'
import { GlassCard } from '@/components/eggs/GlassCard'
import { WeekSelector } from '@/components/eggs/WeekSelector'
import { QuantitySelector } from '@/components/eggs/QuantitySelector'
import { ArrowLeft, Info } from 'lucide-react'
import { WeekInventory } from '@/lib/eggs/types'

export default function BreedDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { language, t } = useLanguage()
  const { startOrder } = useOrder()
  const { addToCart } = useCart()

  const breed = getBreedBySlug(slug)
  const [selectedWeek, setSelectedWeek] = useState<WeekInventory | null>(null)
  const [showQuantityModal, setShowQuantityModal] = useState(false)

  if (!breed) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display font-semibold text-neutral-900 mb-2">
            {language === 'no' ? 'Rase ikke funnet' : 'Breed not found'}
          </h1>
          <Link href="/raser" className="text-neutral-600 hover:text-neutral-900">
            {language === 'no' ? 'Tilbake til raser' : 'Back to breeds'}
          </Link>
        </div>
      </div>
    )
  }

  const inventory = getBreedInventory(breed.id)

  const handleWeekSelect = (week: WeekInventory) => {
    setSelectedWeek(week)
    setShowQuantityModal(true)
  }

  const handleQuantityContinue = (quantity: number) => {
    if (selectedWeek) {
      addToCart(breed, selectedWeek, quantity)
      setShowQuantityModal(false)
      setSelectedWeek(null)
      router.push('/handlekurv')
    }
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl">
        {/* Back button */}
        <Link
          href="/raser"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.common.backTo} {t.nav.breeds}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left column: Breed info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Breed avatar and name */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-display font-bold text-white flex-shrink-0"
                style={{ backgroundColor: breed.accentColor }}
              >
                {breed.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-4xl font-display font-semibold tracking-tight text-neutral-900 leading-tight">
                  {breed.name}
                </h1>
                <p className="text-lg text-neutral-600">{breed.description}</p>
              </div>
            </div>

            {/* Detailed description */}
            <GlassCard className="p-6 mb-6">
              <p className="text-base text-neutral-700 leading-relaxed">{breed.detailedDescription}</p>
            </GlassCard>

            {/* Pricing */}
            <GlassCard className="p-6 mb-6">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-sm text-neutral-600 mb-1">{language === 'no' ? 'Pris per egg' : 'Price per egg'}</div>
                  <div className="text-3xl font-display font-semibold text-neutral-900">
                    {formatPrice(breed.pricePerEgg, language)}
                  </div>
                </div>
                <div className="text-right text-sm text-neutral-600">
                  <div>{t.breed.minOrder}:</div>
                  <div className="font-semibold text-neutral-900">
                    {breed.minOrderQuantity} {t.breed.eggs}
                  </div>
                </div>
              </div>
              <div className="text-xs text-neutral-500">
                {t.breed.deliveryFrom} 300 {t.breed.pricePerEgg} · {t.breed.calculatedAtCheckout}
              </div>
            </GlassCard>

            {/* Characteristics */}
            <GlassCard className="p-6 mb-6">
              <h2 className="text-lg font-display font-semibold text-neutral-900 mb-4">
                {t.breed.characteristics}
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-neutral-600 mb-1">{t.breed.eggColor}</div>
                  <div className="font-semibold text-neutral-900">{breed.eggColor}</div>
                </div>
                <div>
                  <div className="text-neutral-600 mb-1">{t.breed.size}</div>
                  <div className="font-semibold text-neutral-900">{breed.sizeRange}</div>
                </div>
                <div>
                  <div className="text-neutral-600 mb-1">{t.breed.temperament}</div>
                  <div className="font-semibold text-neutral-900">{breed.temperament}</div>
                </div>
                <div>
                  <div className="text-neutral-600 mb-1">{t.breed.production}</div>
                  <div className="font-semibold text-neutral-900">{breed.annualProduction}</div>
                </div>
              </div>
            </GlassCard>

            {/* Hatching info */}
            <GlassCard className="p-6 mb-6">
              <h2 className="text-lg font-display font-semibold text-neutral-900 mb-4">
                {t.breed.hatchingInfo}
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">{t.breed.incubation}:</span>
                  <span className="font-semibold text-neutral-900">
                    {breed.incubationDays} {t.breed.days}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">{t.breed.temperature}:</span>
                  <span className="font-semibold text-neutral-900">{breed.temperature}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-neutral-600">{t.breed.humidity}:</span>
                  <span className="font-semibold text-neutral-900 text-right">{breed.humidity}</span>
                </div>
              </div>
            </GlassCard>

            {/* Quality note */}
            <GlassCard variant="dark" className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-neutral-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-neutral-700 leading-relaxed">{t.breed.qualityNote}</p>
              </div>
            </GlassCard>
          </motion.div>

          {/* Right column: Week selector (sticky) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:sticky lg:top-24 lg:self-start"
          >
            <WeekSelector inventory={inventory} accentColor={breed.accentColor} onSelectWeek={handleWeekSelect} />
          </motion.div>
        </div>
      </div>

      {/* Quantity selector modal */}
      {showQuantityModal && selectedWeek && (
        <QuantitySelector
          breed={breed}
          week={selectedWeek}
          onClose={() => {
            setShowQuantityModal(false)
            setSelectedWeek(null)
          }}
          onContinue={handleQuantityContinue}
        />
      )}
    </div>
  )
}
