'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/eggs/GlassCard'
import { useLanguage } from '@/contexts/LanguageContext'
import { useOrder } from '@/contexts/eggs/EggOrderContext'
import { formatDate, formatPrice } from '@/lib/eggs/utils'
import { ArrowRight, Truck, MapPin, Store } from 'lucide-react'

const deliveryOptions = [
  {
    id: 'posten' as const,
    icon: Truck,
    fee: 30000,
    recommended: true,
  },
  {
    id: 'farm_pickup' as const,
    icon: Store,
    fee: 0,
  },
  {
    id: 'e6_pickup' as const,
    icon: MapPin,
    fee: 20000,
  },
]

export default function EggDeliveryPage() {
  const router = useRouter()
  const { lang: language, t } = useLanguage()
  const { currentDraft, setDeliveryMethod, setShippingDetails } = useOrder()
  const [showAddressError, setShowAddressError] = useState(false)
  const copy = t.eggs.delivery

  useEffect(() => {
    if (!currentDraft) {
      router.replace('/rugeegg/handlekurv')
    }
  }, [currentDraft, router])

  useEffect(() => {
    if (!currentDraft) return
    if (currentDraft.deliveryMethod !== 'posten') return
    if ((currentDraft.shippingCountry || '').trim()) return
    setShippingDetails({ shippingCountry: copy.countryPlaceholder })
  }, [currentDraft, setShippingDetails, copy.countryPlaceholder])

  useEffect(() => {
    if (!showAddressError || !currentDraft) return

    const postenSelected = currentDraft.deliveryMethod === 'posten'
    const hasCompleteShipping = !postenSelected || (
      (currentDraft.shippingAddress || '').trim() &&
      (currentDraft.shippingPostalCode || '').trim() &&
      (currentDraft.shippingCity || '').trim() &&
      (currentDraft.shippingCountry || '').trim()
    )

    if (hasCompleteShipping) {
      setShowAddressError(false)
    }
  }, [showAddressError, currentDraft])

  if (!currentDraft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-neutral-500">{t.eggs.common.loading}</div>
      </div>
    )
  }

  const shippingAddress = currentDraft.shippingAddress || ''
  const shippingPostalCode = currentDraft.shippingPostalCode || ''
  const shippingCity = currentDraft.shippingCity || ''
  const shippingCountry = currentDraft.shippingCountry || ''

  const selectedMethod = currentDraft.deliveryMethod
  const isPosten = selectedMethod === 'posten'
  const shippingComplete = !isPosten || (
    shippingAddress.trim() &&
    shippingPostalCode.trim() &&
    shippingCity.trim() &&
    shippingCountry.trim()
  )
  const showShippingValidationError = showAddressError && isPosten && !shippingComplete
  const totalEggs = currentDraft.items.reduce((sum, item) => sum + item.quantity, 0)
  const itemSummary = currentDraft.items
    .map((item) => `${item.breed.name} (${item.quantity})`)
    .join(', ')
  const summaryRows = [
    {
      label: t.eggs.common.breeds,
      value: itemSummary,
    },
    {
      label: t.eggs.common.week,
      value: `${currentDraft.deliveryWeek.weekNumber} - ${formatDate(currentDraft.deliveryWeek.deliveryMonday, language)}`,
    },
    {
      label: t.eggs.common.totalEggs,
      value: String(totalEggs),
    },
  ]

  const getTitleByMethod = (method: 'posten' | 'farm_pickup' | 'e6_pickup') => {
    if (method === 'posten') return copy.postenTitle
    if (method === 'farm_pickup') return copy.farmPickupTitle
    return copy.e6PickupTitle
  }

  const getDescriptionByMethod = (method: 'posten' | 'farm_pickup' | 'e6_pickup') => {
    if (method === 'posten') return copy.postenDescription
    if (method === 'farm_pickup') return copy.farmPickupDescription
    return copy.e6PickupDescription
  }

  const handleContinue = () => {
    if (!selectedMethod) return
    if (isPosten && !shippingComplete) {
      setShowAddressError(true)
      return
    }
    router.push('/rugeegg/bestill/betaling')
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-normal text-neutral-900 mb-2">{copy.title}</h1>
            <p className="text-neutral-600">{copy.subtitle}</p>
          </div>
          <Link href="/rugeegg/handlekurv" className="text-sm text-neutral-600 hover:text-neutral-900">
            {t.eggs.common.backToCart}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {deliveryOptions.map((option) => {
              const disabled = option.id === 'e6_pickup' && !currentDraft.deliveryWeek.e6PickupAvailable
              const active = selectedMethod === option.id
              const Icon = option.icon
              const isRecommended = option.recommended

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setDeliveryMethod(option.id)}
                  className={`w-full text-left rounded-xl border px-6 py-5 transition-all ${
                    active
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : isRecommended
                        ? 'border-amber-300 bg-amber-50 text-neutral-900 hover:border-amber-400'
                        : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-400'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        active ? 'bg-white/10' : 'bg-neutral-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-normal">{getTitleByMethod(option.id)}</h3>
                          {isRecommended && (
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full ${
                                active
                                  ? 'bg-white/15 text-white'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {copy.recommended}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-normal">
                          {option.fee === 0 ? t.common.free : formatPrice(option.fee, language)}
                        </span>
                      </div>
                      <p className={`text-sm ${active ? 'text-white/80' : 'text-neutral-600'}`}>
                        {getDescriptionByMethod(option.id)}
                      </p>
                      {disabled && (
                        <p className="text-xs text-neutral-500 mt-2">{copy.unavailableThisWeek}</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}

            {selectedMethod === 'posten' && (
              <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-normal text-neutral-900">{copy.shippingAddressTitle}</h3>
                  <p className="text-sm text-neutral-600">{copy.shippingAddressDescription}</p>
                </div>

                <form autoComplete="on" onSubmit={(event) => event.preventDefault()} className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="shipping-address" className="text-sm text-neutral-600">{copy.address}</label>
                    <input
                      id="shipping-address"
                      type="text"
                      name="shippingAddress"
                      autoComplete="shipping street-address"
                      value={shippingAddress}
                      onChange={(event) => setShippingDetails({ shippingAddress: event.target.value })}
                      className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                      placeholder={copy.addressPlaceholder}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="shipping-postal-code" className="text-sm text-neutral-600">{copy.postalCode}</label>
                      <input
                        id="shipping-postal-code"
                        type="text"
                        name="shippingPostalCode"
                        autoComplete="shipping postal-code"
                        inputMode="numeric"
                        pattern="[0-9]{4}"
                        value={shippingPostalCode}
                        onChange={(event) => setShippingDetails({ shippingPostalCode: event.target.value })}
                        className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                        placeholder="0000"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="shipping-city" className="text-sm text-neutral-600">{copy.city}</label>
                      <input
                        id="shipping-city"
                        type="text"
                        name="shippingCity"
                        autoComplete="shipping address-level2"
                        value={shippingCity}
                        onChange={(event) => setShippingDetails({ shippingCity: event.target.value })}
                        className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                        placeholder={copy.cityPlaceholder}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="shipping-country" className="text-sm text-neutral-600">{copy.country}</label>
                    <input
                      id="shipping-country"
                      type="text"
                      name="shippingCountry"
                      autoComplete="shipping country-name"
                      value={shippingCountry}
                      onChange={(event) => setShippingDetails({ shippingCountry: event.target.value })}
                      className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                      placeholder={copy.countryPlaceholder}
                      required
                    />
                  </div>
                </form>

                {showShippingValidationError && (
                  <p className="text-xs text-red-600">{copy.addressRequired}</p>
                )}
              </div>
            )}

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm text-neutral-700">
              {copy.methodInfo}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div>
              <GlassCard className="p-6 space-y-5">
                <h2 className="text-lg font-normal text-neutral-900">{t.eggs.common.summary}</h2>

                <div className="space-y-3 text-sm">
                  {summaryRows.map((row) => (
                    <div key={row.label} className="flex justify-between text-neutral-600">
                      <span>{row.label}</span>
                      <span className="font-normal text-neutral-900">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-neutral-200 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <span>{t.eggs.common.subtotal}</span>
                    <span className="font-normal text-neutral-900">
                      {formatPrice(currentDraft.subtotal, language)}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>{t.eggs.common.shipment}</span>
                    <span className="font-normal text-neutral-900">
                      {formatPrice(currentDraft.deliveryFee, language)}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-900 text-base">
                    <span>{t.eggs.common.total}</span>
                    <span className="font-normal">{formatPrice(currentDraft.totalAmount, language)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!selectedMethod}
                  className="btn-primary w-full"
                >
                  {t.eggs.common.continueToPayment}
                  <ArrowRight className="w-5 h-5" />
                </button>
                {showShippingValidationError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {copy.addressRequired}
                  </p>
                )}
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
