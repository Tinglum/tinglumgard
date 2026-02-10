'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatPrice } from '@/lib/eggs/utils'
import { GlassCard } from '@/components/eggs/GlassCard'
import { ArrowRight } from 'lucide-react'
import { fetchBreeds } from '@/lib/eggs/api'
import type { Breed } from '@/lib/eggs/types'

export default function BreedsPage() {
  const { lang: language, t } = useLanguage()
  const loadBreedsError = t.eggs.errors.loadBreeds
  const [breeds, setBreeds] = useState<Breed[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    async function loadBreeds() {
      try {
        setIsLoading(true)
        const data = await fetchBreeds()
        if (!isActive) return
        setBreeds(data)
      } catch (err) {
        if (!isActive) return
        console.error('Failed to load breeds', err)
        setError(loadBreedsError)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }
    loadBreeds()
    return () => {
      isActive = false
    }
  }, [language, loadBreedsError])

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-normal tracking-tight text-neutral-900 mb-4 leading-tight">
            {t.nav.breeds}
          </h1>
          <p className="text-lg text-neutral-600 mb-12 leading-normal max-w-prose">
            {t.eggs.breedsPage.subtitle}
          </p>

          {error && <div className="text-sm text-red-600 mb-6">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading && (
              <div className="col-span-full text-sm text-neutral-500">
                {t.eggs.common.loadingBreeds}
              </div>
            )}
            {breeds.map((breed, index) => (
              <motion.div
                key={breed.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link href={`/rugeegg/raser/${breed.slug}`}>
                  <GlassCard interactive accentBorder={breed.accentColor} className="p-6 h-full">
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-normal text-white flex-shrink-0"
                        style={{ backgroundColor: breed.accentColor }}
                      >
                        {breed.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-normal text-neutral-900 mb-1 leading-snug">
                          {breed.name}
                        </h2>
                        <p className="text-sm text-neutral-600 leading-normal">
                          {breed.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center justify-between text-neutral-600">
                        <span>{t.breed.eggColor}:</span>
                        <span className="font-medium text-neutral-900">{breed.eggColor}</span>
                      </div>
                      <div className="flex items-center justify-between text-neutral-600">
                        <span>{t.breed.production}:</span>
                        <span className="font-medium text-neutral-900">{breed.annualProduction}</span>
                      </div>
                    </div>

                    <div className="flex items-end justify-between pt-4 border-t border-neutral-200">
                      <div>
                        <div className="text-2xl font-normal text-neutral-900">
                          {formatPrice(breed.pricePerEgg, language)}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {t.breed.minOrder}: {breed.minOrderQuantity} {t.breed.eggs}
                        </div>
                      </div>
                      <div className="text-neutral-700 flex items-center gap-1">
                        <span className="text-sm font-medium">{t.breed.viewDetails}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}


