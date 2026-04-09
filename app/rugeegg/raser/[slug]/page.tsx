'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useOrder } from '@/contexts/eggs/EggOrderContext'
import { useCart } from '@/contexts/eggs/EggCartContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatPrice, formatDate } from '@/lib/eggs/utils'
import { GlassCard } from '@/components/eggs/GlassCard'
import { WeekSelector } from '@/components/eggs/WeekSelector'
import { QuantitySelector } from '@/components/eggs/QuantitySelector'
import { ArrowLeft, Info, AlertTriangle, Loader2, Mail } from 'lucide-react'
import { Breed, WeekInventory } from '@/lib/eggs/types'
import { fetchBreedBySlug, fetchInventory } from '@/lib/eggs/api'
import { localizeBreed } from '@/lib/eggs/localize'

function getWeekKey(week: WeekInventory): string {
  return `${week.year}-${week.weekNumber}-${week.deliveryMonday.toISOString().slice(0, 10)}`
}

function isSameDeliveryWeek(a: WeekInventory, b: WeekInventory): boolean {
  return getWeekKey(a) === getWeekKey(b)
}

interface ExistingEggOrderMatch {
  id: string
  orderNumber: string
  customerName?: string | null
  deliveryMethod?: string | null
  year: number
  weekNumber: number
  deliveryMonday: string
  totalQuantity: number
}

export default function BreedDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const { lang: language, t } = useLanguage()
  const loadBreedError = t.eggs.errors.loadBreed
  const { existingOrderTarget, setExistingOrderTarget, clearExistingOrderTarget } = useOrder()
  const { items, addToCart, clearCart } = useCart()
  const { isAuthenticated } = useAuth()

  const [breed, setBreed] = useState<Breed | null>(null)
  const [inventory, setInventory] = useState<WeekInventory[]>([])
  const [selectedWeek, setSelectedWeek] = useState<WeekInventory | null>(null)
  const [showQuantityModal, setShowQuantityModal] = useState(false)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [showActiveOrderPrompt, setShowActiveOrderPrompt] = useState(false)
  const [showExistingOrderPrompt, setShowExistingOrderPrompt] = useState(false)
  const [showNewOrderWarning, setShowNewOrderWarning] = useState(false)
  const [skipAutoWeek, setSkipAutoWeek] = useState(false)
  const [pendingExistingWeek, setPendingExistingWeek] = useState<WeekInventory | null>(null)
  const [sameWeekExistingOrders, setSameWeekExistingOrders] = useState<ExistingEggOrderMatch[]>([])
  const [selectedExistingOrderId, setSelectedExistingOrderId] = useState<string>('')
  const [forceNewWeekKeys, setForceNewWeekKeys] = useState<string[]>([])
  const [waitlistQuantity, setWaitlistQuantity] = useState(1)
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false)
  const [waitlistError, setWaitlistError] = useState<string | null>(null)
  const [waitlistSuccess, setWaitlistSuccess] = useState(false)
  const [waitlistPrefillHandled, setWaitlistPrefillHandled] = useState(false)
  const [waitlistAutoHandled, setWaitlistAutoHandled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const linkedOrderId = String(searchParams.get('orderId') || '').trim()
  const localizedBreed = useMemo(
    () => (breed ? localizeBreed(breed, t.eggs.breedDetails) : null),
    [breed, t.eggs.breedDetails]
  )

  useEffect(() => {
    let isActive = true
    async function loadData() {
      try {
        setIsLoading(true)
        const breedData = await fetchBreedBySlug(slug)
        const inventoryData = await fetchInventory({ breedId: breedData.id })
        if (!isActive) return
        setBreed(breedData)
        setInventory(inventoryData)
      } catch (err) {
        if (!isActive) return
        console.error('Failed to load breed', err)
        setError(loadBreedError)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }
    if (slug) {
      loadData()
    }
    return () => {
      isActive = false
    }
  }, [slug, language, loadBreedError])

  useEffect(() => {
    if (selectedWeek || showQuantityModal || inventory.length === 0) return
    if (items.length === 0 || skipAutoWeek) return
    if (showActiveOrderPrompt) return

    setShowActiveOrderPrompt(true)
  }, [inventory, items, selectedWeek, showQuantityModal, showActiveOrderPrompt, skipAutoWeek])

  useEffect(() => {
    if (waitlistPrefillHandled) return
    if (inventory.length === 0) return

    const wantsWaitlist = searchParams.get('waitlist') === '1'
    if (!wantsWaitlist) {
      setWaitlistPrefillHandled(true)
      return
    }

    const inventoryId = (searchParams.get('inventoryId') || '').trim()
    const year = Number(searchParams.get('year'))
    const weekNumber = Number(searchParams.get('week'))

    let targetWeek: WeekInventory | null = null

    if (inventoryId) {
      targetWeek = inventory.find((week) => week.id === inventoryId) || null
    }

    if (!targetWeek && Number.isFinite(year) && Number.isFinite(weekNumber)) {
      targetWeek =
        inventory.find((week) => week.year === year && week.weekNumber === weekNumber) || null
    }

    if (!targetWeek) {
      targetWeek = inventory.find((week) => week.status === 'sold_out') || inventory[0] || null
    }

    if (targetWeek) {
      setSelectedWeek(targetWeek)
      setShowWaitlistModal(true)
      setWaitlistError(null)
      setWaitlistSuccess(false)
      setWaitlistQuantity(1)
    }

    setWaitlistPrefillHandled(true)
  }, [inventory, searchParams, waitlistPrefillHandled])

  const submitWaitlistRequest = useCallback(async (quantity: number, redirectOnUnauthorized = true) => {
    if (!selectedWeek) return
    try {
      setWaitlistSubmitting(true)
      setWaitlistError(null)

      const response = await fetch('/api/eggs/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryId: selectedWeek.id,
          quantity,
          orderId: linkedOrderId || undefined,
          source: linkedOrderId ? 'order_addon' : 'standalone',
        }),
      })

      if (response.status === 401) {
        if (!redirectOnUnauthorized) {
          setWaitlistError(t.eggs.waitlist.genericError)
          return
        }

        const loginParams = new URLSearchParams(window.location.search || '')
        loginParams.set('waitlist', '1')
        loginParams.set('inventoryId', selectedWeek.id)
        loginParams.set('year', String(selectedWeek.year))
        loginParams.set('week', String(selectedWeek.weekNumber))
        loginParams.set('wishlistAuto', '1')
        loginParams.set('wishlistQty', String(quantity))
        if (linkedOrderId) {
          loginParams.set('orderId', linkedOrderId)
        }

        const returnTo = `${window.location.pathname}?${loginParams.toString()}`
        window.location.href = `/api/auth/vipps/login?returnTo=${encodeURIComponent(returnTo)}`
        return
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: null }))
        const backendError = String(payload?.error || '').trim()
        if (backendError) {
          const normalizedError = backendError.toLowerCase()
          if (
            normalizedError.includes('failed to create wishlist request') ||
            normalizedError.includes('failed to read inventory') ||
            normalizedError.includes('failed to validate requested breeds') ||
            normalizedError.includes('request_insert_failed') ||
            normalizedError.includes('request_not_found')
          ) {
            setWaitlistError(t.eggs.waitlist.genericError)
          } else if (normalizedError.includes('already') && normalizedError.includes('wishlist')) {
            setWaitlistError(t.eggs.waitlist.alreadyJoined)
          } else {
            setWaitlistError(backendError)
          }
          return
        }
        setWaitlistError(t.eggs.waitlist.genericError)
        return
      }

      setWaitlistSuccess(true)

      const cleanedParams = new URLSearchParams(window.location.search || '')
      cleanedParams.delete('waitlist')
      cleanedParams.delete('inventoryId')
      cleanedParams.delete('year')
      cleanedParams.delete('week')
      cleanedParams.delete('wishlistAuto')
      cleanedParams.delete('wishlistQty')
      const cleanedQuery = cleanedParams.toString()
      router.replace(cleanedQuery ? `${window.location.pathname}?${cleanedQuery}` : window.location.pathname, {
        scroll: false,
      })
    } catch (joinError) {
      console.error('Failed to create egg wishlist request', joinError)
      setWaitlistError(t.eggs.waitlist.genericError)
    } finally {
      setWaitlistSubmitting(false)
    }
  }, [linkedOrderId, router, selectedWeek, t.eggs.waitlist.genericError, t.eggs.waitlist.alreadyJoined])

  useEffect(() => {
    if (waitlistAutoHandled) return
    if (!selectedWeek || !showWaitlistModal) return
    if (waitlistSubmitting || waitlistSuccess) return
    if (searchParams.get('wishlistAuto') !== '1') return

    const qtyFromQuery = Number(searchParams.get('wishlistQty') || '1')
    const quantity = Number.isFinite(qtyFromQuery) && qtyFromQuery > 0 ? Math.floor(qtyFromQuery) : 1

    setWaitlistAutoHandled(true)
    setWaitlistQuantity(quantity)
    void submitWaitlistRequest(quantity, false)
  }, [
    searchParams,
    selectedWeek,
    showWaitlistModal,
    submitWaitlistRequest,
    waitlistAutoHandled,
    waitlistSubmitting,
    waitlistSuccess,
  ])

  const existingItem = selectedWeek
    ? items.find((item) => item.breed.id === localizedBreed?.id && item.week.id === selectedWeek.id)
    : null

  const proceedWithWeek = useCallback((week: WeekInventory) => {
    if (week.status === 'sold_out' || week.eggsAvailable <= 0) {
      setSelectedWeek(week)
      setShowWaitlistModal(true)
      setWaitlistError(null)
      setWaitlistSuccess(false)
      setWaitlistQuantity(1)
      return
    }

    setSelectedWeek(week)
    setShowQuantityModal(true)
  }, [])

  const fetchExistingOrdersForWeek = useCallback(async (week: WeekInventory) => {
    if (!isAuthenticated) return []

    const response = await fetch(`/api/eggs/existing-orders?year=${week.year}&week=${week.weekNumber}`)
    if (!response.ok) {
      return []
    }

    const payload = await response.json().catch(() => [])
    return Array.isArray(payload) ? payload as ExistingEggOrderMatch[] : []
  }, [isAuthenticated])

  const existingTargetMatchesWeek = useCallback((week: WeekInventory) => {
    if (!existingOrderTarget) return false
    return (
      existingOrderTarget.year === week.year &&
      existingOrderTarget.weekNumber === week.weekNumber &&
      existingOrderTarget.deliveryMonday === week.deliveryMonday.toISOString().split('T')[0]
    )
  }, [existingOrderTarget])

  const formatExistingOrderDelivery = useCallback((method?: string | null) => {
    if (method === 'posten') return t.eggs.myOrders.deliveryPosten
    if (method === 'e6_pickup') return t.eggs.myOrders.deliveryE6
    if (method === 'farm_pickup') return t.eggs.myOrders.deliveryFarm
    return method || t.eggs.common.week
  }, [t])

  if (isLoading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-sm text-neutral-500">
          {t.eggs.common.loadingBreed}
        </div>
      </div>
    )
  }

  if (error || !localizedBreed) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-normal text-neutral-900 mb-2">
            {error || t.eggs.breedsPage.breedNotFound}
          </h1>
          <Link href="/rugeegg/raser" className="text-neutral-600 hover:text-neutral-900">
            {t.eggs.common.backToBreeds}
          </Link>
        </div>
      </div>
    )
  }

  const handleWeekSelect = async (week: WeekInventory) => {
    if (items.length > 0) {
      const firstWeek = items[0].week
      const sameWeek = items.every((item) => isSameDeliveryWeek(item.week, firstWeek))
      if (!sameWeek || !isSameDeliveryWeek(week, firstWeek)) {
        setShowActiveOrderPrompt(true)
        return
      }
    }

    const weekKey = getWeekKey(week)
    if (existingTargetMatchesWeek(week)) {
      proceedWithWeek(week)
      return
    }

    if (isAuthenticated && !forceNewWeekKeys.includes(weekKey)) {
      const matches = await fetchExistingOrdersForWeek(week)
      if (matches.length > 0) {
        setPendingExistingWeek(week)
        setSameWeekExistingOrders(matches)
        setSelectedExistingOrderId(matches[0].id)
        setShowExistingOrderPrompt(true)
        return
      }
    }

    if (existingOrderTarget && !existingTargetMatchesWeek(week)) {
      clearExistingOrderTarget()
    }

    proceedWithWeek(week)
  }

  const handleContinueExistingOrder = () => {
    setShowActiveOrderPrompt(false)

    const firstWeek = items[0]?.week
    if (!firstWeek) {
      setSkipAutoWeek(true)
      return
    }

    const sameWeek = items.every((item) => isSameDeliveryWeek(item.week, firstWeek))
    if (!sameWeek) {
      setSkipAutoWeek(true)
      return
    }

    const matchingWeek = inventory.find((week) => isSameDeliveryWeek(week, firstWeek))
    if (!matchingWeek) {
      setSkipAutoWeek(true)
      return
    }

    if (matchingWeek.status === 'sold_out' || matchingWeek.eggsAvailable <= 0) {
      setSelectedWeek(matchingWeek)
      setShowWaitlistModal(true)
      setWaitlistError(null)
      setWaitlistSuccess(false)
      setWaitlistQuantity(1)
      return
    }

    setSelectedWeek(matchingWeek)
    setShowQuantityModal(true)
  }

  const handleStartNewOrder = () => {
    setShowActiveOrderPrompt(false)
    setSkipAutoWeek(true)
    clearCart()
    setSelectedWeek(null)
    setShowWaitlistModal(false)
    clearExistingOrderTarget()
  }

  const handleUseExistingOrder = () => {
    const target = sameWeekExistingOrders.find((order) => order.id === selectedExistingOrderId)
    if (!target || !pendingExistingWeek) return

    setExistingOrderTarget({
      id: target.id,
      orderNumber: target.orderNumber,
      weekNumber: target.weekNumber,
      year: target.year,
      deliveryMonday: target.deliveryMonday,
      customerName: target.customerName || null,
      deliveryMethod: target.deliveryMethod || null,
    })
    setShowExistingOrderPrompt(false)
    setShowNewOrderWarning(false)
    proceedWithWeek(pendingExistingWeek)
  }

  const handleStartDuplicateOrder = () => {
    setShowExistingOrderPrompt(false)
    setShowNewOrderWarning(true)
  }

  const handleConfirmDuplicateOrder = () => {
    if (!pendingExistingWeek) return

    setForceNewWeekKeys((current) => Array.from(new Set([...current, getWeekKey(pendingExistingWeek)])))
    clearExistingOrderTarget()
    setShowNewOrderWarning(false)
    proceedWithWeek(pendingExistingWeek)
  }

  const handleReturnToExistingOrderPrompt = () => {
    setShowNewOrderWarning(false)
    setShowExistingOrderPrompt(true)
  }

  const handleQuantityContinue = (quantity: number) => {
    if (selectedWeek && localizedBreed) {
      addToCart(localizedBreed, selectedWeek, quantity)
      setShowQuantityModal(false)
      setSelectedWeek(null)
      router.push('/rugeegg/handlekurv')
    }
  }

  const resetWaitlistModal = () => {
    setShowWaitlistModal(false)
    setSelectedWeek(null)
    setWaitlistError(null)
    setWaitlistSuccess(false)
    setWaitlistSubmitting(false)
    setWaitlistAutoHandled(false)
    setWaitlistQuantity(1)
  }

  const handleJoinWaitlist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedWeek) return

    const quantity = Math.max(1, Math.floor(Number(waitlistQuantity || 1)))
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setWaitlistError(t.eggs.waitlist.genericError)
      return
    }

    await submitWaitlistRequest(quantity, true)
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl">
        {/* Back button */}
        <Link
          href="/rugeegg/raser"
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
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-normal text-white flex-shrink-0"
                style={{ backgroundColor: localizedBreed.accentColor }}
              >
                {localizedBreed.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-4xl font-normal tracking-tight text-neutral-900 leading-tight">
                  {localizedBreed.name}
                </h1>
                <p className="text-lg text-neutral-600">{localizedBreed.description}</p>
              </div>
            </div>

            {/* Detailed description */}
            <GlassCard className="p-6 mb-6">
              <p className="text-base text-neutral-700 leading-relaxed">{localizedBreed.detailedDescription}</p>
            </GlassCard>

            {/* Pricing */}
            <GlassCard className="p-6 mb-6">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-sm text-neutral-600 mb-1">{t.eggs.breedsPage.pricePerEgg}</div>
                  <div className="text-3xl font-normal text-neutral-900">
                    {formatPrice(localizedBreed.pricePerEgg, language)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-neutral-500">
                {localizedBreed.slug === 'ayam-cemani'
                  ? t.eggs.cart.ayamOrderDescription
                  : t.eggs.cart.mixedOrderDescription}
              </div>
            </GlassCard>

            {/* Characteristics */}
            <GlassCard className="p-6 mb-6">
              <h2 className="text-lg font-normal text-neutral-900 mb-4">
                {t.breed.characteristics}
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-neutral-600 mb-1">{t.breed.eggColor}</div>
                  <div className="font-normal text-neutral-900">{localizedBreed.eggColor}</div>
                </div>
                <div>
                  <div className="text-neutral-600 mb-1">{t.breed.size}</div>
                  <div className="font-normal text-neutral-900">{localizedBreed.sizeRange}</div>
                </div>
                {localizedBreed.minEggWeightGrams ? (
                  <div>
                    <div className="text-neutral-600 mb-1">{t.breed.minEggWeight}</div>
                    <div className="font-normal text-neutral-900">
                      {localizedBreed.minEggWeightGrams} g+
                    </div>
                  </div>
                ) : null}
                <div>
                  <div className="text-neutral-600 mb-1">{t.breed.temperament}</div>
                  <div className="font-normal text-neutral-900">{localizedBreed.temperament}</div>
                </div>
                <div>
                  <div className="text-neutral-600 mb-1">{t.breed.production}</div>
                  <div className="font-normal text-neutral-900">{localizedBreed.annualProduction}</div>
                </div>
              </div>
            </GlassCard>

            {/* Hatching info */}
            <GlassCard className="p-6 mb-6">
              <h2 className="text-lg font-normal text-neutral-900 mb-4">
                {t.breed.hatchingInfo}
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">{t.breed.incubation}:</span>
                  <span className="font-normal text-neutral-900">
                    {localizedBreed.incubationDays} {t.breed.days}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">{t.breed.temperature}:</span>
                  <span className="font-normal text-neutral-900">{localizedBreed.temperature}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-neutral-600">{t.breed.humidity}:</span>
                  <span className="font-normal text-neutral-900 text-right">{localizedBreed.humidity}</span>
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
            <WeekSelector inventory={inventory} accentColor={localizedBreed.accentColor} onSelectWeek={handleWeekSelect} />
          </motion.div>
        </div>
      </div>

      {/* Quantity selector modal */}
      {showActiveOrderPrompt && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-4 bg-black/40">
          <GlassCard variant="strong" className="w-full max-w-lg p-6 md:p-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-normal text-neutral-900">
                  {t.eggs.activeOrderPrompt.title}
                </h2>
                <p className="text-sm text-neutral-600">
                  {t.eggs.activeOrderPrompt.description}
                </p>
              </div>
            </div>
            {items.length > 0 && (
              <div className="mb-5 rounded-xl border border-neutral-200 bg-white/70 p-4 text-sm text-neutral-700">
                <div className="font-medium text-neutral-900 mb-2">
                  {t.eggs.activeOrderPrompt.activeWeek}:{' '}
                  {items[0].week.weekNumber} - {formatDate(items[0].week.deliveryMonday, language)}
                </div>
                <div className="space-y-1">
                  {items.map((item) => (
                    <div key={`${item.breed.id}-${item.week.id}`} className="flex items-center justify-between">
                      <span>{item.breed.name}</span>
                      <span className="text-neutral-600">
                        {t.eggs.activeOrderPrompt.eggsInOrderAndLeft
                          .replace('{inOrder}', String(item.quantity))
                          .replace('{left}', String(item.week.eggsAvailable))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={handleContinueExistingOrder} className="btn-primary w-full">
                {t.eggs.activeOrderPrompt.yesContinue}
              </button>
              <button type="button" onClick={handleStartNewOrder} className="btn-secondary w-full">
                {t.eggs.activeOrderPrompt.noNewOrder}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {showExistingOrderPrompt && pendingExistingWeek && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-4 bg-black/40">
          <GlassCard variant="strong" className="w-full max-w-xl p-6 md:p-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-normal text-neutral-900">
                  {t.eggs.activeOrderPrompt.existingOrderTitle}
                </h2>
                <p className="text-sm text-neutral-600">
                  {t.eggs.activeOrderPrompt.existingOrderDescription}
                </p>
              </div>
            </div>

            <div className="mb-5 rounded-xl border border-neutral-200 bg-white/70 p-4 text-sm text-neutral-700">
              <div className="font-medium text-neutral-900 mb-2">
                {t.eggs.activeOrderPrompt.activeWeek}:{' '}
                {pendingExistingWeek.weekNumber} - {formatDate(pendingExistingWeek.deliveryMonday, language)}
              </div>
              <div className="space-y-3">
                {sameWeekExistingOrders.map((order) => (
                  <label
                    key={order.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      selectedExistingOrderId === order.id
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="existing-order"
                      value={order.id}
                      checked={selectedExistingOrderId === order.id}
                      onChange={() => setSelectedExistingOrderId(order.id)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{order.orderNumber}</span>
                        <span className={selectedExistingOrderId === order.id ? 'text-white/80' : 'text-neutral-500'}>
                          {formatExistingOrderDelivery(order.deliveryMethod)}
                        </span>
                      </div>
                      <div className={`mt-1 text-xs ${selectedExistingOrderId === order.id ? 'text-white/80' : 'text-neutral-600'}`}>
                        {order.customerName || t.eggs.activeOrderPrompt.orderWithoutName}
                      </div>
                      <div className={`mt-1 text-xs ${selectedExistingOrderId === order.id ? 'text-white/80' : 'text-neutral-600'}`}>
                        {t.eggs.activeOrderPrompt.eggsAlreadyOrdered.replace('{count}', String(order.totalQuantity))}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={handleUseExistingOrder} className="btn-primary w-full">
                {t.eggs.activeOrderPrompt.addToExistingOrder}
              </button>
              <button type="button" onClick={handleStartDuplicateOrder} className="btn-secondary w-full">
                {t.eggs.activeOrderPrompt.createNewOrder}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {showNewOrderWarning && pendingExistingWeek && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-4 bg-black/40">
          <GlassCard variant="strong" className="w-full max-w-lg p-6 md:p-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-normal text-neutral-900">
                  {t.eggs.activeOrderPrompt.duplicateWarningTitle}
                </h2>
                <p className="text-sm text-neutral-600">
                  {t.eggs.activeOrderPrompt.duplicateWarningDescription.replace('{week}', String(pendingExistingWeek.weekNumber))}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={handleReturnToExistingOrderPrompt} className="btn-secondary w-full">
                {t.eggs.activeOrderPrompt.backToExistingOrder}
              </button>
              <button type="button" onClick={handleConfirmDuplicateOrder} className="btn-primary w-full">
                {t.eggs.activeOrderPrompt.confirmDuplicateOrder}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {showQuantityModal && selectedWeek && (
        <QuantitySelector
          breed={localizedBreed}
          week={selectedWeek}
          initialQuantity={existingItem?.quantity}
          onClose={() => {
            setShowQuantityModal(false)
            setSelectedWeek(null)
          }}
          onContinue={handleQuantityContinue}
        />
      )}

      {showWaitlistModal && selectedWeek && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-4 bg-black/40">
          <GlassCard variant="strong" className="w-full max-w-lg p-6 md:p-8">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-normal text-neutral-900">
                  {t.eggs.waitlist.title}
                </h2>
                <p className="text-sm text-neutral-600">{t.eggs.waitlist.description}</p>
                <p className="text-xs text-neutral-500 mt-2">
                  {t.eggs.common.week} {selectedWeek.weekNumber} • {formatDate(selectedWeek.deliveryMonday, language)}
                </p>
              </div>
            </div>

            {!waitlistSuccess ? (
              <form onSubmit={handleJoinWaitlist} className="space-y-3">
                <div>
                  <label className="block text-sm text-neutral-700 mb-1">{t.eggs.waitlist.quantityLabel}</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={waitlistQuantity}
                    onChange={(event) => setWaitlistQuantity(Math.max(1, Number(event.target.value || 1)))}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    placeholder="1"
                  />
                </div>
                <p className="text-xs text-neutral-500">{t.eggs.waitlist.bestEffort}</p>

                {waitlistError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {waitlistError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={waitlistSubmitting}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {waitlistSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {waitlistSubmitting ? t.common.processing : t.eggs.waitlist.addButton}
                  </button>
                  <button
                    type="button"
                    onClick={resetWaitlistModal}
                    className="btn-secondary w-full"
                    disabled={waitlistSubmitting}
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <div className="font-medium">{t.eggs.waitlist.successTitle}</div>
                  <div>{t.eggs.waitlist.successDescription}</div>
                </div>
                <button type="button" onClick={resetWaitlistModal} className="btn-primary w-full">
                  {t.eggs.waitlist.closeButton}
                </button>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  )
}
