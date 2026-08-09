'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { GlassCard } from '@/components/eggs/GlassCard'
import { formatDateFull, formatPrice } from '@/lib/eggs/utils'
import { openEggReceipt } from '@/lib/eggs/receipt'
import { ArrowRight, FileText } from 'lucide-react'
import { StepTimeline } from '@/components/orders/StepTimeline'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

type EggPayment = {
  payment_type: string
  status: string
  amount_nok?: number
  paid_at?: string | null
  created_at?: string | null
  vipps_order_id?: string | null
}

type EggOrderAddition = {
  id?: string
  breed_id?: string | null
  quantity: number
  subtotal: number
  created_at?: string | null
  price_per_egg?: number | null
  egg_breeds?: { name?: string } | null
}

type EggOrder = {
  id: string
  order_number: string
  breed_id?: string | null
  status: string
  quantity: number
  subtotal?: number | null
  total_amount: number
  deposit_amount: number
  remainder_amount: number
  price_adjustment_ore?: number | null
  remainder_due_date?: string | null
  delivery_monday: string
  week_number: number
  delivery_method: string
  delivery_fee?: number
  tracking_number?: string | null
  marked_shipped_at?: string | null
  marked_delivered_at?: string | null
  created_at?: string | null
  pickup_date?: string | null
  pickup_time?: string | null
  customer_name?: string | null
  egg_breeds?: { name?: string; accent_color?: string } | null
  egg_payments?: EggPayment[]
  egg_order_additions?: EggOrderAddition[]
}

const toDateOnly = (value: string | Date) => {
  const date = new Date(value)
  return new Date(date.toISOString().split('T')[0])
}

const daysBetween = (future: Date, today: Date) => {
  const diffMs = future.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

const buildTrackingUrl = (trackingNumber?: string | null) => {
  const value = String(trackingNumber || '').trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  return `https://sporing.posten.no/sporing/${encodeURIComponent(value)}`
}

const PICKUP_TIME_SLOTS = ['11:00', '17:00'] as const

/** Returns the 3 eligible pickup dates: Sun (Mon-1), Mon (delivery), Tue (Mon+1) */
function getEggPickupDays(deliveryMonday: string, locale: string): Array<{ iso: string; dayName: string; date: Date }> {
  const monday = new Date(`${deliveryMonday}T00:00:00Z`)
  return [-1, 0, 1].map((offset) => {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + offset)
    return {
      date: d,
      iso: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }),
    }
  })
}

export function EggOrderUnifiedCard({ order, onPayDeposit }: { order: EggOrder; onPayDeposit?: (orderId: string) => void }) {
  const { lang, t } = useLanguage()
  const { toast } = useToast()
  const ordersCopy = t.eggs.myOrders
  const common = t.eggs.common

  const [chosenPickupDate, setChosenPickupDate] = useState<string | null>(order.pickup_date || null)
  const [chosenPickupTime, setChosenPickupTime] = useState<string | null>(order.pickup_time || null)
  const [pendingDay, setPendingDay] = useState<string | null>(null)
  const [pickingDay, setPickingDay] = useState(false)
  const [savingPickupDay, setSavingPickupDay] = useState(false)

  const today = useMemo(() => toDateOnly(new Date()), [])

  const formatDeliveryMethod = (method: string) => {
    if (method === 'posten') return ordersCopy.deliveryPosten
    if (method === 'e6_pickup') return ordersCopy.deliveryE6
    if (method === 'farm_pickup') return ordersCopy.deliveryFarm
    return method
  }

  const additionsEggs = (order.egg_order_additions || []).reduce(
    (sum, addition) => sum + (addition.quantity || 0),
    0
  )
  const baseEggs = order.quantity || 0
  const totalEggs = order.quantity + additionsEggs
  const additionsSubtotalOre = (order.egg_order_additions || []).reduce(
    (sum, addition) => sum + Number(addition.subtotal || 0),
    0
  )
  const baseSubtotalOre = useMemo(() => {
    const storedSubtotal = Number(order.subtotal || 0)
    if (storedSubtotal > 0) return storedSubtotal
    return Math.max(
      0,
      Number(order.total_amount || 0) -
        Number(order.delivery_fee || 0) -
        additionsSubtotalOre -
        Number(order.price_adjustment_ore || 0)
    )
  }, [additionsSubtotalOre, order.delivery_fee, order.price_adjustment_ore, order.subtotal, order.total_amount])
  const breedTotals = useMemo(() => {
    const baseBreedName = order.egg_breeds?.name || common.fallbackBreed
    const baseLine = {
      key: String(order.breed_id || baseBreedName),
      breedName: order.egg_breeds?.name || common.fallbackBreed,
      quantity: Number(order.quantity || 0),
    }

    const grouped = new Map<string, { key: string; breedName: string; quantity: number }>()
    grouped.set(baseLine.key, baseLine)
    for (const addition of order.egg_order_additions || []) {
      const breedName = addition.egg_breeds?.name || common.fallbackBreed
      const key = String(addition.breed_id || breedName)
      const current = grouped.get(key) || {
        key,
        breedName,
        quantity: 0,
      }
      current.quantity += Number(addition.quantity || 0)
      grouped.set(key, current)
    }

    return Array.from(grouped.values())
  }, [common.fallbackBreed, order.breed_id, order.egg_breeds?.name, order.egg_order_additions, order.quantity])
  const orderDisplayLines = useMemo(() => {
    const lines: Array<{
      key: string
      label: string
      breedName: string
      quantity: number
      totalOre: number
      createdAt?: string | null
    }> = []

    if (baseEggs > 0) {
      lines.push({
        key: 'base-order',
        label: lang === 'no' ? 'Grunnbestilling' : 'Base order',
        breedName: order.egg_breeds?.name || common.fallbackBreed,
        quantity: baseEggs,
        totalOre: baseSubtotalOre,
        createdAt: order.created_at,
      })
    }

    ;(order.egg_order_additions || []).forEach((addition, index) => {
      lines.push({
        key: addition.id || `addition-${index}`,
        label: lang === 'no' ? 'Ekstra egg' : 'Extra eggs',
        breedName: addition.egg_breeds?.name || common.fallbackBreed,
        quantity: Number(addition.quantity || 0),
        totalOre: Number(addition.subtotal || 0),
        createdAt: addition.created_at,
      })
    })

    return lines
  }, [baseEggs, baseSubtotalOre, common.fallbackBreed, lang, order.created_at, order.egg_breeds?.name, order.egg_order_additions])
  const breedSummary = useMemo(() => {
    const uniqueBreeds = Array.from(new Set(breedTotals.map((line) => line.breedName)))
    if (uniqueBreeds.length <= 2) return uniqueBreeds.join(', ')
    return `${uniqueBreeds.slice(0, 2).join(', ')} +${uniqueBreeds.length - 2}`
  }, [breedTotals])
  const quantityBreakdownTemplate =
    ordersCopy.quantityBreakdown || 'Base {base} + additions {additions} = total {total}'
  const quantityBreakdown = quantityBreakdownTemplate
    .replace('{base}', String(baseEggs))
    .replace('{additions}', String(additionsEggs))
    .replace('{total}', String(totalEggs))
  const completedDepositPayments = (order.egg_payments || []).filter(
    (payment) => payment.payment_type === 'deposit' && payment.status === 'completed'
  )
  const completedRemainderPayments = (order.egg_payments || []).filter(
    (payment) => payment.payment_type === 'remainder' && payment.status === 'completed'
  )
  const completedAdditionDepositPayments = (order.egg_payments || []).filter(
    (payment) => payment.payment_type === 'addition_deposit' && payment.status === 'completed'
  )
  const pendingAdditionDepositPayments = (order.egg_payments || []).filter(
    (payment) => payment.payment_type === 'addition_deposit' && payment.status === 'pending'
  )
  const hasCompletedPayment = (order.egg_payments || []).some((payment) => payment.status === 'completed')
  const remainderPaidOre = completedRemainderPayments.reduce((sum, payment) => {
    return sum + (payment.amount_nok || 0) * 100
  }, 0)
  const depositPaid =
    completedDepositPayments.length > 0 ||
    ['deposit_paid', 'fully_paid', 'preparing', 'shipped', 'delivered'].includes(order.status)
  const remainderDue = Math.max(0, order.remainder_amount - remainderPaidOre)
  const hasLaterExtraBalance =
    remainderDue > 0 && (completedRemainderPayments.length > 0 || pendingAdditionDepositPayments.length > 0)
  const currentBalanceLabel = hasLaterExtraBalance
    ? (lang === 'no' ? 'Nye ekstra egg' : 'New extra eggs')
    : (lang === 'no' ? 'Utestående nå' : 'Outstanding now')
  const dueDate = order.remainder_due_date ? toDateOnly(order.remainder_due_date) : null
  const deliveryDate = toDateOnly(order.delivery_monday)
  const deliveryMondayLocal = new Date(`${order.delivery_monday}T00:00:00`)
  const canAdd = new Date() < deliveryMondayLocal && ['deposit_paid', 'fully_paid', 'preparing'].includes(order.status)
  const canWishlistMore =
    new Date() < deliveryMondayLocal && !['cancelled', 'forfeited', 'delivered'].includes(order.status)
  const daysToDue = dueDate ? daysBetween(dueDate, today) : null
  const daysToDueLabel = daysToDue !== null ? Math.max(daysToDue, 0) : null
  const daysToDelivery = daysBetween(deliveryDate, today)
  const remainderPaid =
    remainderDue <= 0 || ['fully_paid', 'preparing', 'shipped', 'delivered'].includes(order.status)
  const hasNoRemainderStage = !hasLaterExtraBalance && Number(order.remainder_amount || 0) <= 0
  const fullyPaidNow = depositPaid && remainderDue <= 0
  const payBalanceLabel =
    hasLaterExtraBalance && remainderDue > 0
      ? (lang === 'no' ? 'Betal tillegg' : 'Pay extras')
      : ordersCopy.payRemainder
  const shipmentStarted = ['shipped', 'delivered'].includes(order.status)
  const shipmentDone = order.status === 'delivered'
  const trackingUrl = buildTrackingUrl(order.tracking_number)
  const locale = lang === 'no' ? 'nb-NO' : 'en-US'
  const paymentSummaryLabel =
    hasNoRemainderStage && fullyPaidNow
      ? (lang === 'no' ? 'Betalt' : 'Paid')
      : common.deposit
  const paymentHistoryRows = useMemo(() => {
    const rows: Array<{
      key: string
      label: string
      amountOre: number
      paidAt?: string | null
    }> = []

    completedDepositPayments.forEach((payment, index) => {
      rows.push({
        key: `deposit-${index}`,
        label: lang === 'no' ? 'Forskudd betalt' : 'Deposit paid',
        amountOre: Math.round(Number(payment.amount_nok || 0) * 100),
        paidAt: payment.paid_at || payment.created_at || null,
      })
    })

    completedRemainderPayments.forEach((payment, index) => {
      rows.push({
        key: `remainder-${index}`,
        label: lang === 'no' ? 'Restbetaling betalt' : 'Remainder paid',
        amountOre: Math.round(Number(payment.amount_nok || 0) * 100),
        paidAt: payment.paid_at || payment.created_at || null,
      })
    })

    completedAdditionDepositPayments.forEach((payment, index) => {
      rows.push({
        key: `addition-deposit-${index}`,
        label: lang === 'no' ? 'Ekstra egg betalt' : 'Extra eggs paid',
        amountOre: Math.round(Number(payment.amount_nok || 0) * 100),
        paidAt: payment.paid_at || payment.created_at || null,
      })
    })

    return rows
  }, [completedAdditionDepositPayments, completedDepositPayments, completedRemainderPayments, lang])
  const paymentHistoryTitle = lang === 'no' ? 'Betalingshistorikk' : 'Payment history'
  const paymentHistoryEmpty = lang === 'no' ? 'Ingen registrerte betalinger ennå.' : 'No registered payments yet.'
  const paidOnLabel = lang === 'no' ? 'betalt' : 'paid'
  const extraBalanceNote =
    hasLaterExtraBalance && completedRemainderPayments.length > 0
      ? (lang === 'no'
          ? 'Tidligere restbetaling er mottatt. Beløpet som står igjen gjelder nye ekstra egg.'
          : 'The earlier remainder was already paid. The balance shown now is for new extra eggs.')
      : null

  const isPickupOrder = ['farm_pickup', 'e6_pickup'].includes(order.delivery_method)
  const pickupDays = useMemo(
    () => getEggPickupDays(order.delivery_monday, locale),
    [order.delivery_monday, locale]
  )
  // Show picker while the latest pickup day (Tuesday) is still in the future
  const lastPickupDay = pickupDays[2]?.date
  const canChoosePickupDay =
    isPickupOrder &&
    !['cancelled', 'delivered', 'forfeited'].includes(order.status) &&
    lastPickupDay != null &&
    daysBetween(lastPickupDay, today) >= 0

  const effectivePickupDate = chosenPickupDate
    ? toDateOnly(chosenPickupDate)
    : toDateOnly(order.delivery_monday)

  const pickupDateLabel = chosenPickupDate
    ? effectivePickupDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const handlePickupTimeSelect = async (time: string) => {
    const dateToSave = pendingDay || chosenPickupDate
    if (!dateToSave) return
    setSavingPickupDay(true)
    try {
      const res = await fetch(`/api/eggs/orders/${order.id}/pickup-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupDate: dateToSave, pickupTime: time }),
      })
      if (!res.ok) throw new Error('Failed')
      setChosenPickupDate(dateToSave)
      setChosenPickupTime(time)
      setPendingDay(null)
      setPickingDay(false)
      const atLabel = (ordersCopy as any).atTime || (lang === 'no' ? 'kl.' : 'at')
      toast({
        title: (ordersCopy as any).pickupDaySet || (lang === 'no' ? 'Hentedag valgt' : 'Pickup day set'),
        description: `${new Date(`${dateToSave}T00:00:00`).toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })} ${atLabel} ${time}`,
      })
    } catch {
      toast({ title: lang === 'no' ? 'Feil' : 'Error', variant: 'destructive' })
    } finally {
      setSavingPickupDay(false)
    }
  }

  const timelineSteps = [
    {
      key: 'placed',
      label: ordersCopy.stepPlaced,
      summary: order.created_at
        ? formatDateFull(new Date(order.created_at), lang)
        : `${common.week} ${order.week_number}`,
      detail: `${common.week} ${order.week_number}`,
      done: true,
    },
    {
      key: 'deposit',
      label: ordersCopy.stepDeposit,
      summary: depositPaid ? ordersCopy.statusDepositPaid : ordersCopy.statusPending,
      detail: `${common.deposit}: ${formatPrice(order.deposit_amount, lang)}`,
      done: depositPaid,
    },
    {
      key: 'remainder',
      label: ordersCopy.stepRemainder,
      summary: hasNoRemainderStage
        ? (lang === 'no' ? 'Ingen restbetaling' : 'No remainder due')
        : dueDate && !remainderPaid
          ? `${hasLaterExtraBalance ? currentBalanceLabel : ordersCopy.duePrefix} ${
              hasLaterExtraBalance ? formatPrice(remainderDue, lang) : formatDateFull(dueDate, lang)
            }${
              hasLaterExtraBalance && dueDate
                ? ` - ${ordersCopy.duePrefix.toLowerCase()} ${formatDateFull(dueDate, lang)}`
                : ''
            }${
              daysToDueLabel !== null ? ` - ${daysToDueLabel} ${common.daysLeft}` : ''
            }`
          : ordersCopy.statusPaid,
      detail: hasNoRemainderStage
        ? (lang === 'no'
            ? 'Ordren var fullt betalt ved bestilling.'
            : 'This order was fully paid at checkout.')
        : dueDate && !remainderPaid
          ? hasLaterExtraBalance
            ? `${currentBalanceLabel}: ${formatPrice(remainderDue, lang)}${
                completedRemainderPayments.length > 0
                  ? ` | ${lang === 'no' ? 'Tidligere rest betalt' : 'Earlier remainder paid'}: ${formatPrice(remainderPaidOre, lang)}`
                  : ''
              }`
            : `${formatPrice(remainderDue, lang)} - ${ordersCopy.duePrefix} ${formatDateFull(dueDate, lang)}`
          : `${ordersCopy.statusPaid}: ${formatPrice(remainderPaidOre || order.remainder_amount, lang)}`,
      done: remainderPaid,
    },
    {
      key: 'shipment',
      label: ordersCopy.stepShipment,
      summary: shipmentDone
        ? ordersCopy.statusDelivered
        : shipmentStarted
        ? ordersCopy.statusShipped
        : ordersCopy.statusPreparing,
      detail: `${ordersCopy.shipmentPrefix} ${formatDateFull(deliveryDate, lang)}${
        daysToDelivery >= 0 ? ` - ${daysToDelivery} ${common.daysLeft}` : ''
      }`,
      done: shipmentDone,
    },
  ]

  const nextAction = (() => {
    if (order.status === 'delivered') {
      return { text: ordersCopy.nextActionDelivered, tone: 'success' as const }
    }
    if (order.status === 'shipped') {
      return { text: ordersCopy.nextActionShipped, tone: 'info' as const }
    }
    if (order.status === 'forfeited') {
      return { text: ordersCopy.nextActionForfeited, tone: 'neutral' as const }
    }
    if (order.status === 'cancelled') {
      return { text: ordersCopy.nextActionCancelled, tone: 'neutral' as const }
    }
    if (order.status === 'deposit_paid' && remainderDue > 0) {
      const dueText = hasLaterExtraBalance
        ? dueDate
          ? (lang === 'no'
              ? `Nye ekstra egg for ${formatPrice(remainderDue, lang)} forfaller ${formatDateFull(dueDate, lang)}.`
              : `New extra eggs for ${formatPrice(remainderDue, lang)} are due ${formatDateFull(dueDate, lang)}.`)
          : (lang === 'no'
              ? `Nye ekstra egg for ${formatPrice(remainderDue, lang)} må betales.`
              : `New extra eggs for ${formatPrice(remainderDue, lang)} must be paid.`)
        : dueDate
          ? ordersCopy.nextActionRemainderDue
              .replace('{amount}', formatPrice(remainderDue, lang))
              .replace('{date}', formatDateFull(dueDate, lang))
          : ordersCopy.nextActionRemainderDueNoDate.replace('{amount}', formatPrice(remainderDue, lang))
      return { text: dueText, tone: 'warning' as const }
    }
    if (order.status === 'deposit_paid' && fullyPaidNow) {
      return { text: ordersCopy.nextActionPreparing, tone: 'info' as const }
    }
    if (order.status === 'fully_paid' || order.status === 'preparing') {
      return { text: ordersCopy.nextActionPreparing, tone: 'info' as const }
    }
    return { text: ordersCopy.nextActionPendingDeposit, tone: 'warning' as const }
  })()

  const nextActionClass = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    neutral: 'border-neutral-200 bg-white text-neutral-700',
  }[nextAction.tone]

  const statusMeta = (() => {
    switch (order.status) {
      case 'deposit_paid':
        if (remainderDue > 0) {
          const urgent = daysToDue !== null && daysToDue <= 6
          return {
            label: hasLaterExtraBalance
              ? (lang === 'no' ? 'Tillegg venter betaling' : 'Extras pending payment')
              : ordersCopy.statusRemainderDue,
            className: urgent ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700',
          }
        }
        return {
          label: fullyPaidNow ? ordersCopy.statusPaid : ordersCopy.statusDepositPaid,
          className: 'bg-emerald-50 text-emerald-700',
        }
      case 'fully_paid':
        return {
          label: ordersCopy.statusPaid,
          className: 'bg-emerald-50 text-emerald-700',
        }
      case 'preparing':
        return {
          label: ordersCopy.statusPreparing,
          className: 'bg-indigo-50 text-indigo-700',
        }
      case 'shipped':
        return {
          label: ordersCopy.statusShipped,
          className: 'bg-indigo-50 text-indigo-700',
        }
      case 'delivered':
        return {
          label: ordersCopy.statusDelivered,
          className: 'bg-neutral-100 text-neutral-700',
        }
      case 'forfeited':
        return {
          label: ordersCopy.statusForfeited,
          className: 'bg-rose-50 text-rose-700',
        }
      case 'cancelled':
        return {
          label: ordersCopy.statusCancelled,
          className: 'bg-rose-50 text-rose-700',
        }
      default:
        return {
          label: ordersCopy.statusPending,
          className: 'bg-neutral-100 text-neutral-700',
        }
    }
  })()

  return (
    <GlassCard className="p-6 space-y-6" accentBorder={order.egg_breeds?.accent_color}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{common.order}</p>
          <h3 className="text-2xl font-normal text-neutral-900">{order.order_number}</h3>
          <p className="text-sm text-neutral-600">
            {(breedSummary || common.fallbackBreed)} - {common.week} {order.week_number} -{' '}
            {formatDateFull(new Date(order.delivery_monday), lang)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusMeta.className}`}>
            {statusMeta.label}
          </span>
          {hasCompletedPayment && (
            <button
              type="button"
              onClick={() => openEggReceipt(order, lang)}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden />
              {ordersCopy.receiptButton}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{ordersCopy.quantity}</p>
            <p className="text-2xl font-normal text-neutral-900">
              {totalEggs} {common.eggs}
            </p>
            <p className="text-xs text-neutral-500">{quantityBreakdown}</p>
            {orderDisplayLines.length > 0 && (
              <div className="mt-3 space-y-2">
                {orderDisplayLines.map((line) => (
                  <div
                    key={line.key}
                    className="flex items-start justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700"
                  >
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                        {line.label}
                      </p>
                      <p className="text-sm text-neutral-900">{line.breedName}</p>
                      <p className="text-xs text-neutral-500">
                        {line.quantity} {common.eggs}
                        {line.createdAt ? ` | ${formatDateFull(new Date(line.createdAt), lang)}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-neutral-900">
                      {formatPrice(line.totalOre, lang)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{ordersCopy.total}</p>
            <p className="text-lg font-normal text-neutral-900">
              {formatPrice(order.total_amount, lang)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">{paymentSummaryLabel}</span>
            <span className="font-normal text-neutral-900">
              {formatPrice(order.deposit_amount, lang)}
            </span>
          </div>
          {order.price_adjustment_ore != null && order.price_adjustment_ore !== 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className={order.price_adjustment_ore < 0 ? 'text-emerald-700' : 'text-amber-700'}>
                {order.price_adjustment_ore < 0
                  ? (lang === 'no' ? 'Rabatt / justering' : 'Discount / adjustment')
                  : (lang === 'no' ? 'Tillegg / justering' : 'Surcharge / adjustment')}
              </span>
              <span className={`font-normal ${order.price_adjustment_ore < 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {order.price_adjustment_ore < 0 ? '−' : '+'}{formatPrice(Math.abs(order.price_adjustment_ore), lang)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">{currentBalanceLabel}</span>
            <span className={`font-normal ${remainderDue > 0 ? 'text-amber-700 font-medium' : 'text-neutral-900'}`}>
              {formatPrice(remainderDue, lang)}
            </span>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">{paymentHistoryTitle}</p>
            {paymentHistoryRows.length > 0 ? (
              <div className="mt-2 space-y-2">
                {paymentHistoryRows.map((payment) => (
                  <div key={payment.key} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="text-neutral-900">{payment.label}</p>
                      {payment.paidAt && (
                        <p className="text-xs text-neutral-500">
                          {paidOnLabel} {formatDateFull(new Date(payment.paidAt), lang)}
                        </p>
                      )}
                    </div>
                    <span className="font-medium text-neutral-900">{formatPrice(payment.amountOre, lang)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">{paymentHistoryEmpty}</p>
            )}
          </div>
          {extraBalanceNote && (
            <p className="text-xs text-neutral-500">{extraBalanceNote}</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="text-sm text-neutral-600">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{ordersCopy.delivery}</p>
            <p className="font-normal text-neutral-900">{formatDeliveryMethod(order.delivery_method)}</p>
            {typeof order.delivery_fee === 'number' && (
              <p className="text-xs text-neutral-500">{formatPrice(order.delivery_fee, lang)}</p>
            )}
            {order.tracking_number && shipmentStarted && (
              <div className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  {ordersCopy.trackingNumber || (lang === 'no' ? 'Sporingsnummer' : 'Tracking number')}
                </p>
                <p className="mt-1 font-medium text-neutral-900 break-all">{order.tracking_number}</p>
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-sm font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-700"
                  >
                    {ordersCopy.trackParcel || (lang === 'no' ? 'Spor pakken hos Posten' : 'Track parcel with Posten')}
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!depositPaid && onPayDeposit && (
              <button
                onClick={() => onPayDeposit(order.id)}
                className="btn-primary inline-flex items-center gap-1.5 w-full justify-center sm:w-auto"
              >
                {lang === 'no' ? 'Betal depositum' : 'Pay deposit'}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {remainderDue > 0 && order.status === 'deposit_paid' && (
              <Link href={`/rugeegg/mine-bestillinger/${order.id}/betaling`} className="btn-primary inline-flex w-full justify-center sm:w-auto">
                {payBalanceLabel}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            {canAdd && (
              <Link href={`/rugeegg/mine-bestillinger/${order.id}/betaling`} className="btn-secondary inline-flex w-full justify-center sm:w-auto">
                {ordersCopy.addEggs}
              </Link>
            )}
            {canWishlistMore && (
              <Link
                href={`/rugeegg/raser?orderId=${encodeURIComponent(order.id)}&wishlist=1`}
                className="btn-secondary inline-flex w-full justify-center sm:w-auto"
              >
                {ordersCopy.wishlistMore || (lang === 'no' ? 'Ønsk flere egg' : 'Wish for more eggs')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {canChoosePickupDay && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              {(ordersCopy as any).pickupDay || (lang === 'no' ? 'Hentedag' : 'Pickup day')}
            </p>
            {chosenPickupDate && chosenPickupTime && !pickingDay && (
              <button
                type="button"
                onClick={() => { setPickingDay(true); setPendingDay(null) }}
                className="text-xs text-neutral-500 underline hover:text-neutral-700"
              >
                {(ordersCopy as any).changePickupDay || (lang === 'no' ? 'Endre' : 'Change')}
              </button>
            )}
          </div>

          {chosenPickupDate && chosenPickupTime && !pickingDay ? (
            <p className="text-sm font-medium text-neutral-900">
              {pickupDateLabel} {(ordersCopy as any).atTime || (lang === 'no' ? 'kl.' : 'at')} {chosenPickupTime}
            </p>
          ) : (
            <>
              {/* Step 1: choose day */}
              {!pendingDay && (
                <>
                  <p className="text-sm text-neutral-600 mb-3">
                    {(ordersCopy as any).choosePickupDay || (lang === 'no' ? 'Velg hentedag (søndag, mandag eller tirsdag)' : 'Choose pickup day (Sunday, Monday, or Tuesday)')}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {pickupDays.map((day) => {
                      const isPast = day.date < today
                      const isSelected = !pendingDay && chosenPickupDate === day.iso
                      return (
                        <button
                          key={day.iso}
                          type="button"
                          disabled={isPast || savingPickupDay}
                          onClick={() => setPendingDay(day.iso)}
                          className={cn(
                            'flex-1 min-w-[90px] rounded-md border px-3 py-2 text-center text-xs transition-colors',
                            isSelected
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : isPast
                              ? 'border-neutral-100 bg-neutral-100 text-neutral-300 cursor-not-allowed'
                              : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-100'
                          )}
                        >
                          {day.dayName}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Step 2: choose time */}
              {pendingDay && (
                <>
                  <p className="text-sm text-neutral-600 mb-1">
                    {new Date(`${pendingDay}T00:00:00`).toLocaleDateString(locale, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                  <p className="text-sm text-neutral-600 mb-3">
                    {(ordersCopy as any).choosePickupTime || (lang === 'no' ? 'Velg hentetid' : 'Choose pickup time')}
                  </p>
                  <div className="flex gap-2">
                    {PICKUP_TIME_SLOTS.map((time) => (
                      <button
                        key={time}
                        type="button"
                        disabled={savingPickupDay}
                        onClick={() => handlePickupTimeSelect(time)}
                        className="flex-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-center text-sm text-neutral-700 hover:border-neutral-400 hover:bg-neutral-100 transition-colors"
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingDay(null)}
                    className="mt-2 text-xs text-neutral-500 underline"
                  >
                    {lang === 'no' ? 'Tilbake' : 'Back'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      <div className={cn('rounded-lg border px-3 py-2 text-sm', nextActionClass)}>
        <p className="font-medium">{nextAction.text}</p>
      </div>

      <div className="space-y-2">
        <StepTimeline
          steps={timelineSteps}
          expandLabel={ordersCopy.timelineExpand}
          collapseLabel={ordersCopy.timelineCollapse}
        />
      </div>
    </GlassCard>
  )
}
