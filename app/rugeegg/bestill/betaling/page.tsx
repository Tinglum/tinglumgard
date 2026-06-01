'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/eggs/GlassCard'
import { useLanguage } from '@/contexts/LanguageContext'
import { useOrder } from '@/contexts/eggs/EggOrderContext'
import { useCart } from '@/contexts/eggs/EggCartContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate, formatPrice } from '@/lib/eggs/utils'
import { AlertTriangle, ArrowRight, CreditCard, ShieldCheck } from 'lucide-react'

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

export default function EggPaymentPage() {
  const router = useRouter()
  const { lang: language, t } = useLanguage()
  const { currentDraft, clearDraft, existingOrderTarget, setExistingOrderTarget, clearExistingOrderTarget, isHydrated } = useOrder()
  const { clearCart } = useCart()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sameWeekExistingOrders, setSameWeekExistingOrders] = useState<ExistingEggOrderMatch[]>([])
  const [selectedExistingOrderId, setSelectedExistingOrderId] = useState<string>('')
  const [showExistingOrderPrompt, setShowExistingOrderPrompt] = useState(false)
  const [showNewOrderWarning, setShowNewOrderWarning] = useState(false)
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false)
  const copy = t.eggs.payment

  useEffect(() => {
    if (!isHydrated) return
    if (!currentDraft) {
      router.replace('/rugeegg/handlekurv')
      return
    }
    if (!currentDraft.deliveryMethod) {
      router.replace('/rugeegg/bestill/levering')
    }
  }, [currentDraft, isHydrated, router])

  const matchingExistingTarget = useMemo(() => {
    if (!currentDraft || !existingOrderTarget) return false
    return (
      existingOrderTarget.year === currentDraft.deliveryWeek.year &&
      existingOrderTarget.weekNumber === currentDraft.deliveryWeek.weekNumber &&
      existingOrderTarget.deliveryMonday === currentDraft.deliveryWeek.deliveryMonday.toISOString().split('T')[0]
    )
  }, [currentDraft, existingOrderTarget])

  useEffect(() => {
    if (!currentDraft || !matchingExistingTarget) return
    router.replace(`/rugeegg/mine-bestillinger/${existingOrderTarget?.id}/betaling?fromCart=1`)
  }, [currentDraft, existingOrderTarget?.id, matchingExistingTarget, router])

  useEffect(() => {
    if (!currentDraft || authLoading || !isAuthenticated || duplicateConfirmed || matchingExistingTarget) return

    let isMounted = true
    const targetYear = currentDraft.deliveryWeek.year
    const targetWeek = currentDraft.deliveryWeek.weekNumber

    async function loadExistingOrders() {
      try {
        const response = await fetch(
          `/api/eggs/existing-orders?year=${targetYear}&week=${targetWeek}`
        )
        if (!response.ok) return

        const payload = await response.json().catch(() => [])
        if (!isMounted || !Array.isArray(payload) || payload.length === 0) return

        setSameWeekExistingOrders(payload)
        setSelectedExistingOrderId(String(payload[0].id || ''))
        setShowExistingOrderPrompt(true)
      } catch (lookupError) {
        console.error('Failed to load existing egg orders:', lookupError)
      }
    }

    loadExistingOrders()
    return () => {
      isMounted = false
    }
  }, [authLoading, currentDraft, duplicateConfirmed, isAuthenticated, matchingExistingTarget])

  if (!currentDraft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-neutral-500">{t.eggs.common.loading}</div>
      </div>
    )
  }

  const totalEggs = currentDraft.items.reduce((sum, item) => sum + item.quantity, 0)
  const shippingAddress = currentDraft.shippingAddress || ''
  const shippingPostalCode = currentDraft.shippingPostalCode || ''
  const shippingCity = currentDraft.shippingCity || ''
  const shippingCountry = currentDraft.shippingCountry || ''
  const requiresShipping = currentDraft.deliveryMethod === 'posten'
  const shippingComplete = !requiresShipping || (
    shippingAddress.trim() &&
    shippingPostalCode.trim() &&
    shippingCity.trim() &&
    shippingCountry.trim()
  )

  const formatExistingOrderDelivery = (method?: string | null) => {
    if (method === 'posten') return t.eggs.myOrders.deliveryPosten
    if (method === 'e6_pickup') return t.eggs.myOrders.deliveryE6
    if (method === 'farm_pickup') return t.eggs.myOrders.deliveryFarm
    return method || t.eggs.common.week
  }

  const handleAuthenticate = () => {
    const returnTo = '/rugeegg/bestill/betaling'
    window.location.href = `/api/auth/vipps/login?returnTo=${encodeURIComponent(returnTo)}`
  }

  const handleCreateOrderAndPay = async () => {
    if (!shippingComplete) {
      setError(t.eggs.errors.shippingAddressMissing)
      return
    }

    if (!isAuthenticated || !user) {
      handleAuthenticate()
      return
    }

    setIsPaying(true)
    setError(null)

    try {
      const orderDetails = {
        productType: 'eggs',
        items: currentDraft.items.map((item) => ({
          breedId: item.breed.id,
          inventoryId: item.week.id,
          quantity: item.quantity,
        })),
        deliveryMethod: currentDraft.deliveryMethod,
        shippingAddress: requiresShipping ? shippingAddress : undefined,
        shippingPostalCode: requiresShipping ? shippingPostalCode : undefined,
        shippingCity: requiresShipping ? shippingCity : undefined,
        shippingCountry: requiresShipping ? shippingCountry : undefined,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phoneNumber,
        notes: '',
      }

      const createResponse = await fetch('/api/eggs/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderDetails),
      })
      const createResult = await createResponse.json().catch(() => null)

      if (!createResponse.ok || !createResult?.orderId) {
        throw new Error(createResult?.error || t.eggs.errors.couldNotCreateCheckout)
      }

      const depositHeaders: HeadersInit = {}
      if (createResult.orderAccessToken) {
        depositHeaders['x-order-access-token'] = createResult.orderAccessToken
      }

      const depositResponse = await fetch(`/api/eggs/orders/${createResult.orderId}/deposit`, {
        method: 'POST',
        headers: depositHeaders,
      })
      const depositResult = await depositResponse.json().catch(() => null)

      if (!depositResponse.ok || !depositResult?.redirectUrl) {
        throw new Error(depositResult?.error || t.eggs.errors.couldNotStartPayment)
      }

      clearCart()
      clearDraft()
      clearExistingOrderTarget()
      window.location.href = depositResult.redirectUrl
    } catch (paymentError) {
      console.error('Egg checkout payment error', paymentError)
      setError(paymentError instanceof Error ? paymentError.message : t.eggs.errors.vippsLoginFailed)
      setIsPaying(false)
    }
  }

  const handleUseExistingOrder = () => {
    const target = sameWeekExistingOrders.find((order) => order.id === selectedExistingOrderId)
    if (!target) return

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
    router.push(`/rugeegg/mine-bestillinger/${target.id}/betaling?fromCart=1`)
  }

  const handleOpenDuplicateWarning = () => {
    setShowExistingOrderPrompt(false)
    setShowNewOrderWarning(true)
  }

  const handleBackToExistingOrder = () => {
    setShowNewOrderWarning(false)
    setShowExistingOrderPrompt(true)
  }

  const handleConfirmDuplicateOrder = () => {
    setDuplicateConfirmed(true)
    setShowNewOrderWarning(false)
    clearExistingOrderTarget()
  }

  return (
    <div className="min-h-screen overflow-x-hidden py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-normal text-neutral-900 mb-2">{copy.title}</h1>
            <p className="text-neutral-600">
              {currentDraft.isFullPayment ? copy.subtitleFullPayment : copy.subtitleDeposit}
            </p>
          </div>
          <Link href="/rugeegg/bestill/levering" className="self-start text-sm text-neutral-600 hover:text-neutral-900">
            {t.eggs.common.backToShipment}
          </Link>
        </div>

        {error && <GlassCard className="p-4 text-sm text-red-600">{error}</GlassCard>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-normal text-neutral-900">
                    {currentDraft.isFullPayment ? copy.fullPaymentTitle : copy.depositTitle}
                  </h2>
                  <p className="text-sm text-neutral-600">
                    {currentDraft.isFullPayment ? copy.fullPaymentDescription : copy.depositDescription}
                  </p>
                  <p className="text-xs text-neutral-500 mt-2">{copy.nonRefundableNote}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-neutral-600">
                  {currentDraft.isFullPayment ? copy.dueNow : copy.depositDue}
                </span>
                <span className="text-2xl font-normal text-neutral-900">
                  {formatPrice(currentDraft.depositAmount, language)}
                </span>
              </div>
            </GlassCard>

            <GlassCard className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-50 text-neutral-900 border border-neutral-200 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-normal text-neutral-900">{copy.securePaymentTitle}</h3>
                  <p className="text-sm text-neutral-600">{copy.securePaymentDescription}</p>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-1">
            <div>
              <GlassCard className="p-6 space-y-5">
                <h2 className="text-lg font-normal text-neutral-900">{copy.orderTitle}</h2>
                <div className="space-y-2 text-sm text-neutral-600">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>{t.eggs.common.totalEggs}</span>
                    <span className="font-normal text-neutral-900">{totalEggs}</span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>{t.eggs.common.week}</span>
                    <span className="font-normal text-neutral-900">
                      {currentDraft.deliveryWeek.weekNumber}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>{t.eggs.common.shipment}</span>
                    <span className="font-normal text-neutral-900">
                      {formatDate(currentDraft.deliveryWeek.deliveryMonday, language)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-4 space-y-2 text-sm">
                  <div className="flex flex-wrap justify-between gap-2 text-neutral-600">
                    <span>{t.eggs.common.subtotal}</span>
                    <span className="font-normal text-neutral-900">
                      {formatPrice(currentDraft.subtotal, language)}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 text-neutral-600">
                    <span>{copy.packingAndShipment}</span>
                    <span className="font-normal text-neutral-900">
                      {formatPrice(currentDraft.deliveryFee, language)}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 text-base text-neutral-900">
                    <span>{t.eggs.common.total}</span>
                    <span className="font-normal">{formatPrice(currentDraft.totalAmount, language)}</span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 pt-1 text-sm font-medium text-blue-700">
                    <span>{copy.dueNowSummary}</span>
                    <span>{formatPrice(currentDraft.depositAmount, language)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateOrderAndPay}
                  disabled={isPaying}
                  className="w-full px-6 py-4 bg-[#FF5B24] text-white rounded-xl text-sm font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:bg-[#E6501F] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex items-center justify-center gap-2"
                >
                  {isAuthenticated ? t.eggs.common.payWithVipps : t.eggs.common.loginWithVipps}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      {showExistingOrderPrompt && (
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
                {currentDraft.deliveryWeek.weekNumber} - {formatDate(currentDraft.deliveryWeek.deliveryMonday, language)}
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
              <button type="button" onClick={handleOpenDuplicateWarning} className="btn-secondary w-full">
                {t.eggs.activeOrderPrompt.createNewOrder}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {showNewOrderWarning && (
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
                  {t.eggs.activeOrderPrompt.duplicateWarningDescription.replace('{week}', String(currentDraft.deliveryWeek.weekNumber))}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={handleBackToExistingOrder} className="btn-secondary w-full">
                {t.eggs.activeOrderPrompt.backToExistingOrder}
              </button>
              <button type="button" onClick={handleConfirmDuplicateOrder} className="btn-primary w-full">
                {t.eggs.activeOrderPrompt.confirmDuplicateOrder}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
