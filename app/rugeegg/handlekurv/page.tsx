'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCart } from '@/contexts/eggs/EggCartContext'
import { useOrder } from '@/contexts/eggs/EggOrderContext'
import { formatPrice, formatDate } from '@/lib/eggs/utils'
import { GlassCard } from '@/components/eggs/GlassCard'
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Calendar, AlertCircle, CheckCircle2, Info } from 'lucide-react'

export default function CartPage() {
  const router = useRouter()
  const { lang: language } = useLanguage()
  const { items, removeFromCart, updateQuantity, getTotalEggs, getTotalPrice, canCheckout, clearCart } = useCart()
  const { startOrder } = useOrder()

  const totalEggs = getTotalEggs()
  const totalPrice = getTotalPrice()
  const checkoutStatus = canCheckout()

  const handleCheckout = () => {
    if (!checkoutStatus.allowed) return

    // Process first item and keep others in cart
    const item = items[0]
    startOrder(item.breed, item.week, item.quantity)
    removeFromCart(item.breed.id, item.week.id)
    router.push('/rugeegg/bestill/levering')
  }

  const getMinimumMessage = () => {
    if (checkoutStatus.allowed) return null

    switch (checkoutStatus.reason) {
      case 'cart_empty':
        return {
          type: 'info',
          message: language === 'no' ? 'Handlekurven er tom' : 'Cart is empty',
        }
      case 'ayam_cemani_min_6':
        return {
          type: 'warning',
          message:
            language === 'no'
              ? `Ayam Cemani: minimum 6 egg (du har ${totalEggs})`
              : `Ayam Cemani: minimum 6 eggs (you have ${totalEggs})`,
        }
      case 'mixed_min_12':
        return {
          type: 'warning',
          message:
            language === 'no'
              ? `Minimum 12 egg totalt for blandede bestillinger (du har ${totalEggs})`
              : `Minimum 12 eggs total for mixed orders (you have ${totalEggs})`,
        }
      case 'breed_minimum_not_met':
        return {
          type: 'warning',
          message:
            language === 'no'
              ? 'En eller flere raser oppfyller ikke minimumsantallet'
              : 'One or more breeds do not meet minimum quantity',
        }
      default:
        return null
    }
  }

  const minimumMessage = getMinimumMessage()

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
          <div>
            <h1 className="text-4xl md:text-5xl font-normal tracking-tight text-neutral-900 mb-4 leading-tight">
              {language === 'no' ? 'Handlekurv' : 'Shopping Cart'}
            </h1>
            <p className="text-lg text-neutral-600">
              {totalEggs} {language === 'no' ? 'egg' : 'eggs'} • {formatPrice(totalPrice, language)}
            </p>
          </div>

          {items.length === 0 ? (
            /* Empty cart */
            <GlassCard className="p-12 text-center">
              <div className="w-16 h-16 rounded-full glass-dark flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-xl font-normal text-neutral-900 mb-2">
                {language === 'no' ? 'Handlekurven er tom' : 'Cart is empty'}
              </h3>
              <p className="text-neutral-600 mb-6">
                {language === 'no' ? 'Legg til egg for å komme i gang' : 'Add eggs to get started'}
              </p>
              <Link href="/rugeegg/raser" className="btn-primary inline-flex">
                {language === 'no' ? 'Se raser' : 'View breeds'}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item, index) => (
                  <motion.div
                    key={`${item.breed.id}-${item.week.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <GlassCard accentBorder={item.breed.accentColor} className="p-6">
                      <div className="flex items-start gap-4">
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-normal text-white flex-shrink-0"
                          style={{ backgroundColor: item.breed.accentColor }}
                        >
                          {item.breed.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-normal text-neutral-900 mb-1">
                            {item.breed.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-neutral-600 mb-4">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {language === 'no' ? 'Uke' : 'Week'} {item.week.weekNumber} •{' '}
                              {formatDate(item.week.deliveryMonday, language)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => updateQuantity(item.breed.id, item.week.id, item.quantity - 1)}
                                disabled={item.quantity <= item.breed.minOrderQuantity}
                                className="w-8 h-8 rounded-full glass-light flex items-center justify-center hover:glass-strong disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-ring"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="text-xl font-normal text-neutral-900 w-12 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.breed.id, item.week.id, item.quantity + 1)}
                                disabled={item.quantity >= item.week.eggsAvailable}
                                className="w-8 h-8 rounded-full glass-light flex items-center justify-center hover:glass-strong disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-ring"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="text-right">
                              <div className="text-xl font-normal text-neutral-900">
                                {formatPrice(item.quantity * item.breed.pricePerEgg, language)}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {formatPrice(item.breed.pricePerEgg, language)} / {language === 'no' ? 'egg' : 'egg'}
                              </div>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.breed.id, item.week.id)}
                              className="ml-4 p-2 rounded text-neutral-400 hover:text-error-700 hover:bg-error-50 transition-colors focus-ring"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>

                          {item.quantity < item.breed.minOrderQuantity && (
                            <div className="mt-3 text-xs text-warning-700 bg-warning-50 px-3 py-2 rounded-sm">
                              {language === 'no' ? 'Minimum' : 'Minimum'}: {item.breed.minOrderQuantity}{' '}
                              {language === 'no' ? 'egg' : 'eggs'}
                            </div>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>

              {/* Summary sidebar */}
              <div className="lg:col-span-1">
                <div>
                  <GlassCard className="p-6 space-y-6">
                    <h2 className="text-lg font-normal text-neutral-900">
                      {language === 'no' ? 'Sammendrag' : 'Summary'}
                    </h2>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">{language === 'no' ? 'Antall egg' : 'Total eggs'}:</span>
                        <span className="font-normal text-neutral-900">{totalEggs}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">{language === 'no' ? 'Subtotal' : 'Subtotal'}:</span>
                        <span className="text-xl font-normal text-neutral-900">
                          {formatPrice(totalPrice, language)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">
                        + {language === 'no' ? 'forsendelse beregnes i neste steg' : 'shipping calculated in next step'}
                      </p>
                    </div>

                    {/* Minimum message */}
                    {minimumMessage && (
                      <div
                        className={`p-4 rounded-xl flex items-start gap-3 ${
                          minimumMessage.type === 'warning'
                            ? 'bg-warning-50 text-warning-700'
                            : minimumMessage.type === 'info'
                              ? 'bg-info-50 text-info-700'
                              : 'bg-success-50 text-success-700'
                        }`}
                      >
                        {minimumMessage.type === 'warning' ? (
                          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        )}
                        <p className="text-sm leading-relaxed">{minimumMessage.message}</p>
                      </div>
                    )}

                    {checkoutStatus.allowed && (
                      <div className="p-4 rounded-xl bg-success-50 text-success-700 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">
                          {language === 'no' ? 'Klar for betaling!' : 'Ready for checkout!'}
                        </p>
                      </div>
                    )}

                    {items.length > 1 && checkoutStatus.allowed && (
                      <div className="p-4 rounded-xl bg-info-50 text-info-700 flex items-start gap-3">
                        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">
                          {language === 'no'
                            ? 'Du vil fullføre en bestilling om gangen. Resterende varer forblir i handlekurven.'
                            : 'You will complete one order at a time. Remaining items will stay in your cart.'}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleCheckout}
                      disabled={!checkoutStatus.allowed}
                      className="btn-primary w-full"
                    >
                      {language === 'no' ? 'Gå til kassen' : 'Go to checkout'}
                      <ArrowRight className="w-5 h-5" />
                    </button>

                    <Link href="/rugeegg/raser" className="btn-secondary w-full justify-center">
                      {language === 'no' ? 'Fortsett å handle' : 'Continue shopping'}
                    </Link>
                  </GlassCard>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
