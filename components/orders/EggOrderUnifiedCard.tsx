'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { GlassCard } from '@/components/eggs/GlassCard'
import { formatDateFull, formatPrice } from '@/lib/eggs/utils'
import { ArrowRight } from 'lucide-react'
import { StepTimeline } from '@/components/orders/StepTimeline'

type EggPayment = {
  payment_type: string
  status: string
  amount_nok?: number
  paid_at?: string | null
}

type EggOrderAddition = {
  quantity: number
  subtotal: number
}

type EggOrder = {
  id: string
  order_number: string
  status: string
  quantity: number
  total_amount: number
  deposit_amount: number
  remainder_amount: number
  remainder_due_date?: string | null
  delivery_monday: string
  week_number: number
  delivery_method: string
  delivery_fee?: number
  created_at?: string | null
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

export function EggOrderUnifiedCard({ order }: { order: EggOrder }) {
  const { lang, t } = useLanguage()
  const ordersCopy = t.eggs.myOrders
  const common = t.eggs.common

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
  const totalEggs = order.quantity + additionsEggs
  const remainderPaidOre =
    order.egg_payments?.reduce((sum, payment) => {
      if (payment.payment_type !== 'remainder' || payment.status !== 'completed') return sum
      return sum + (payment.amount_nok || 0) * 100
    }, 0) || 0
  const depositPaid =
    (order.egg_payments || []).some(
      (payment) => payment.payment_type === 'deposit' && payment.status === 'completed'
    ) || ['deposit_paid', 'fully_paid', 'preparing', 'shipped', 'delivered'].includes(order.status)
  const remainderDue = Math.max(0, order.remainder_amount - remainderPaidOre)
  const dueDate = order.remainder_due_date ? toDateOnly(order.remainder_due_date) : null
  const deliveryDate = toDateOnly(order.delivery_monday)
  const deliveryMondayLocal = new Date(`${order.delivery_monday}T00:00:00`)
  const canAdd = new Date() < deliveryMondayLocal && ['fully_paid', 'preparing'].includes(order.status)
  const daysToDue = dueDate ? daysBetween(dueDate, today) : null
  const daysToDueLabel = daysToDue !== null ? Math.max(daysToDue, 0) : null
  const daysToDelivery = daysBetween(deliveryDate, today)
  const remainderPaid =
    remainderDue <= 0 || ['fully_paid', 'preparing', 'shipped', 'delivered'].includes(order.status)
  const shipmentDone = ['shipped', 'delivered'].includes(order.status)

  const timelineSteps = [
    {
      key: 'placed',
      label: ordersCopy.stepPlaced,
      hint: order.created_at ? formatDateFull(new Date(order.created_at), lang) : `${common.week} ${order.week_number}`,
      done: true,
    },
    {
      key: 'deposit',
      label: ordersCopy.stepDeposit,
      hint: depositPaid ? ordersCopy.statusDepositPaid : ordersCopy.statusPending,
      done: depositPaid,
    },
    {
      key: 'remainder',
      label: ordersCopy.stepRemainder,
      hint:
        dueDate && !remainderPaid
          ? `${ordersCopy.duePrefix} ${formatDateFull(dueDate, lang)}${
              daysToDueLabel !== null ? ` - ${daysToDueLabel} ${common.daysLeft}` : ''
            }`
          : ordersCopy.statusPaid,
      done: remainderPaid,
    },
    {
      key: 'shipment',
      label: ordersCopy.stepShipment,
      hint: `${ordersCopy.shipmentPrefix} ${formatDateFull(deliveryDate, lang)}${
        daysToDelivery >= 0 ? ` - ${daysToDelivery} ${common.daysLeft}` : ''
      }`,
      done: shipmentDone,
    },
  ]

  const statusMeta = (() => {
    switch (order.status) {
      case 'deposit_paid':
        if (remainderDue > 0) {
          const urgent = daysToDue !== null && daysToDue <= 6
          return {
            label: ordersCopy.statusRemainderDue,
            className: urgent ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700',
          }
        }
        return {
          label: ordersCopy.statusDepositPaid,
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
            {(order.egg_breeds?.name || common.fallbackBreed)} - {common.week} {order.week_number} -{' '}
            {formatDateFull(new Date(order.delivery_monday), lang)}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusMeta.className}`}>
          {statusMeta.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{ordersCopy.quantity}</p>
            <p className="text-2xl font-normal text-neutral-900">
              {totalEggs} {common.eggs}
            </p>
            {additionsEggs > 0 && (
              <p className="text-xs text-neutral-500">
                {ordersCopy.additionsSuffix.replace('{count}', String(additionsEggs))}
              </p>
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
            <span className="text-neutral-500">{common.deposit}</span>
            <span className="font-normal text-neutral-900">
              {formatPrice(order.deposit_amount, lang)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">{common.remainder}</span>
            <span className="font-normal text-neutral-900">
              {formatPrice(remainderDue, lang)}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-neutral-600">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{ordersCopy.delivery}</p>
            <p className="font-normal text-neutral-900">{formatDeliveryMethod(order.delivery_method)}</p>
            {typeof order.delivery_fee === 'number' && (
              <p className="text-xs text-neutral-500">{formatPrice(order.delivery_fee, lang)}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {remainderDue > 0 && order.status === 'deposit_paid' && (
              <Link href={`/rugeegg/mine-bestillinger/${order.id}/betaling`} className="btn-primary inline-flex">
                {ordersCopy.payRemainder}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            {canAdd && (
              <Link href={`/rugeegg/mine-bestillinger/${order.id}/betaling`} className="btn-secondary inline-flex">
                {ordersCopy.addEggs}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <StepTimeline steps={timelineSteps} />
      </div>
    </GlassCard>
  )
}
