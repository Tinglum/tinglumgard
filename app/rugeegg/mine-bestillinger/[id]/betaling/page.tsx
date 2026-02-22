'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { GlassCard } from '@/components/eggs/GlassCard'
import { useLanguage } from '@/contexts/LanguageContext'
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
  const orderId = params?.id
  const { lang: language, t } = useLanguage()
  const [order, setOrder] = useState<EggOrder | null>(null)
  const [inventory, setInventory] = useState<WeekInventoryItem[]>([])
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({})
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
        const response = await fetch(
          `/api/eggs/inventory?year=${order.delivery_monday.slice(0, 4)}&week=${order.week_number}`
        )
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

  const baseTotal = useMemo(() => {
    if (!order) return 0
    return Math.max(0, order.total_amount - savedAdditionsTotal)
  }, [order, savedAdditionsTotal])

  const baseRemainder = useMemo(() => {
    if (!order) return 0
    return Math.max(0, baseTotal - order.deposit_amount)
  }, [order, baseTotal])

  const deliveryMondayLocal = useMemo(() => {
    if (!order) return null
    return new Date(`${order.delivery_monday}T00:00:00`)
  }, [order])

  const dayBeforeStart = useMemo(() => {
    if (!deliveryMondayLocal) return null
    const start = new Date(deliveryMondayLocal)
    start.setDate(start.getDate() - 1)
    return start
  }, [deliveryMondayLocal])

  const canAdd = useMemo(() => {
    if (!deliveryMondayLocal || !order) return false
    const now = new Date()
    return now < deliveryMondayLocal && ['fully_paid', 'preparing'].includes(order.status)
  }, [deliveryMondayLocal, order])

  const discountEligible = useMemo(() => {
    if (!deliveryMondayLocal || !dayBeforeStart || !order) return false
    const now = new Date()
    return now >= dayBeforeStart && now < deliveryMondayLocal && ['fully_paid', 'preparing'].includes(order.status)
  }, [deliveryMondayLocal, dayBeforeStart, order])

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
  const nextRemainder = Math.max(0, nextTotal - (order?.deposit_amount || 0))
  const amountDue = Math.max(0, nextRemainder - remainderPaidOre)

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
        window.location.href = `/rugeegg/mine-bestillinger/betaling-bekreftet?orderId=${order.id}`
        return
      }

      const remainderResponse = await fetch(`/api/eggs/orders/${order.id}/remainder`, {
        method: 'POST',
      })
      const remainderData = await remainderResponse.json()

      if (!remainderResponse.ok || !remainderData.redirectUrl) {
        if (remainderData?.error === 'Remainder already paid') {
          window.location.href = `/rugeegg/mine-bestillinger/betaling-bekreftet?orderId=${order.id}`
          return
        }
        throw new Error(remainderData?.error || t.eggs.errors.couldNotStartPayment)
      }

      window.location.href = remainderData.redirectUrl
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
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-normal text-neutral-900 mb-2">{remainderCopy.title}</h1>
            <p className="text-neutral-600">
              {remainderCopy.orderLabel.replace('{orderNumber}', order.order_number)}
            </p>
          </div>
          <Link href="/min-side" className="text-sm text-neutral-600 hover:text-neutral-900">
            {t.nav.back}
          </Link>
        </div>

        <GlassCard className="p-6 space-y-4">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.eggs.common.breed}</p>
              <p className="text-lg font-normal text-neutral-900">
                {order.egg_breeds?.name || t.eggs.common.fallbackBreed}
              </p>
              <p className="text-sm text-neutral-600">
                {t.eggs.common.week} {order.week_number} - {formatDate(new Date(order.delivery_monday), language)}
              </p>
            </div>
            <div className="text-right">
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
          <div className="flex items-center justify-between">
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
              const remaining = item.eggs_remaining ?? (item.eggs_available - item.eggs_allocated)
              const selected = selectedQuantities[item.id] || 0
              const existingQty =
                order.egg_order_additions?.find((addition) => addition.inventory_id === item.id)?.quantity || 0
              const minQty = ['fully_paid', 'preparing'].includes(order.status || '') ? existingQty : 0
              const maxQty = Math.max(0, remaining + selected)
              const disabled = maxQty === 0 || !canAdd
              const basePrice = item.egg_breeds?.price_per_egg || 0
              const displayPrice = discountEligible ? Math.round(basePrice * 0.7) : basePrice

              return (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border border-neutral-200 rounded-xl p-4">
                  <div>
                    <p className="font-normal text-neutral-900">{item.egg_breeds?.name}</p>
                    <p className="text-xs text-neutral-500">
                      {remaining} {remainderCopy.eggsLeft} - {formatPrice(displayPrice, language)} / {t.eggs.common.eggs}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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

        <GlassCard className="p-6 space-y-4">
          <h2 className="text-lg font-normal text-neutral-900">{remainderCopy.paymentSummaryTitle}</h2>
          <p className="text-sm text-neutral-600">{remainderCopy.paymentSummaryDescription}</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>{t.eggs.common.remainder}</span>
              <span className="font-normal text-neutral-900">{formatPrice(baseRemainder, language)}</span>
            </div>
            {additionsTotal > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>{t.eggs.common.additions}</span>
                <span className="font-normal text-neutral-900">{formatPrice(additionsTotal, language)}</span>
              </div>
            )}
            {remainderPaidOre > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>{t.eggs.common.alreadyPaid}</span>
                <span className="font-normal text-neutral-900">{formatPrice(remainderPaidOre, language)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-900 text-base pt-2 border-t border-neutral-200">
              <span className="font-normal">{t.eggs.common.dueNow}</span>
              <span className="font-normal">{formatPrice(amountDue, language)}</span>
            </div>
          </div>

          {actionError && <p className="text-xs text-red-600">{actionError}</p>}

          <button
            type="button"
            onClick={handlePayment}
            disabled={isPaying || amountDue <= 0}
            className="w-full px-6 py-4 bg-[#FF5B24] text-white rounded-xl text-sm font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:bg-[#E6501F] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex items-center justify-center gap-2"
          >
            {t.eggs.common.payWithVipps}
            <ArrowRight className="w-5 h-5" />
          </button>
        </GlassCard>
      </div>
    </div>
  )
}
