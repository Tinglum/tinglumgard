'use client'

import { useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StepTimeline } from '@/components/orders/StepTimeline'

interface ChickenOrderCardProps {
  order: {
    id: string
    order_number: string
    quantity_hens: number
    quantity_roosters: number
    pickup_year: number
    pickup_week: number
    age_weeks_at_pickup: number
    price_per_hen_nok: number
    total_amount_nok: number
    deposit_amount_nok: number
    remainder_amount_nok: number
    remainder_due_date?: string | null
    delivery_method: string
    status: string
    created_at: string
    chicken_breeds?: { name: string; accent_color: string }
    chicken_payments?: Array<{ payment_type: string; status: string; amount_nok: number }>
  }
  onPayRemainder?: (orderId: string) => void
}

const toDateOnly = (value: string | Date) => {
  const date = new Date(value)
  return new Date(date.toISOString().split('T')[0])
}

const daysBetween = (future: Date, today: Date) => {
  const diffMs = future.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

const getIsoWeekMondayDate = (year: number, week: number) => {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7))
  const day = simple.getUTCDay() || 7
  if (day <= 4) {
    simple.setUTCDate(simple.getUTCDate() - day + 1)
  } else {
    simple.setUTCDate(simple.getUTCDate() + 8 - day)
  }
  return toDateOnly(simple)
}

export function ChickenOrderCard({ order, onPayRemainder }: ChickenOrderCardProps) {
  const { lang, t } = useLanguage()
  const myOrdersCopy = (t as any).chickens.myOrders
  const common = t.common
  const locale = lang === 'en' ? 'en-US' : 'nb-NO'
  const today = useMemo(() => toDateOnly(new Date()), [])

  const statusMeta: Record<string, { label: string; className: string }> = {
    pending: { label: myOrdersCopy.statusPending, className: 'bg-amber-50 text-amber-700' },
    deposit_paid: { label: myOrdersCopy.statusDepositPaid, className: 'bg-blue-50 text-blue-700' },
    fully_paid: { label: myOrdersCopy.statusFullyPaid, className: 'bg-emerald-50 text-emerald-700' },
    ready_for_pickup: { label: myOrdersCopy.statusReadyForPickup, className: 'bg-indigo-50 text-indigo-700' },
    picked_up: { label: myOrdersCopy.statusPickedUp, className: 'bg-neutral-100 text-neutral-700' },
    cancelled: { label: myOrdersCopy.statusCancelled, className: 'bg-rose-50 text-rose-700' },
  }

  const depositPaid = order.chicken_payments?.some(
    (payment) => payment.payment_type === 'deposit' && payment.status === 'completed'
  )
  const remainderPaid = order.chicken_payments?.some(
    (payment) => payment.payment_type === 'remainder' && payment.status === 'completed'
  )

  const showPayRemainder = order.status === 'deposit_paid' && !remainderPaid && onPayRemainder
  const meta = statusMeta[order.status] || { label: order.status, className: 'bg-neutral-100 text-neutral-700' }
  const pickupDate = getIsoWeekMondayDate(order.pickup_year, order.pickup_week)
  const daysToPickup = daysBetween(pickupDate, today)
  const daysToPickupLabel = Math.max(daysToPickup, 0)
  const pickupDateLabel = pickupDate.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const dueDate = order.remainder_due_date ? toDateOnly(order.remainder_due_date) : null
  const dueDateLabel = dueDate
    ? dueDate.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null
  const daysToDue = dueDate ? daysBetween(dueDate, today) : null
  const daysToDueLabel = daysToDue !== null ? Math.max(daysToDue, 0) : null
  const depositDone =
    Boolean(depositPaid) || ['deposit_paid', 'fully_paid', 'ready_for_pickup', 'picked_up'].includes(order.status)
  const remainderDone =
    Boolean(remainderPaid) || ['fully_paid', 'ready_for_pickup', 'picked_up'].includes(order.status)
  const pickupDone = ['picked_up'].includes(order.status)
  const timelineSteps = [
    {
      key: 'reserved',
      label: myOrdersCopy.stepReserved,
      hint: `${myOrdersCopy.weekLabel} ${order.pickup_week}, ${order.pickup_year}`,
      done: true,
    },
    {
      key: 'deposit',
      label: myOrdersCopy.stepDeposit,
      hint: depositDone ? myOrdersCopy.statusDepositPaid : myOrdersCopy.statusPending,
      done: depositDone,
    },
    {
      key: 'remainder',
      label: myOrdersCopy.stepRemainder,
      hint:
        dueDateLabel && !remainderDone
          ? `${myOrdersCopy.duePrefix} ${dueDateLabel}${
              daysToDueLabel !== null && daysToDue !== null && daysToDue >= 0
                ? ` - ${daysToDueLabel} ${myOrdersCopy.daysLeftLabel}`
                : ''
            }`
          : myOrdersCopy.remainderPaidPrefix,
      done: remainderDone,
    },
    {
      key: 'pickup',
      label: myOrdersCopy.stepPickup,
      hint: `${myOrdersCopy.pickupPrefix} ${pickupDateLabel}${
        daysToPickup >= 0 ? ` - ${daysToPickupLabel} ${myOrdersCopy.daysLeftLabel}` : ''
      }`,
      done: pickupDone,
    },
  ]

  return (
    <Card className="p-6 border-neutral-200 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.minSide.order}</p>
          <h3 className="text-2xl font-normal text-neutral-900">{order.order_number}</h3>
          <p className="text-sm text-neutral-600">
            {order.chicken_breeds?.name || common.defaultChickenName} - {myOrdersCopy.weekLabel} {order.pickup_week}, {order.pickup_year}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${meta.className}`}>
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.hensLabel}</p>
            <p className="text-2xl font-normal text-neutral-900">{order.quantity_hens}</p>
          </div>
          {order.quantity_roosters > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.roostersLabel}</p>
              <p className="text-lg font-normal text-neutral-900">{order.quantity_roosters}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">{myOrdersCopy.depositLabel}</span>
            <span className="font-normal text-neutral-900">
              {common.currency} {order.deposit_amount_nok.toLocaleString(locale)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">{myOrdersCopy.remainderLabel}</span>
            <span className="font-normal text-neutral-900">
              {common.currency} {order.remainder_amount_nok.toLocaleString(locale)}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-neutral-600">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.ageLabel}</p>
            <p className="font-normal text-neutral-900">
              {order.age_weeks_at_pickup} {myOrdersCopy.weeksLabel}
            </p>
          </div>
          <div className="text-sm text-neutral-600">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.pricePerHenLabel}</p>
            <p className="font-normal text-neutral-900">{common.currency} {order.price_per_hen_nok.toLocaleString(locale)}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.timeline}</p>
        <StepTimeline steps={timelineSteps} />
      </div>

      {showPayRemainder && (
        <div className="mt-5 pt-5 border-t border-neutral-200">
          <Button className="btn-primary" onClick={() => onPayRemainder?.(order.id)}>
            {myOrdersCopy.payRemainder}
          </Button>
        </div>
      )}
    </Card>
  )
}
