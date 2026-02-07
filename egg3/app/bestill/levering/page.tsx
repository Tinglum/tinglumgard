'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useOrder } from '@/lib/order-context'
import { formatPrice, formatDate } from '@/lib/utils'
import { GlassCard } from '@/components/GlassCard'
import { ArrowLeft, Package, MapPin, Navigation, Calendar, Truck } from 'lucide-react'

export default function DeliveryPage() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const { currentDraft, setDeliveryMethod } = useOrder()

  if (!currentDraft) {
    router.push('/raser')
    return null
  }

  const deliveryOptions = [
    {
      id: 'farm_pickup' as const,
      icon: MapPin,
      title: t.delivery.farmPickup,
      description: t.delivery.farmAddress,
      details: t.delivery.farmDetails,
      fee: 0,
      available: true,
    },
    {
      id: 'posten' as const,
      icon: Package,
      title: t.delivery.posten,
      description: t.delivery.postenDetails,
      details: t.delivery.postenShipping,
      fee: 30000,
      available: true,
    },
    {
      id: 'e6_pickup' as const,
      icon: Navigation,
      title: t.delivery.e6Pickup,
      description: t.delivery.e6Details,
      details: t.delivery.e6Coordination,
      fee: 30000,
      available: currentDraft.week.e6PickupAvailable,
    },
  ]

  const handleSelectDelivery = (method: 'posten' | 'farm_pickup' | 'e6_pickup') => {
    setDeliveryMethod(method)
    router.push('/bestill/betaling')
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        {/* Back button */}
        <Link
          href={`/raser/${currentDraft.breed.slug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.common.backTo} {currentDraft.breed.name}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Header */}
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-neutral-900 mb-4 leading-tight">
              {t.delivery.selectMethod}
            </h1>
            <p className="text-lg text-neutral-600">{t.delivery.howReceive}</p>
          </div>

          {/* Order summary */}
          <GlassCard className="p-6">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-display font-bold text-white flex-shrink-0"
                style={{ backgroundColor: currentDraft.breed.accentColor }}
              >
                {currentDraft.breed.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-neutral-900 mb-1">
                  {currentDraft.breed.name}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {t.common.week} {currentDraft.week.weekNumber} •{' '}
                      {formatDate(currentDraft.week.deliveryMonday, language)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Package className="w-4 h-4" />
                    <span>
                      {currentDraft.quantity} {t.breed.eggs}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-neutral-600 mb-1">{t.quantity.subtotal}</div>
                <div className="text-xl font-display font-semibold text-neutral-900">
                  {formatPrice(currentDraft.subtotal, language)}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Delivery options */}
          <div className="space-y-4">
            {deliveryOptions.map((option, index) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <button
                  onClick={() => handleSelectDelivery(option.id)}
                  disabled={!option.available}
                  className="w-full text-left disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                  <GlassCard interactive={option.available} className="p-6 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full glass-dark flex items-center justify-center flex-shrink-0 group-hover:glass-strong transition-all">
                        <option.icon className="w-6 h-6 text-neutral-700" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-display font-semibold text-neutral-900 mb-1">{option.title}</h3>
                            <p className="text-sm text-neutral-600 mb-2">{option.description}</p>
                            <p className="text-xs text-neutral-500">{option.details}</p>
                          </div>
                          <div className="text-right ml-4">
                            {option.fee === 0 ? (
                              <div className="text-sm font-medium text-success-700 bg-success-50 px-3 py-1 rounded-sm">
                                {t.delivery.free}
                              </div>
                            ) : (
                              <div className="text-lg font-display font-semibold text-neutral-900">
                                +{formatPrice(option.fee, language)}
                              </div>
                            )}
                          </div>
                        </div>
                        {!option.available && (
                          <div className="text-xs font-semibold text-error-700 bg-error-50 px-3 py-1.5 rounded-sm inline-block uppercase tracking-wider">
                            {t.delivery.notAvailable}
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </button>
              </motion.div>
            ))}
          </div>

          {/* Shipping info */}
          <GlassCard variant="dark" className="p-4">
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-neutral-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-700 leading-relaxed">
                <p className="font-medium mb-1">
                  {language === 'no' ? 'Viktig informasjon' : 'Important information'}
                </p>
                <p>{t.delivery.shippingInfo}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  )
}
