'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useOrder } from '@/lib/order-context'
import { formatPrice, formatDate } from '@/lib/utils'
import { GlassCard } from '@/components/GlassCard'
import { CheckCircle2, Calendar, Package, MapPin, Navigation, Mail, ArrowRight } from 'lucide-react'
import { Order } from '@/lib/types'

export default function ConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string
  const { language, t } = useLanguage()
  const { completedOrders } = useOrder()
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    const found = completedOrders.find((o) => o.id === orderId)
    if (found) {
      setOrder(found)
    } else {
      router.push('/raser')
    }
  }, [orderId, completedOrders, router])

  if (!order) {
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

  const DeliveryIcon = deliveryIcons[order.deliveryMethod]

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Success header */}
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-10 h-10 text-success-700" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-neutral-900 mb-4 leading-tight">
              {t.confirmation.orderConfirmed}
            </h1>
            <p className="text-lg text-neutral-600">{t.confirmation.emailConfirmation}</p>
          </div>

          {/* Order number */}
          <GlassCard className="p-6 text-center">
            <div className="text-sm font-medium text-neutral-600 uppercase tracking-wider mb-2">
              {t.confirmation.orderNumber}
            </div>
            <div className="text-3xl font-display font-semibold text-neutral-900">{order.orderNumber}</div>
          </GlassCard>

          {/* Order details */}
          <GlassCard className="p-6 space-y-6">
            <h2 className="text-xl font-display font-semibold text-neutral-900">{t.confirmation.orderDetails}</h2>

            {/* Breed info */}
            <div className="flex items-start gap-4 pb-6 border-b border-neutral-200">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-display font-bold text-white flex-shrink-0"
                style={{ backgroundColor: '#1A1A1A' }} // Default color, will need breed lookup
              >
                {order.breedName.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-display font-semibold text-neutral-900 mb-2">{order.breedName}</h3>
                <div className="space-y-1 text-sm text-neutral-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {t.common.week} {order.weekNumber} • {formatDate(order.deliveryMonday, language)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>
                      {order.quantity} {t.breed.eggs}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DeliveryIcon className="w-4 h-4" />
                    <span>{deliveryMethodLabels[order.deliveryMethod]}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment info */}
            <div className="space-y-4">
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-neutral-600">{t.payment.subtotal}</span>
                <span className="font-medium text-neutral-900">{formatPrice(order.subtotal, language)}</span>
              </div>
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-neutral-600">{t.payment.shipping}</span>
                <span className="font-medium text-neutral-900">
                  {order.deliveryFee === 0 ? t.delivery.free : formatPrice(order.deliveryFee, language)}
                </span>
              </div>
              <div className="h-px bg-neutral-200" />
              <div className="flex justify-between items-baseline">
                <span className="font-medium text-neutral-900">{t.payment.total}</span>
                <span className="text-xl font-display font-semibold text-neutral-900">
                  {formatPrice(order.totalAmount, language)}
                </span>
              </div>
              <div className="h-px bg-neutral-200" />
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-success-700 font-medium">{t.orders.depositPaid}</span>
                <span className="text-success-700 font-semibold">{formatPrice(order.depositAmount, language)}</span>
              </div>
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-neutral-600">{t.orders.remainderDue}</span>
                <span className="font-medium text-neutral-900">{formatPrice(order.remainderAmount, language)}</span>
              </div>
            </div>
          </GlassCard>

          {/* Next steps */}
          <GlassCard variant="dark" className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Mail className="w-5 h-5 text-neutral-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display font-semibold text-neutral-900 mb-2">{t.confirmation.whatHappensNow}</h3>
                <ul className="text-sm text-neutral-700 space-y-2 leading-relaxed">
                  <li>{t.confirmation.day11}</li>
                  <li>{t.confirmation.day9to6}</li>
                  <li>{t.confirmation.day4to1}</li>
                  <li>{t.confirmation.monday}</li>
                </ul>
              </div>
            </div>
          </GlassCard>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/mine-bestillinger" className="btn-primary flex-1 justify-center">
              {t.confirmation.viewOrders}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/raser" className="btn-secondary flex-1 justify-center">
              {t.confirmation.orderMore}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
