'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { GlassCard } from '@/components/eggs/GlassCard'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCart } from '@/contexts/eggs/EggCartContext'
import { getEggAdditionOfferState } from '@/lib/eggs/addition-offer'
import { formatDate, formatPrice } from '@/lib/eggs/utils'
import { ArrowRight, Minus, Plus } from 'lucide-react'

interface EggOrderAddition {
  inventory_id: string
  quantity: number
  subtotal: number
  egg_breeds?: { name?: string } | null
}

interface EggPayment {
  payment_type: string
  status: string
  amount_nok?: number
}

interface EggOrder {
  id: string
  order_number: string
  customer_name?: string
  customer_email?: string
  quantity: number
  deposit_amount: number
  remainder_amount: number
  total_amount: number
  week_number: number
  delivery_monday: string
  status: string
  remainder_due_date?: string | null
  egg_breeds?: { name?: string } | null
  egg_order_additions?: EggOrderAddition[]
  egg_payments?: EggPayment[]
}

interface WeekInventoryItem {
  id: string
  eggs_available: number
  eggs_allocated: number
  eggs_remaining?: number
  effective_remaining?: number
  availability_source?: 'actual_collected' | 'inventory'
  actual_collected?: number | null
  status: string
  delivery_monday: string
  egg_breeds: {
    id: string
    name: string
    price_per_egg: number
    accent_color?: string
  }
}

export default function EggRemainderPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const orderId = params?.id
  const { lang: language, t } = useLanguage()
  const { items: cartItems, clearCart } = useCart()
  const [order, setOrder] = useState<EggOrder | null>(null)
  const [inventory, setInventory] = useState<WeekInventoryItem[]>([])
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({})
  const [paymentMode, setPaymentMode] = useState<'deposit_on_additions' | 'pay_all_now'>('pay_all_now')
  const [cartPrefillApplied, setCartPrefillApplied] = useState(false)
  const [cartPrefillCount, setCartPrefillCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const remainderCopy = t.eggs.remainderPayment

  useEffect(() => {
    let isMounted = true
    async function loadOrder() {
      if (!orderId) return
      setLoading(true)
      try {
        const response = await fetch(`/api/eggs/my-orders/${orderId}`)
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || t.eggs.errors.couldNotFetchOrder)
        }
        if (!isMounted) return
        setOrder(data)
        const initial: Record<string, number> = {}
        ;(data.egg_order_additions || []).forEach((addition: EggOrderAddition) => {
          if (addition.inventory_id) {
            initial[addition.inventory_id] = addition.quantity
          }
        })
        setSelectedQuantities(initial)
        setLoadError(null)
      } catch (err: any) {
        if (!isMounted) return
        setLoadError(err?.message || t.eggs.errors.couldNotFetchOrder)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadOrder()
    return () => {
      isMounted = false
    }
  }, [orderId, t])

  useEffect(() => {
    let isMounted = true
    async function loadInventory() {
      if (!order) return
      try {
        const inventoryUrl = new URL('/api/eggs/inventory', window.location.origin)
        inventoryUrl.searchParams.set('year', order.delivery_monday.slice(0, 4))
        inventoryUrl.searchParams.set('week', String(order.week_number))
        if (getEggAdditionOfferState(order.delivery_monday).useActualCollectedStock) {
          inventoryUrl.searchParams.set('stock_mode', 'day_before_actual')
        }

        const response = await fetch(inventoryUrl.toString())
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || t.eggs.errors.couldNotFetchInventory)
        }
        if (isMounted) {
          setInventory(data || [])
        }
      } catch (err) {
        console.error('Failed to load inventory', err)
      }
    }
    loadInventory()
    return () => {
      isMounted = false
    }
  }, [order, t])

  const importFromCart = searchParams.get('fromCart') === '1'

  useEffect(() => {
    if (!order || !inventory.length || !importFromCart || cartPrefillApplied) return

    const matchesWeek = cartItems.filter(
      (item) =>
        item.week.year === Number(order.delivery_monday.slice(0, 4)) &&
        item.week.weekNumber === order.week_number &&
        item.week.id
    )

    if (matchesWeek.length === 0) {
      setCartPrefillApplied(true)
      return
    }

    const nextQuantities: Record<string, number> = {}
    ;(order.egg_order_additions || []).forEach((addition) => {
      if (addition.inventory_id) {
        nextQuantities[addition.inventory_id] = addition.quantity
      }
    })

    let importedEggs = 0
    matchesWeek.forEach((item) => {
      nextQuantities[item.week.id] = (nextQuantities[item.week.id] || 0) + item.quantity
      importedEggs += item.quantity
    })

    setSelectedQuantities(nextQuantities)
    setCartPrefillCount(importedEggs)
    setCartPrefillApplied(true)
  }, [cartItems, cartPrefillApplied, importFromCart, inventory.length, order])

  const savedAdditionsTotal = useMemo(() => {
    return (order?.egg_order_additions || []).reduce((sum, addition) => sum + (addition.subtotal || 0), 0)
  }, [order])

  const remainderPaidOre = useMemo(() => {
    return (
      order?.egg_payments?.reduce((sum, payment) => {
        if (payment.payment_type !== 'remainder' || payment.status !== 'completed') return sum
        return sum + (payment.amount_nok || 0) * 100
      }, 0) || 0
      )
  }, [order])

  const additionDepositPaidOre = useMemo(() => {
    return (
      order?.egg_payments?.reduce((sum, payment) => {
        if (payment.payment_type !== 'addition_deposit' || payment.status !== 'completed') return sum
        return sum + (payment.amount_nok || 0) * 100
      }, 0) || 0
    )
  }, [order])

  const baseTotal = useMemo(() => {
    if (!order) return 0
    return Math.max(0, order.total_amount - savedAdditionsTotal)
  }, [order, savedAdditionsTotal])

  const offerState = order ? getEggAdditionOfferState(order.delivery_monday) : null

  const canAdd = useMemo(() => {
    if (!offerState || !order) return false
    return offerState.canAdd && ['deposit_paid', 'fully_paid', 'preparing'].includes(order.status)
  }, [offerState, order])

  const discountEligible = useMemo(() => {
    if (!offerState || !order) return false
    return offerState.discountEligible && ['deposit_paid', 'fully_paid', 'preparing'].includes(order.status)
  }, [offerState, order])

  const additionsTotal = useMemo(() => {
    const multiplier = discountEligible ? 0.7 : 1
    return Object.entries(selectedQuantities).reduce((sum, [inventoryId, qty]) => {
      if (qty <= 0) return sum
      const item = inventory.find((inventoryRow) => inventoryRow.id === inventoryId)
      if (!item) return sum
      return sum + Math.round(qty * (item.egg_breeds?.price_per_egg || 0) * multiplier)
    }, 0)
  }, [selectedQuantities, inventory, discountEligible])

  const nextTotal = baseTotal + additionsTotal
  const outstandingBeforeChanges = Math.max(0, (order?.total_amount || 0) - (order?.deposit_amount || 0) - remainderPaidOre)
  const payAllNowAmountDue = Math.max(0, nextTotal - (order?.deposit_amount || 0) - remainderPaidOre)
  const targetAdditionDepositOre = Math.round(additionsTotal / 2)
  const depositOnAdditionsAmountDue = Math.max(0, targetAdditionDepositOre - additionDepositPaidOre)
  const amountDue = paymentMode === 'deposit_on_additions' ? depositOnAdditionsAmountDue : payAllNowAmountDue
  const outstandingAfterThisPayment =
    paymentMode === 'deposit_on_additions'
      ? Math.max(0, nextTotal - ((order?.deposit_amount || 0) + amountDue) - remainderPaidOre)
      : 0

  const hasChanges = useMemo(() => {
    const saved = new Map<string, number>()
    ;(order?.egg_order_additions || []).forEach((addition) => {
      saved.set(addition.inventory_id, addition.quantity)
    })
    const selectedEntries = Object.entries(selectedQuantities).filter(([_, qty]) => qty > 0)
    if (saved.size !== selectedEntries.length) return true
    for (const [inventoryId, qty] of selectedEntries) {
      if (saved.get(inventoryId) !== qty) return true
    }
    return false
  }, [order, selectedQuantities])

  const updateQuantity = (inventoryId: string, nextQty: number, maxQty: number, minQty = 0) => {
    const safeQty = Math.max(minQty, Math.min(nextQty, maxQty))
    setSelectedQuantities((prev) => ({ ...prev, [inventoryId]: safeQty }))
  }

  const handlePayment = async () => {
    if (!order) return
    if (!['deposit_paid', 'fully_paid', 'preparing'].includes(order.status)) return

    setIsPaying(true)
    setActionError(null)
    try {
      const additionsPayload = Object.entries(selectedQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([inventoryId, quantity]) => ({ inventoryId, quantity }))

      if (hasChanges) {
        const additionsResponse = await fetch(`/api/eggs/orders/${order.id}/additions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ additions: additionsPayload }),
        })

        if (!additionsResponse.ok) {
          const data = await additionsResponse.json().catch(() => null)
          throw new Error(data?.error || t.eggs.errors.couldNotSaveAdditions)
        }
      }

      if (amountDue <= 0) {
        if (importFromCart) {
          clearCart()
        }
        window.location.href = `/rugeegg/mine-bestillinger/betaling-bekreftet?orderId=${order.id}`
        return
      }

      const paymentRoute =
        paymentMode === 'deposit_on_additions'
          ? `/api/eggs/orders/${order.id}/addition-deposit`
          : `/api/eggs/orders/${order.id}/remainder`

      const paymentResponse = await fetch(paymentRoute, {
        method: 'POST',
      })
      const paymentData = await paymentResponse.json()

      if (!paymentResponse.ok || !paymentData.redirectUrl) {
        if (paymentData?.error === 'Remainder already paid' || paymentData?.error === 'Addition deposit already covered') {
          if (importFromCart) {
            clearCart()
          }
          window.location.href = `/rugeegg/mine-bestillinger/betaling-bekreftet?orderId=${order.id}`
          return
        }
        throw new Error(paymentData?.error || t.eggs.errors.couldNotStartPayment)
      }

      if (importFromCart) {
        clearCart()
      }
      window.location.href = paymentData.redirectUrl
    } catch (err: any) {
      setActionError(err?.message || t.eggs.errors.couldNotStartPayment)
      setIsPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <GlassCard className="p-8 text-center max-w-md">
          <p className="text-sm text-neutral-600 mb-4">{loadError || t.eggs.errors.couldNotFetchOrder}</p>
          <Link href="/min-side" className="btn-secondary inline-flex justify-center">
            {t.nav.back}
          </Link>
        </GlassCard>
      </div>
    )
  }

  if (!['deposit_paid', 'fully_paid', 'preparing'].includes(order.status)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <GlassCard className="p-8 text-center max-w-md">
          <p className="text-sm text-neutral-600 mb-4">{remainderCopy.unavailable}</p>
          <Link href="/min-side" className="btn-secondary inline-flex justify-center">
            {t.nav.back}
          </Link>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-normal text-neutral-900 mb-2">{remainderCopy.title}</h1>
            <p className="text-neutral-600">
              {remainderCopy.orderLabel.replace('{orderNumber}', order.order_number)}
            </p>
          </div>
          <Link href="/min-side" className="self-start text-sm text-neutral-600 hover:text-neutral-900">
            {t.nav.back}
          </Link>
        </div>

        {cartPrefillCount > 0 && (
          <GlassCard className="p-4 text-sm text-neutral-700">
            {remainderCopy.cartImportedNotice.replace('{count}', String(cartPrefillCount))}
          </GlassCard>
        )}

        <GlassCard className="p-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.eggs.common.breed}</p>
              <p className="text-lg font-normal text-neutral-900">
                {order.egg_breeds?.name || t.eggs.common.fallbackBreed}
              </p>
              <p className="text-sm text-neutral-600">
                {t.eggs.common.week} {order.week_number} - {formatDate(new Date(order.delivery_monday), language)}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-sm text-neutral-500">{remainderCopy.depositPaidEggs}</p>
              <p className="text-lg font-normal text-neutral-900">{formatPrice(order.deposit_amount, language)}</p>
              {order.remainder_due_date && (
                <p className="text-xs text-neutral-500">
                  {t.eggs.common.dueDate}: {formatDate(new Date(order.remainder_due_date), language)}
                </p>
              )}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-normal text-neutral-900">{remainderCopy.addMoreEggsOptional}</h2>
            <span className="text-xs text-neutral-500">{remainderCopy.sameShipmentWeek}</span>
          </div>
          {!canAdd && <p className="text-xs text-neutral-600">{remainderCopy.additionsClosed}</p>}
          {discountEligible && <p className="text-xs text-emerald-700">{remainderCopy.discountToday}</p>}

          <div className="space-y-3">
            {inventory.length === 0 && (
              <p className="text-sm text-neutral-500">{remainderCopy.noEggsThisWeek}</p>
            )}

            {inventory.map((item) => {
              const remaining = Math.max(
                0,
                item.effective_remaining ?? (item.eggs_available - item.eggs_allocated)
              )
              const selected = selectedQuantities[item.id] || 0
              const existingQty =
                order.egg_order_additions?.find((addition) => addition.inventory_id === item.id)?.quantity || 0
              const minQty = existingQty
              const maxQty = Math.max(0, remaining + selected)
              const disabled = maxQty === 0 || !canAdd
              const basePrice = item.egg_breeds?.price_per_egg || 0
              const displayPrice = discountEligible ? Math.round(basePrice * 0.7) : basePrice

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-normal text-neutral-900">{item.egg_breeds?.name}</p>
                    <p className="text-xs text-neutral-500">
                      {remaining} {remainderCopy.eggsLeft} - {formatPrice(displayPrice, language)} / {t.eggs.common.eggs}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      disabled={disabled || selected <= minQty || isPaying}
                      onClick={() => updateQuantity(item.id, selected - 1, maxQty, minQty)}
                      className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center disabled:opacity-40"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-normal text-neutral-900">{selected}</span>
                    <button
                      type="button"
                      disabled={disabled || isPaying}
                      onClick={() => updateQuantity(item.id, selected + 1, maxQty, minQty)}
                      className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {additionsTotal > 0 && (
          <GlassCard className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-normal text-neutral-900">{remainderCopy.paymentChoiceTitle}</h2>
              <p className="text-sm text-neutral-600">{remainderCopy.paymentChoiceDescription}</p>
            </div>

            <div className="grid gap-3">
              <label
                className={`rounded-xl border px-4 py-4 cursor-pointer transition-colors ${
                  paymentMode === 'deposit_on_additions'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-white text-neutral-900'
                }`}
              >
                <input
                  type="radio"
                  name="payment-mode"
                  value="deposit_on_additions"
                  checked={paymentMode === 'deposit_on_additions'}
                  onChange={() => setPaymentMode('deposit_on_additions')}
                  className="sr-only"
                />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{remainderCopy.depositOnNewEggsTitle}</p>
                    <p className={`mt-1 text-sm ${paymentMode === 'deposit_on_additions' ? 'text-white/80' : 'text-neutral-600'}`}>
                      {remainderCopy.depositOnNewEggsDescription}
                    </p>
                  </div>
                  <span className={paymentMode === 'deposit_on_additions' ? 'text-white' : 'text-neutral-900'}>
                    {formatPrice(depositOnAdditionsAmountDue, language)}
                  </span>
                </div>
              </label>

              <label
                className={`rounded-xl border px-4 py-4 cursor-pointer transition-colors ${
                  paymentMode === 'pay_all_now'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-white text-neutral-900'
                }`}
              >
                <input
                  type="radio"
                  name="payment-mode"
                  value="pay_all_now"
                  checked={paymentMode === 'pay_all_now'}
                  onChange={() => setPaymentMode('pay_all_now')}
                  className="sr-only"
                />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{remainderCopy.payEverythingNowTitle}</p>
                    <p className={`mt-1 text-sm ${paymentMode === 'pay_all_now' ? 'text-white/80' : 'text-neutral-600'}`}>
                      {remainderCopy.payEverythingNowDescription}
                    </p>
                  </div>
                  <span className={paymentMode === 'pay_all_now' ? 'text-white' : 'text-neutral-900'}>
                    {formatPrice(payAllNowAmountDue, language)}
                  </span>
                </div>
              </label>
            </div>
          </GlassCard>
        )}

        <GlassCard className="p-6 space-y-4">
          <h2 className="text-lg font-normal text-neutral-900">{remainderCopy.paymentSummaryTitle}</h2>
          <p className="text-sm text-neutral-600">{remainderCopy.paymentSummaryDescription}</p>
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2 text-neutral-600">
              <span>{remainderCopy.currentOutstanding}</span>
              <span className="font-normal text-neutral-900">{formatPrice(outstandingBeforeChanges, language)}</span>
            </div>
            {additionsTotal > 0 && (
              <div className="flex flex-wrap justify-between gap-2 text-neutral-600">
                <span>{t.eggs.common.additions}</span>
                <span className="font-normal text-neutral-900">{formatPrice(additionsTotal, language)}</span>
              </div>
            )}
            {additionDepositPaidOre > 0 && (
              <div className="flex flex-wrap justify-between gap-2 text-neutral-600">
                <span>{remainderCopy.additionDepositsPaid}</span>
                <span className="font-normal text-neutral-900">{formatPrice(additionDepositPaidOre, language)}</span>
              </div>
            )}
            {remainderPaidOre > 0 && (
              <div className="flex flex-wrap justify-between gap-2 text-neutral-600">
                <span>{t.eggs.common.alreadyPaid}</span>
                <span className="font-normal text-neutral-900">{formatPrice(remainderPaidOre, language)}</span>
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-2 border-t border-neutral-200 pt-2 text-base text-neutral-900">
              <span className="font-normal">{t.eggs.common.dueNow}</span>
              <span className="font-normal">{formatPrice(amountDue, language)}</span>
            </div>
            {paymentMode === 'deposit_on_additions' && (
              <div className="flex flex-wrap justify-between gap-2 text-neutral-600">
                <span>{remainderCopy.outstandingAfterThisPayment}</span>
                <span className="font-normal text-neutral-900">{formatPrice(outstandingAfterThisPayment, language)}</span>
              </div>
            )}
          </div>

          {actionError && <p className="text-xs text-red-600">{actionError}</p>}

          <button
            type="button"
            onClick={handlePayment}
            disabled={isPaying || (!hasChanges && amountDue <= 0)}
            className="w-full px-6 py-4 bg-[#FF5B24] text-white rounded-xl text-sm font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:bg-[#E6501F] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex items-center justify-center gap-2"
          >
            {amountDue > 0 ? t.eggs.common.payWithVipps : remainderCopy.saveChangesOnly}
            <ArrowRight className="w-5 h-5" />
          </button>
        </GlassCard>
      </div>
    </div>
  )
}
