'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { breeds } from '@/lib/eggs/mock-data'
import { formatPrice } from '@/lib/eggs/utils'
import { GlassCard } from '@/components/eggs/GlassCard'
import { ArrowRight } from 'lucide-react'

export default function BreedsPage() {
  const { language, t } = useLanguage()

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-neutral-900 mb-4 leading-tight">
            {t.nav.breeds}
          </h1>
          <p className="text-lg text-neutral-600 mb-12 leading-normal max-w-prose">
            {language === 'no'
              ? 'Fire unike raser med distinkte egenskaper. Alle hønsene våre går fritt og fôres med økologisk fôr.'
              : 'Four unique breeds with distinctive characteristics. All our chickens are free-range and fed organic feed.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {breeds.map((breed, index) => (
              <motion.div
                key={breed.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link href={`/raser/${breed.slug}`}>
                  <GlassCard interactive accentBorder={breed.accentColor} className="p-6 h-full">
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-display font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: breed.accentColor }}
                      >
                        {breed.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-display font-semibold text-neutral-900 mb-1 leading-snug">
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
                        <div className="text-2xl font-display font-semibold text-neutral-900">
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
