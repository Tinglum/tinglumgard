'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { breeds, generateWeekAvailability } from '@/lib/eggs/mock-data'
import { BrowseMode } from '@/lib/eggs/types'
import { formatPrice, formatDate } from '@/lib/eggs/utils'
import { GlassCard } from '@/components/eggs/GlassCard'
import { ArrowRight } from 'lucide-react'

export default function HomePage() {
  const { lang: language, t } = useLanguage()
  const [browseMode, setBrowseMode] = useState<BrowseMode>('breed')
  const weekAvailability = generateWeekAvailability()

  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-6xl font-display font-semibold tracking-tight text-neutral-900 mb-6 leading-tight">
            {t.hero.title}
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 mb-12 leading-relaxed max-w-prose mx-auto">
            {t.hero.subtitle}
          </p>

          {/* Browse mode toggle */}
          <div className="inline-flex glass-light rounded-lg p-1 mb-16">
            <button
              onClick={() => setBrowseMode('breed')}
              className={cn(
                'px-6 py-3 rounded text-sm font-medium tracking-wide transition-all duration-200',
                browseMode === 'breed'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-700 hover:text-neutral-900'
              )}
            >
              {t.browse.byBreed}
            </button>
            <button
              onClick={() => setBrowseMode('week')}
              className={cn(
                'px-6 py-3 rounded text-sm font-medium tracking-wide transition-all duration-200',
                browseMode === 'week'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-700 hover:text-neutral-900'
              )}
            >
              {t.browse.byWeek}
            </button>
          </div>

          {/* Browse by Breed view */}
          {browseMode === 'breed' && (
            <motion.div
              key="breed-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto"
            >
              {breeds.map((breed, index) => (
                <motion.div
                  key={breed.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link href={`/raser/${breed.slug}`}>
                    <GlassCard
                      interactive
                      accentBorder={breed.accentColor}
                      className="p-6 h-full"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-display font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: breed.accentColor }}
                        >
                          {breed.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-display font-semibold text-neutral-900 mb-1 leading-snug">
                            {breed.name}
                          </h3>
                          <p className="text-sm text-neutral-600 leading-normal line-clamp-2">
                            {breed.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-neutral-600 mb-4">
                        <div>
                          <span className="font-medium">{breed.eggColor}</span> •{' '}
                          {breed.annualProduction}
                        </div>
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-2xl font-display font-semibold text-neutral-900">
                            {formatPrice(breed.pricePerEgg, language)}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {t.breed.deliveryFrom} 300 {t.breed.pricePerEgg} · {t.breed.calculatedAtCheckout}
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
            </motion.div>
          )}

          {/* Browse by Week view */}
          {browseMode === 'week' && (
            <motion.div
              key="week-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 max-w-3xl mx-auto"
            >
              {weekAvailability.slice(0, 12).map((week, index) => (
                <motion.div
                  key={`${week.year}-${week.weekNumber}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <GlassCard className="p-6">
                    <div className="mb-4 pb-4 border-b border-neutral-200">
                      <h3 className="text-lg font-display font-semibold text-neutral-900">
                        {t.browse.week} {week.weekNumber} · {formatDate(week.deliveryMonday, language)}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {week.breeds.map((breed) => (
                        <Link
                          key={breed.breedId}
                          href={`/raser/${breed.breedSlug}`}
                          className="flex items-center justify-between py-2 px-3 rounded hover:bg-neutral-50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-display font-bold text-white"
                              style={{ backgroundColor: breed.accentColor }}
                            >
                              {breed.breedName.charAt(0)}
                            </div>
                            <span className="font-medium text-neutral-900">{breed.breedName}</span>
                          </div>
                          {breed.status === 'sold_out' ? (
                            <span className="badge badge-neutral">{t.browse.soldOut}</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-neutral-600">
                                {breed.eggsAvailable} {t.browse.eggsAvailable}
                              </span>
                              <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </section>
    </div>
  )
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
