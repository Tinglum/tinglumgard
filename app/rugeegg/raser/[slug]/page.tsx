'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useOrder } from '@/contexts/eggs/EggOrderContext'
import { useCart } from '@/contexts/eggs/EggCartContext'
import { formatPrice, formatDate } from '@/lib/eggs/utils'
import { GlassCard } from '@/components/eggs/GlassCard'
import { WeekSelector } from '@/components/eggs/WeekSelector'
import { QuantitySelector } from '@/components/eggs/QuantitySelector'
import { ArrowLeft, Info, AlertTriangle, Loader2, Mail } from 'lucide-react'
import { Breed, WeekInventory } from '@/lib/eggs/types'
import { fetchBreedBySlug, fetchInventory } from '@/lib/eggs/api'
import { getSingleBreedMinimumEggs } from '@/lib/eggs/minimums'

function getWeekKey(week: WeekInventory): string {
  return `${week.year}-${week.weekNumber}-${week.deliveryMonday.toISOString().slice(0, 10)}`
}

function isSameDeliveryWeek(a: WeekInventory, b: WeekInventory): boolean {
  return getWeekKey(a) === getWeekKey(b)
}

export default function BreedDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { lang: language, t } = useLanguage()
  const loadBreedError = t.eggs.errors.loadBreed
  const { startOrder } = useOrder()
  const { items, addToCart, clearCart } = useCart()

  const [breed, setBreed] = useState<Breed | null>(null)
  const [inventory, setInventory] = useState<WeekInventory[]>([])
  const [selectedWeek, setSelectedWeek] = useState<WeekInventory | null>(null)
  const [showQuantityModal, setShowQuantityModal] = useState(false)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [showActiveOrderPrompt, setShowActiveOrderPrompt] = useState(false)
  const [skipAutoWeek, setSkipAutoWeek] = useState(false)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistName, setWaitlistName] = useState('')
  const [waitlistPhone, setWaitlistPhone] = useState('')
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false)
  const [waitlistError, setWaitlistError] = useState<string | null>(null)
  const [waitlistSuccess, setWaitlistSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const minimumPurchase = getSingleBreedMinimumEggs({
    slug: breed?.slug,
    minOrderQuantity: breed?.minOrderQuantity,
  })

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

  if (isLoading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-sm text-neutral-500">
          {t.eggs.common.loadingBreed}
        </div>
      </div>
    )
  }

  if (error || !breed) {
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

  const handleWeekSelect = (week: WeekInventory) => {
    if (items.length > 0) {
      const firstWeek = items[0].week
      const sameWeek = items.every((item) => isSameDeliveryWeek(item.week, firstWeek))
      if (!sameWeek || !isSameDeliveryWeek(week, firstWeek)) {
        setShowActiveOrderPrompt(true)
        return
      }
    }

    if (week.eggsAvailable < minimumPurchase) {
      setSelectedWeek(week)
      setShowWaitlistModal(true)
      setWaitlistError(null)
      setWaitlistSuccess(false)
      return
    }

    setSelectedWeek(week)
    setShowQuantityModal(true)
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

    if (matchingWeek.eggsAvailable < minimumPurchase) {
      setSelectedWeek(matchingWeek)
      setShowWaitlistModal(true)
      setWaitlistError(null)
      setWaitlistSuccess(false)
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
  }

  const handleQuantityContinue = (quantity: number) => {
    if (selectedWeek) {
      addToCart(breed, selectedWeek, quantity)
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
    setWaitlistEmail('')
    setWaitlistName('')
    setWaitlistPhone('')
  }

  const handleJoinWaitlist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedWeek) return

    const email = waitlistEmail.trim().toLowerCase()
    if (!email) {
      setWaitlistError(t.eggs.waitlist.genericError)
      return
    }

    try {
      setWaitlistSubmitting(true)
      setWaitlistError(null)

      const response = await fetch('/api/eggs/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryId: selectedWeek.id,
          email,
          name: waitlistName.trim() || undefined,
          phone: waitlistPhone.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        if (response.status === 409 && payload?.error === 'Stock available now') {
          setWaitlistError(t.eggs.waitlist.unavailableNow)
          return
        }
        if (response.status === 409) {
          setWaitlistError(t.eggs.waitlist.alreadyJoined)
          return
        }
        setWaitlistError(t.eggs.waitlist.genericError)
        return
      }

      setWaitlistSuccess(true)
    } catch (joinError) {
      console.error('Failed to join egg waitlist', joinError)
      setWaitlistError(t.eggs.waitlist.genericError)
    } finally {
      setWaitlistSubmitting(false)
    }
  }

  const existingItem = selectedWeek
    ? items.find((item) => item.breed.id === breed.id && item.week.id === selectedWeek.id)
    : null

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
                style={{ backgroundColor: breed.accentColor }}
              >
                {breed.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-4xl font-normal tracking-tight text-neutral-900 leading-tight">
                  {breed.name}
                </h1>
                <p className="text-lg text-neutral-600">{breed.description}</p>
              </div>
            </div>

            {/* Detailed description */}
            <GlassCard className="p-6 mb-6">
              <p className="text-base text-neutral-700 leading-relaxed">{breed.detailedDescription}</p>
            </GlassCard>

            {/* Pricing */}
            <GlassCard className="p-6 mb-6">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-sm text-neutral-600 mb-1">{t.eggs.breedsPage.pricePerEgg}</div>
                  <div className="text-3xl font-normal text-neutral-900">
                    {formatPrice(breed.pricePerEgg, language)}
                  </div>
                </div>
                <div className="text-right text-sm text-neutral-600">
                  <div>{t.breed.minOrder}:</div>
                  <div className="font-normal text-neutral-900">
                    {breed.minOrderQuantity} {t.breed.eggs}
                  </div>
                </div>
              </div>
              <div className="text-xs text-neutral-500">
                {t.breed.deliveryFrom} 300 {t.breed.pricePerEgg} · {t.breed.calculatedAtCheckout}
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
                  <div className="font-normal text-neutral-900">{breed.eggColor}</div>
                </div>
                <div>
                  <div className="text-neutral-600 mb-1">{t.breed.size}</div>
                  <div className="font-normal text-neutral-900">{breed.sizeRange}</div>
                </div>
                {breed.minEggWeightGrams ? (
                  <div>
                    <div className="text-neutral-600 mb-1">{t.breed.minEggWeight}</div>
                    <div className="font-normal text-neutral-900">
                      {breed.minEggWeightGrams} g+
                    </div>
                  </div>
                ) : null}
                <div>
                  <div className="text-neutral-600 mb-1">{t.breed.temperament}</div>
                  <div className="font-normal text-neutral-900">{breed.temperament}</div>
                </div>
                <div>
                  <div className="text-neutral-600 mb-1">{t.breed.production}</div>
                  <div className="font-normal text-neutral-900">{breed.annualProduction}</div>
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
                    {breed.incubationDays} {t.breed.days}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">{t.breed.temperature}:</span>
                  <span className="font-normal text-neutral-900">{breed.temperature}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-neutral-600">{t.breed.humidity}:</span>
                  <span className="font-normal text-neutral-900 text-right">{breed.humidity}</span>
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
            <WeekSelector inventory={inventory} accentColor={breed.accentColor} onSelectWeek={handleWeekSelect} />
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
                  {items[0].week.weekNumber} · {formatDate(items[0].week.deliveryMonday, language)}
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

      {showQuantityModal && selectedWeek && (
        <QuantitySelector
          breed={breed}
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
                <p className="text-sm text-neutral-600">
                  {t.eggs.waitlist.description.replace('{min}', String(minimumPurchase))}
                </p>
                <p className="text-xs text-neutral-500 mt-2">
                  {t.eggs.common.week} {selectedWeek.weekNumber} • {formatDate(selectedWeek.deliveryMonday, language)}
                </p>
              </div>
            </div>

            {!waitlistSuccess ? (
              <form onSubmit={handleJoinWaitlist} className="space-y-3">
                <div>
                  <label className="block text-sm text-neutral-700 mb-1">{t.eggs.waitlist.emailLabel}</label>
                  <input
                    type="email"
                    required
                    value={waitlistEmail}
                    onChange={(event) => setWaitlistEmail(event.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    placeholder={t.eggs.waitlist.emailPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-700 mb-1">{t.eggs.waitlist.nameLabel}</label>
                  <input
                    type="text"
                    value={waitlistName}
                    onChange={(event) => setWaitlistName(event.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-700 mb-1">{t.eggs.waitlist.phoneLabel}</label>
                  <input
                    type="tel"
                    value={waitlistPhone}
                    onChange={(event) => setWaitlistPhone(event.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>

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
