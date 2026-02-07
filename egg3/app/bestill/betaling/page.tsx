'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useOrder } from '@/lib/order-context'
import { formatPrice, formatDate } from '@/lib/utils'
import { GlassCard } from '@/components/GlassCard'
import { ArrowLeft, Calendar, Package, MapPin, Navigation, CreditCard, CheckCircle2 } from 'lucide-react'

export default function PaymentPage() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const { currentDraft, completeOrder } = useOrder()
  const [isProcessing, setIsProcessing] = useState(false)

  if (!currentDraft || !currentDraft.deliveryMethod) {
    router.push('/raser')
    return null
  }

  const deliveryMethodLabels = {
    farm_pickup: t.delivery.farmPickup,
    posten: t.delivery.posten,
    e6_pickup: t.delivery.e6Pickup,
  }

  const deliveryIcons = {
    farm_pickup: MapPin,
    posten: Package,
    e6_pickup: Navigation,
  }

  const DeliveryIcon = deliveryIcons[currentDraft.deliveryMethod]

  const handlePayDeposit = async () => {
    setIsProcessing(true)

    // Simulate Vipps payment processing
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const order = completeOrder()
    router.push(`/bestill/bekreftelse/${order.id}`)
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        {/* Back button */}
        <Link
          href="/bestill/levering"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.common.backTo} {t.delivery.selectMethod}
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
              {t.payment.summary}
            </h1>
            <p className="text-lg text-neutral-600">{t.payment.reviewOrder}</p>
          </div>

          {/* Order details */}
          <GlassCard className="p-6 space-y-6">
            {/* Breed info */}
            <div className="flex items-start gap-4 pb-6 border-b border-neutral-200">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-display font-bold text-white flex-shrink-0"
                style={{ backgroundColor: currentDraft.breed.accentColor }}
              >
                {currentDraft.breed.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-display font-semibold text-neutral-900 mb-2">
                  {currentDraft.breed.name}
                </h3>
                <div className="space-y-1 text-sm text-neutral-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {t.common.week} {currentDraft.week.weekNumber} •{' '}
                      {formatDate(currentDraft.week.deliveryMonday, language)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>
                      {currentDraft.quantity} {t.breed.eggs}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DeliveryIcon className="w-4 h-4" />
                    <span>{deliveryMethodLabels[currentDraft.deliveryMethod]}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-neutral-600">
                  {currentDraft.quantity} × {formatPrice(currentDraft.breed.pricePerEgg, language)}
                </span>
                <span className="font-medium text-neutral-900">
                  {formatPrice(currentDraft.subtotal, language)}
                </span>
              </div>
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-neutral-600">{t.payment.shipping}</span>
                <span className="font-medium text-neutral-900">
                  {currentDraft.deliveryFee === 0 ? t.delivery.free : formatPrice(currentDraft.deliveryFee, language)}
                </span>
              </div>
              <div className="h-px bg-neutral-200" />
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-base font-medium text-neutral-900">{t.payment.total}</span>
                <span className="text-2xl font-display font-semibold text-neutral-900">
                  {formatPrice(currentDraft.totalAmount, language)}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Payment split explanation */}
          <GlassCard className="p-6">
            <h3 className="font-display font-semibold text-neutral-900 mb-4">{t.payment.paymentPlan}</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-medium text-neutral-900">{t.payment.depositNow}</span>
                    <span className="text-xl font-display font-semibold text-neutral-900">
                      {formatPrice(currentDraft.depositAmount, language)}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600">{t.payment.depositDescription}</p>
                </div>
              </div>

              <div className="h-px bg-neutral-200" />

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full glass-dark flex items-center justify-center text-sm font-semibold text-neutral-700 flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-medium text-neutral-600">{t.payment.remainderLater}</span>
                    <span className="text-xl font-display font-semibold text-neutral-600">
                      {formatPrice(currentDraft.remainderAmount, language)}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600">{t.payment.remainderDescription}</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Cancellation policy */}
          <GlassCard variant="dark" className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-neutral-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-700 leading-relaxed">
                <p className="font-medium mb-1">{t.payment.cancellationPolicy}</p>
                <p>{t.payment.cancellationText}</p>
              </div>
            </div>
          </GlassCard>

          {/* Payment button */}
          <button onClick={handlePayDeposit} disabled={isProcessing} className="btn-primary w-full relative">
            {isProcessing ? (
              <>
                <div className="opacity-0">{language === 'no' ? 'Behandler...' : 'Processing...'}</div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                {t.payment.payDepositWith} ({formatPrice(currentDraft.depositAmount, language)})
              </>
            )}
          </button>

          <p className="text-xs text-center text-neutral-500">
            {language === 'no'
              ? 'Dette er en demo. Ingen reell betaling vil bli gjennomført.'
              : 'This is a demo. No actual payment will be processed.'}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
