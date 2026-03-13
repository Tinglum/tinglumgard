'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { BrowseMode } from '@/lib/eggs/types'
import { formatPrice, formatDate } from '@/lib/eggs/utils'
import { GlassCard } from '@/components/eggs/GlassCard'
import { ArrowRight, Loader2, Mail } from 'lucide-react'
import { buildWeekAvailability, fetchBreeds, fetchInventory } from '@/lib/eggs/api'
import { localizeBreeds } from '@/lib/eggs/localize'
import type { Breed, WeekAvailability } from '@/lib/eggs/types'

type WishlistMode = 'order_addon' | 'week' | 'asap'

type MyEggOrder = {
  id: string
  orderNumber: string
  year: number
  weekNumber: number
  status: string
}

type BreedOption = {
  breedId: string
  breedName: string
}

function getWeekKey(week: Pick<WeekAvailability, 'year' | 'weekNumber'>): string {
  return `${week.year}-${week.weekNumber}`
}

export default function HomePage() {
  const router = useRouter()
  const { lang: language, t } = useLanguage()
  const searchParams = useSearchParams()
  const loadEggDataError = t.eggs.errors.loadEggData
  const [browseMode, setBrowseMode] = useState<BrowseMode>('week')
  const [breeds, setBreeds] = useState<Breed[]>([])
  const [weekAvailability, setWeekAvailability] = useState<WeekAvailability[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWishlistModal, setShowWishlistModal] = useState(false)
  const [wishlistMode, setWishlistMode] = useState<WishlistMode>('week')
  const [wishlistWeekKey, setWishlistWeekKey] = useState('')
  const [wishlistBreedId, setWishlistBreedId] = useState('')
  const [wishlistQuantity, setWishlistQuantity] = useState('')
  const [wishlistOrderId, setWishlistOrderId] = useState('')
  const [wishlistNotes, setWishlistNotes] = useState('')
  const [wishlistSubmitting, setWishlistSubmitting] = useState(false)
  const [wishlistSuccess, setWishlistSuccess] = useState(false)
  const [wishlistError, setWishlistError] = useState<string | null>(null)
  const [wishlistPrefillHandled, setWishlistPrefillHandled] = useState(false)
  const [wishlistAutoPending, setWishlistAutoPending] = useState(false)
  const [myOrders, setMyOrders] = useState<MyEggOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const localizedBreeds = useMemo(
    () => localizeBreeds(breeds, t.eggs.breedDetails),
    [breeds, t.eggs.breedDetails]
  )
  const linkedOrderId = String(searchParams.get('orderId') || '').trim()
  const weekAvailabilityForView = useMemo(() => weekAvailability.slice(0, 12), [weekAvailability])
  const selectedOrder = useMemo(
    () => myOrders.find((order) => order.id === wishlistOrderId) || null,
    [myOrders, wishlistOrderId]
  )

  const waitlistPanelTitle =
    t.browse.waitlistPanelTitle ||
    (language === 'no'
      ? 'Mangler du ønsket uke eller antall egg?'
      : 'Missing your preferred week or egg quantity?')
  const waitlistPanelDescription =
    t.browse.waitlistPanelDescription ||
    (language === 'no'
      ? 'Hvis ønsket uke er full, utsolgt eller antallet ikke er tilgjengelig, kan du legge inn ønskeliste. Vi fordeler manuelt ved avbestillinger og overproduksjon.'
      : 'If your preferred week is full, sold out, or the quantity is unavailable, you can add a wishlist request. We allocate manually when cancellations or overproduction happen.')
  const waitlistPanelButton =
    t.browse.waitlistPanelButton || (language === 'no' ? 'Åpne ønskeliste' : 'Open wishlist')
  useEffect(() => {
    let isActive = true
    async function loadData() {
      try {
        setIsLoading(true)
        const [breedsData, inventory] = await Promise.all([fetchBreeds(), fetchInventory()])
        if (!isActive) return
        setBreeds(breedsData)
        setWeekAvailability(buildWeekAvailability(inventory))
      } catch (err) {
        if (!isActive) return
        console.error('Failed to load egg data', err)
        setError(loadEggDataError)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }
    loadData()
    return () => {
      isActive = false
    }
  }, [language, loadEggDataError])

  useEffect(() => {
    if (wishlistWeekKey || weekAvailabilityForView.length === 0) return
    setWishlistWeekKey(getWeekKey(weekAvailabilityForView[0]))
  }, [weekAvailabilityForView, wishlistWeekKey])

  const allBreedOptions = useMemo<BreedOption[]>(() => {
    const map = new Map<string, string>()
    weekAvailability.forEach((week) => {
      week.breeds.forEach((breed) => {
        const isWishable = breed.status === 'available' || breed.status === 'sold_out'
        if (!isWishable) return
        if (!map.has(breed.breedId)) {
          map.set(breed.breedId, breed.breedName)
        }
      })
    })
    return Array.from(map.entries()).map(([breedId, breedName]) => ({ breedId, breedName }))
  }, [weekAvailability])

  const selectedWeekForWishlist = useMemo(() => {
    if (wishlistMode === 'order_addon') {
      if (!selectedOrder) return null
      return (
        weekAvailability.find(
          (week) =>
            week.year === selectedOrder.year && week.weekNumber === selectedOrder.weekNumber
        ) || null
      )
    }

    if (wishlistMode === 'week') {
      return weekAvailability.find((week) => getWeekKey(week) === wishlistWeekKey) || null
    }

    if (!wishlistBreedId) return null
    return (
      weekAvailability.find((week) =>
        week.breeds.some(
          (breed) =>
            breed.breedId === wishlistBreedId &&
            (breed.status === 'available' || breed.status === 'sold_out')
        )
      ) || null
    )
  }, [weekAvailability, wishlistMode, wishlistWeekKey, selectedOrder, wishlistBreedId])

  const breedOptionsForMode = useMemo<BreedOption[]>(() => {
    if (wishlistMode === 'asap') {
      return allBreedOptions
    }
    if (!selectedWeekForWishlist) {
      return []
    }
    return selectedWeekForWishlist.breeds
      .filter((breed) => breed.status === 'available' || breed.status === 'sold_out')
      .map((breed) => ({
        breedId: breed.breedId,
        breedName: breed.breedName,
      }))
  }, [allBreedOptions, selectedWeekForWishlist, wishlistMode])

  useEffect(() => {
    if (breedOptionsForMode.length === 0) {
      setWishlistBreedId('')
      return
    }
    const exists = breedOptionsForMode.some((breed) => breed.breedId === wishlistBreedId)
    if (!exists) {
      setWishlistBreedId(breedOptionsForMode[0].breedId)
    }
  }, [breedOptionsForMode, wishlistBreedId])

  useEffect(() => {
    if (wishlistMode !== 'order_addon' || !selectedOrder) return
    setWishlistWeekKey(`${selectedOrder.year}-${selectedOrder.weekNumber}`)
  }, [wishlistMode, selectedOrder])

  const clearWishlistQueryParams = useCallback(() => {
    const cleaned = new URLSearchParams(searchParams.toString())
    ;[
      'wishlistOpen',
      'wishlistAuto',
      'wishlistMode',
      'wishlistWeek',
      'wishlistBreedId',
      'wishlistQty',
      'wishlistOrderId',
      'wishlistNotes',
    ].forEach((key) => cleaned.delete(key))

    const query = cleaned.toString()
    const nextPath = query ? `/rugeegg?${query}` : '/rugeegg'
    router.replace(nextPath, { scroll: false })
  }, [router, searchParams])

  const loadMyOrders = useCallback(async () => {
    if (ordersLoading || ordersLoaded) return

    try {
      setOrdersLoading(true)

      const response = await fetch('/api/eggs/my-orders', { cache: 'no-store' })
      if (!response.ok) {
        setMyOrders([])
        return
      }

      const payload = (await response.json().catch(() => [])) as any[]
      if (!Array.isArray(payload)) {
        setMyOrders([])
        return
      }

      const mapped: MyEggOrder[] = payload
        .map((row) => ({
          id: String(row?.id || ''),
          orderNumber: String(row?.order_number || row?.orderNumber || ''),
          year: Number(row?.year),
          weekNumber: Number(row?.week_number || row?.weekNumber),
          status: String(row?.status || ''),
        }))
        .filter(
          (row) =>
            row.id &&
            row.orderNumber &&
            Number.isFinite(row.year) &&
            Number.isFinite(row.weekNumber) &&
            row.status !== 'cancelled' &&
            row.status !== 'forfeited'
        )
        .sort((a, b) => b.orderNumber.localeCompare(a.orderNumber))

      setMyOrders(mapped)
    } catch (loadOrdersError) {
      setMyOrders([])
      console.error('Failed to load my egg orders for wishlist', loadOrdersError)
    } finally {
      setOrdersLoading(false)
      setOrdersLoaded(true)
    }
  }, [ordersLoaded, ordersLoading])

  useEffect(() => {
    if (!showWishlistModal || wishlistMode !== 'order_addon') return
    void loadMyOrders()
  }, [showWishlistModal, wishlistMode, loadMyOrders])

  useEffect(() => {
    if (wishlistPrefillHandled) return
    if (weekAvailability.length === 0) return

    if (searchParams.get('wishlistOpen') !== '1') {
      setWishlistPrefillHandled(true)
      return
    }

    const modeFromQuery = String(searchParams.get('wishlistMode') || '').trim()
    if (modeFromQuery === 'order_addon' || modeFromQuery === 'week' || modeFromQuery === 'asap') {
      setWishlistMode(modeFromQuery)
    }

    const weekFromQuery = String(searchParams.get('wishlistWeek') || '').trim()
    if (weekFromQuery) setWishlistWeekKey(weekFromQuery)

    const breedFromQuery = String(searchParams.get('wishlistBreedId') || '').trim()
    if (breedFromQuery) setWishlistBreedId(breedFromQuery)

    const qtyFromQuery = Number(searchParams.get('wishlistQty') || '')
    if (Number.isFinite(qtyFromQuery) && qtyFromQuery > 0) {
      setWishlistQuantity(String(Math.floor(qtyFromQuery)))
    }

    const orderFromQuery = String(searchParams.get('wishlistOrderId') || '').trim()
    if (orderFromQuery) setWishlistOrderId(orderFromQuery)

    const notesFromQuery = String(searchParams.get('wishlistNotes') || '').trim()
    if (notesFromQuery) setWishlistNotes(notesFromQuery)

    setShowWishlistModal(true)
    setWishlistAutoPending(searchParams.get('wishlistAuto') === '1')
    setWishlistPrefillHandled(true)
  }, [searchParams, weekAvailability, wishlistPrefillHandled])

  const submitWishlistRequest = useCallback(
    async (redirectOnUnauthorized = true) => {
      const quantity = Math.floor(Number(wishlistQuantity || '0'))
      if (!Number.isFinite(quantity) || quantity <= 0) {
        setWishlistError(t.eggs.waitlist.genericError)
        return
      }

      if (!wishlistBreedId) {
        setWishlistError(t.eggs.waitlist.invalidSelection || t.eggs.waitlist.genericError)
        return
      }

      if (wishlistMode === 'order_addon' && !wishlistOrderId) {
        setWishlistError(t.eggs.waitlist.noEligibleOrders || t.eggs.waitlist.genericError)
        return
      }

      const targetWeek = selectedWeekForWishlist
      if (!targetWeek) {
        setWishlistError(t.eggs.waitlist.invalidSelection || t.eggs.waitlist.genericError)
        return
      }

      const targetBreed = targetWeek.breeds.find((breed) => breed.breedId === wishlistBreedId)
      if (!targetBreed || (targetBreed.status !== 'available' && targetBreed.status !== 'sold_out')) {
        setWishlistError(t.eggs.waitlist.invalidSelection || t.eggs.waitlist.genericError)
        return
      }

      const modeNote =
        wishlistMode === 'order_addon'
          ? 'mode=order_addon'
          : wishlistMode === 'week'
            ? 'mode=specific_week'
            : 'mode=asap'

      const composedNotes = [wishlistNotes.trim(), modeNote].filter(Boolean).join(' | ')

      try {
        setWishlistSubmitting(true)
        setWishlistError(null)

        const response = await fetch('/api/eggs/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inventoryId: targetBreed.inventoryId,
            orderId: wishlistMode === 'order_addon' ? wishlistOrderId : undefined,
            source: wishlistMode === 'order_addon' ? 'order_addon' : 'standalone',
            quantity,
            items: [{ breedId: wishlistBreedId, quantity }],
            notes: composedNotes || undefined,
          }),
        })

        if (response.status === 401) {
          if (!redirectOnUnauthorized) {
            setWishlistError(t.eggs.waitlist.genericError)
            return
          }

          const params = new URLSearchParams()
          params.set('wishlistOpen', '1')
          params.set('wishlistAuto', '1')
          params.set('wishlistMode', wishlistMode)
          params.set('wishlistBreedId', wishlistBreedId)
          params.set('wishlistQty', String(quantity))
          if (wishlistMode !== 'asap') params.set('wishlistWeek', wishlistWeekKey)
          if (wishlistMode === 'order_addon' && wishlistOrderId) {
            params.set('wishlistOrderId', wishlistOrderId)
          }
          if (wishlistNotes.trim()) params.set('wishlistNotes', wishlistNotes.trim())
          if (linkedOrderId) params.set('orderId', linkedOrderId)

          const returnTo = `/rugeegg?${params.toString()}`
          window.location.href = `/api/auth/vipps/login?returnTo=${encodeURIComponent(returnTo)}`
          return
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: null }))
          const backendError = String(payload?.error || '').trim()
          const normalizedError = backendError.toLowerCase()

          if (normalizedError.includes('already') && normalizedError.includes('wishlist')) {
            setWishlistError(t.eggs.waitlist.alreadyJoined)
          } else if (backendError) {
            setWishlistError(backendError)
          } else {
            setWishlistError(t.eggs.waitlist.genericError)
          }
          return
        }

        setWishlistSuccess(true)
        setWishlistAutoPending(false)
        clearWishlistQueryParams()
      } catch (submitError) {
        console.error('Failed to create wishlist request', submitError)
        setWishlistError(t.eggs.waitlist.genericError)
      } finally {
        setWishlistSubmitting(false)
      }
    },
    [
      clearWishlistQueryParams,
      linkedOrderId,
      selectedWeekForWishlist,
      t.eggs.waitlist.alreadyJoined,
      t.eggs.waitlist.genericError,
      t.eggs.waitlist.invalidSelection,
      t.eggs.waitlist.noEligibleOrders,
      wishlistBreedId,
      wishlistMode,
      wishlistNotes,
      wishlistOrderId,
      wishlistQuantity,
      wishlistWeekKey,
    ]
  )

  useEffect(() => {
    if (!wishlistAutoPending || !showWishlistModal) return
    if (wishlistSubmitting || wishlistSuccess) return
    if (wishlistMode === 'order_addon' && ordersLoading) return

    setWishlistAutoPending(false)
    void submitWishlistRequest(false)
  }, [
    ordersLoading,
    showWishlistModal,
    submitWishlistRequest,
    wishlistAutoPending,
    wishlistMode,
    wishlistSubmitting,
    wishlistSuccess,
  ])

  const openWishlistModal = () => {
    setShowWishlistModal(true)
    setWishlistSuccess(false)
    setWishlistError(null)
  }

  const closeWishlistModal = () => {
    setShowWishlistModal(false)
    setWishlistSuccess(false)
    setWishlistError(null)
    setWishlistAutoPending(false)
    clearWishlistQueryParams()
  }

  const handleWishlistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submitWishlistRequest(true)
  }

  const wishlistInfoCard = (
    <GlassCard className="w-full text-left p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
          <Mail className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-neutral-900 mb-1">{waitlistPanelTitle}</h3>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mb-3">
            {waitlistPanelDescription}
          </p>
          <button type="button" onClick={openWishlistModal} className="btn-secondary text-sm">
            {waitlistPanelButton}
          </button>
        </div>
      </div>
    </GlassCard>
  )

  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-6xl mx-auto"
        >
          <h1 className="text-5xl md:text-6xl font-normal tracking-tight text-neutral-900 mb-6 leading-tight">
            {t.eggsHero.title}
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 mb-12 leading-relaxed max-w-prose mx-auto">
            {t.eggsHero.subtitle}
          </p>

          <div
            className={cn(
              'mb-16 text-left gap-6',
              browseMode === 'week'
                ? 'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] items-start'
                : 'block'
            )}
          >
            <div className="min-w-0">
              <div className="mb-8 flex justify-center lg:justify-start">
                <div className="inline-flex glass-light rounded-xl p-1">
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
              </div>

              {error && <div className="max-w-xl mb-8 text-sm text-red-600">{error}</div>}

              {/* Browse by Breed view */}
              {browseMode === 'breed' && (
                <motion.div
                  key="breed-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {isLoading && (
                    <div className="col-span-full text-sm text-neutral-500">
                      {t.eggs.common.loadingBreeds}
                    </div>
                  )}
                  {localizedBreeds.map((breed, index) => (
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
                              <h3 className="text-xl font-normal text-neutral-900 mb-1 leading-snug">
                                {breed.name}
                              </h3>
                              <p className="text-sm text-neutral-600 leading-normal line-clamp-2">
                                {breed.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm text-neutral-600 mb-4">
                            <div>
                              <span className="font-medium">{breed.eggColor}</span> - {breed.annualProduction}
                            </div>
                          </div>

                          <div className="flex items-end justify-between">
                            <div>
                              <div className="text-2xl font-normal text-neutral-900">
                                {formatPrice(breed.pricePerEgg, language)}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {t.breed.deliveryFrom} 300 {t.breed.pricePerEgg} - {t.breed.calculatedAtCheckout}
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
                  className="space-y-4"
                >
                  {isLoading && <div className="text-sm text-neutral-500">{t.eggs.common.loadingWeeks}</div>}
                  {weekAvailabilityForView.map((week, index) => (
                    <motion.div
                      key={`${week.year}-${week.weekNumber}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                    >
                      <GlassCard className="p-6">
                        <div className="mb-4 pb-4 border-b border-neutral-200">
                          <h3 className="text-lg font-normal text-neutral-900">
                            {t.browse.week} {week.weekNumber} - {formatDate(week.deliveryMonday, language)}
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {week.breeds.map((breed) => {
                            const breedHref = linkedOrderId
                              ? `/rugeegg/raser/${breed.breedSlug}?orderId=${encodeURIComponent(linkedOrderId)}`
                              : `/rugeegg/raser/${breed.breedSlug}`
                            const isClickable = breed.status !== 'closed' && breed.status !== 'locked'

                            return (
                              <Link
                                key={breed.breedId}
                                href={isClickable ? breedHref : '#'}
                                className={cn(
                                  'flex items-center justify-between py-2 px-3 rounded transition-colors group',
                                  isClickable
                                    ? 'hover:bg-neutral-50 cursor-pointer'
                                    : 'cursor-not-allowed opacity-70'
                                )}
                                onClick={(event) => {
                                  if (!isClickable) event.preventDefault()
                                }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-normal text-white"
                                    style={{ backgroundColor: breed.accentColor }}
                                  >
                                    {breed.breedName.charAt(0)}
                                  </div>
                                  <span className="font-medium text-neutral-900 truncate">{breed.breedName}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    {breed.status === 'sold_out' ? (
                                      <div className="text-sm font-medium text-neutral-500">{t.browse.soldOut}</div>
                                    ) : breed.status === 'closed' || breed.status === 'locked' ? (
                                      <div className="text-sm text-neutral-500">{t.browse.notOpenForOrdering}</div>
                                    ) : (
                                      <div className="text-sm text-neutral-600">
                                        {breed.eggsAvailable} {t.browse.eggsAvailable}
                                      </div>
                                    )}
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {browseMode === 'week' ? (
              <aside className="lg:sticky lg:top-28 lg:self-start">{wishlistInfoCard}</aside>
            ) : null}
          </div>
        </motion.div>
      </section>

      {showWishlistModal && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-4 bg-black/40">
          <GlassCard variant="strong" className="w-full max-w-2xl p-5 md:p-7">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">{t.eggs.waitlist.title}</h2>
                <p className="text-sm text-neutral-600">{t.eggs.waitlist.description}</p>
              </div>
            </div>

            {!wishlistSuccess ? (
              <form onSubmit={handleWishlistSubmit} className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-neutral-800 mb-2">{t.eggs.waitlist.modeLabel}</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setWishlistMode('order_addon')}
                      className={cn(
                        'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                        wishlistMode === 'order_addon'
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                      )}
                    >
                      {t.eggs.waitlist.modeOrderAddon}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWishlistMode('week')}
                      className={cn(
                        'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                        wishlistMode === 'week'
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                      )}
                    >
                      {t.eggs.waitlist.modeSpecificWeek}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWishlistMode('asap')}
                      className={cn(
                        'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                        wishlistMode === 'asap'
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                      )}
                    >
                      {t.eggs.waitlist.modeAsap}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    {wishlistMode === 'order_addon'
                      ? t.eggs.waitlist.modeOrderAddonHint
                      : wishlistMode === 'week'
                        ? t.eggs.waitlist.modeSpecificWeekHint
                        : t.eggs.waitlist.modeAsapHint}
                  </p>
                </div>

                {wishlistMode === 'order_addon' ? (
                  <div>
                    <label className="block text-sm text-neutral-700 mb-1">
                      {t.eggs.waitlist.orderSelectLabel}
                    </label>
                    <select
                      value={wishlistOrderId}
                      onChange={(event) => setWishlistOrderId(event.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                      required
                    >
                      <option value="">{t.eggs.waitlist.orderSelectPlaceholder}</option>
                      {myOrders.map((order) => (
                        <option key={order.id} value={order.id}>
                          {order.orderNumber} - {t.browse.week} {order.weekNumber}
                        </option>
                      ))}
                    </select>
                    {ordersLoading && <div className="text-xs text-neutral-500 mt-1">{t.common.loading}</div>}
                    {!ordersLoading && ordersLoaded && myOrders.length === 0 && (
                      <div className="text-xs text-amber-700 mt-1">{t.eggs.waitlist.noEligibleOrders}</div>
                    )}
                  </div>
                ) : null}

                {wishlistMode === 'week' ? (
                  <div>
                    <label className="block text-sm text-neutral-700 mb-1">
                      {t.eggs.waitlist.weekSelectLabel}
                    </label>
                    <select
                      value={wishlistWeekKey}
                      onChange={(event) => setWishlistWeekKey(event.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                      required
                    >
                      <option value="">{t.eggs.waitlist.weekSelectPlaceholder}</option>
                      {weekAvailabilityForView.map((week) => (
                        <option key={getWeekKey(week)} value={getWeekKey(week)}>
                          {t.browse.week} {week.weekNumber} - {formatDate(week.deliveryMonday, language)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {wishlistMode === 'asap' && selectedWeekForWishlist ? (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
                    {t.eggs.waitlist.weekAutoSelected}: {t.browse.week} {selectedWeekForWishlist.weekNumber} -{' '}
                    {formatDate(selectedWeekForWishlist.deliveryMonday, language)}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-neutral-700 mb-1">
                      {t.eggs.waitlist.breedSelectLabel}
                    </label>
                    <select
                      value={wishlistBreedId}
                      onChange={(event) => setWishlistBreedId(event.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                      required
                    >
                      <option value="">{t.eggs.waitlist.breedSelectPlaceholder}</option>
                      {breedOptionsForMode.map((breed) => (
                        <option key={breed.breedId} value={breed.breedId}>
                          {breed.breedName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-700 mb-1">
                      {t.eggs.waitlist.quantityLabel}
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={wishlistQuantity}
                      onChange={(event) =>
                        setWishlistQuantity(event.target.value.replace(/[^\d]/g, ''))
                      }
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                      placeholder="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-neutral-700 mb-1">{t.eggs.waitlist.notesLabel}</label>
                  <textarea
                    value={wishlistNotes}
                    onChange={(event) => setWishlistNotes(event.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    rows={2}
                    placeholder={t.eggs.waitlist.notesPlaceholder}
                  />
                </div>

                <p className="text-xs text-neutral-500">{t.eggs.waitlist.bestEffort}</p>

                {wishlistError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {wishlistError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={wishlistSubmitting}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {wishlistSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {wishlistSubmitting ? t.common.processing : t.eggs.waitlist.addButton}
                  </button>
                  <button
                    type="button"
                    onClick={closeWishlistModal}
                    className="btn-secondary w-full"
                    disabled={wishlistSubmitting}
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
                <button type="button" onClick={closeWishlistModal} className="btn-primary w-full">
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

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}


