'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useOrder } from '@/lib/order-context'
import { formatPrice, formatDate } from '@/lib/utils'
import { GlassCard } from '@/components/GlassCard'
import { Calendar, Package, MapPin, Navigation, ShoppingBag, ArrowRight, CheckCircle2, Circle } from 'lucide-react'

export default function MyOrdersPage() {
  const { language, t } = useLanguage()
  const { completedOrders } = useOrder()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  const now = new Date()
  const upcomingOrders = completedOrders.filter((order) => order.deliveryMonday >= now)
  const pastOrders = completedOrders.filter((order) => order.deliveryMonday < now)

  const orders = activeTab === 'upcoming' ? upcomingOrders : pastOrders

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

  const getTimelineSteps = (status: string) => {
    const steps = [
      { key: 'deposit_paid', label: t.orders.depositPaid },
      { key: 'fully_paid', label: t.orders.fullyPaid },
      { key: 'shipped', label: t.orders.shipped },
      { key: 'delivered', label: t.orders.delivered },
    ]

    const currentIndex = steps.findIndex((step) => step.key === status)
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      active: index === currentIndex,
    }))
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-neutral-900 mb-4 leading-tight">
                {t.orders.myOrders}
              </h1>
              <p className="text-lg text-neutral-600">
                {completedOrders.length}{' '}
                {language === 'no'
                  ? completedOrders.length === 1
                    ? 'bestilling'
                    : 'bestillinger'
                  : completedOrders.length === 1
                    ? 'order'
                    : 'orders'}
              </p>
            </div>
            <Link href="/raser" className="btn-secondary sm:self-start">
              <ShoppingBag className="w-5 h-5" />
              {t.orders.newOrder}
            </Link>
          </div>

          {/* Tabs */}
          <div className="inline-flex glass-light rounded-lg p-1">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-6 py-3 rounded text-sm font-medium tracking-wide transition-all duration-200 ${
                activeTab === 'upcoming'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-700 hover:text-neutral-900'
              }`}
            >
              {t.orders.upcoming}
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-6 py-3 rounded text-sm font-medium tracking-wide transition-all duration-200 ${
                activeTab === 'past'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-700 hover:text-neutral-900'
              }`}
            >
              {t.orders.past}
            </button>
          </div>

          {/* Orders list */}
          {orders.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <div className="w-16 h-16 rounded-full glass-dark flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-xl font-display font-semibold text-neutral-900 mb-2">{t.orders.noOrders}</h3>
              <p className="text-neutral-600 mb-6">{t.orders.startFirst}</p>
              <Link href="/raser" className="btn-primary inline-flex">
                {t.orders.viewBreeds}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {orders.map((order, index) => {
                const DeliveryIcon = deliveryIcons[order.deliveryMethod]
                const timelineSteps = getTimelineSteps(order.status)

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <GlassCard className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                        {/* Order info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-display font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: '#1A1A1A' }}
                          >
                            {order.breedName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                              <div>
                                <h3 className="text-lg font-display font-semibold text-neutral-900 mb-1">
                                  {order.breedName}
                                </h3>
                                <div className="text-sm text-neutral-500">{order.orderNumber}</div>
                              </div>
                              <div className="flex-shrink-0">
                                {order.status === 'deposit_paid' && (
                                  <span className="badge badge-warning">{t.orders.depositPaid}</span>
                                )}
                                {order.status === 'fully_paid' && (
                                  <span className="badge badge-success">{t.orders.fullyPaid}</span>
                                )}
                                {order.status === 'shipped' && (
                                  <span className="badge badge-success">{t.orders.shipped}</span>
                                )}
                                {order.status === 'delivered' && (
                                  <span className="badge badge-success">{t.orders.delivered}</span>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-neutral-600 mb-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">
                                  {t.common.week} {order.weekNumber}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">
                                  {order.quantity} {t.breed.eggs}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DeliveryIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{deliveryMethodLabels[order.deliveryMethod]}</span>
                              </div>
                            </div>

                            {/* Timeline */}
                            {activeTab === 'upcoming' && (
                              <div className="glass-dark rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                  {timelineSteps.map((step, idx) => (
                                    <div key={step.key} className="flex items-center flex-1">
                                      <div className="flex flex-col items-center">
                                        {step.completed ? (
                                          <CheckCircle2 className="w-5 h-5 text-success-700" />
                                        ) : (
                                          <Circle className="w-5 h-5 text-neutral-300" />
                                        )}
                                        <span
                                          className={`text-xs mt-1 ${
                                            step.completed ? 'text-neutral-900' : 'text-neutral-400'
                                          }`}
                                        >
                                          {step.label}
                                        </span>
                                      </div>
                                      {idx < timelineSteps.length - 1 && (
                                        <div
                                          className={`flex-1 h-px ${
                                            step.completed ? 'bg-success-700' : 'bg-neutral-300'
                                          } mx-2`}
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Price and action */}
                        <div className="flex items-center justify-between lg:justify-end gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-neutral-200 lg:pl-6">
                          <div className="text-right">
                            <div className="text-sm text-neutral-600 mb-1">{t.payment.total}</div>
                            <div className="text-2xl font-display font-semibold text-neutral-900">
                              {formatPrice(order.totalAmount, language)}
                            </div>
                            {order.status === 'deposit_paid' && (
                              <div className="text-xs text-warning-700 mt-1">
                                {language === 'no' ? 'Rest:' : 'Remainder:'}{' '}
                                {formatPrice(order.remainderAmount, language)}
                              </div>
                            )}
                          </div>
                          {order.status === 'deposit_paid' && activeTab === 'upcoming' && (
                            <button className="btn-primary text-sm px-4 py-2 whitespace-nowrap">
                              {t.orders.payRemainder}
                            </button>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
