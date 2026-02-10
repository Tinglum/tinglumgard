'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { GlassCard } from '@/components/eggs/GlassCard'
import { MessagingPanel } from '@/components/MessagingPanel'
import { formatDateFull, formatPrice } from '@/lib/eggs/utils'
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react'

interface EggPayment {
  payment_type: string
  status: string
  amount_nok?: number
  paid_at?: string | null
}

interface EggOrderAddition {
  quantity: number
  subtotal: number
}

interface EggOrder {
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

export default function EggOrdersPage() {
  const { lang: language, t } = useLanguage()
  const [orders, setOrders] = useState<EggOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'orders' | 'messages'>('orders')
  const today = useMemo(() => toDateOnly(new Date()), [])
  const ordersCopy = t.eggs.myOrders

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aDate = new Date(a.delivery_monday).getTime()
      const bDate = new Date(b.delivery_monday).getTime()
      return aDate - bDate
    })
  }, [orders])

  useEffect(() => {
    let isMounted = true

    async function loadOrders() {
      setIsLoading(true)
      try {
        const response = await fetch('/api/eggs/my-orders', { cache: 'no-store' })
        if (response.status === 401) {
          if (isMounted) {
            setAuthRequired(true)
            setOrders([])
            setError(null)
          }
          return
        }

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || t.eggs.errors.couldNotFetchOrders)
        }

        if (isMounted) {
          setOrders(data || [])
          setAuthRequired(false)
          setError(null)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || t.eggs.errors.couldNotFetchOrders)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadOrders()
    return () => {
      isMounted = false
    }
  }, [t])

  const formatDeliveryMethod = (method: string) => {
    if (method === 'posten') return ordersCopy.deliveryPosten
    if (method === 'e6_pickup') return ordersCopy.deliveryE6
    if (method === 'farm_pickup') return ordersCopy.deliveryFarm
    return method
  }

  const getStatusMeta = (order: EggOrder, remainderDue: number, daysToDue: number | null) => {
    const base = {
      label: ordersCopy.statusPending,
      className: 'bg-neutral-100 text-neutral-700',
    }

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
        return base
    }
  }

  const getTimelineDate = (value?: string | null) => {
    if (!value) return '-'
    return formatDateFull(new Date(value), language)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
      </div>
    )
  }

  if (authRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <GlassCard className="p-8 text-center max-w-md space-y-6">
          <div>
            <h1 className="text-3xl font-normal text-neutral-900 mb-2">{ordersCopy.authTitle}</h1>
            <p className="text-sm text-neutral-600">{ordersCopy.authDescription}</p>
          </div>
          <button
            onClick={() =>
              (window.location.href = '/api/auth/vipps/login?returnTo=/rugeegg/mine-bestillinger')
            }
            className="btn-primary w-full"
          >
            {ordersCopy.authTitle}
          </button>
          <Link href="/rugeegg/raser" className="text-sm text-neutral-500 hover:text-neutral-700">
            {t.eggs.common.backToBreeds}
          </Link>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-normal text-neutral-900 mb-2">{ordersCopy.pageTitle}</h1>
            <p className="text-neutral-600">{ordersCopy.pageDescription}</p>
          </div>
          <Link href="/rugeegg/raser" className="text-sm text-neutral-600 hover:text-neutral-900">
            {t.eggs.common.backToBreeds}
          </Link>
        </div>

        <div className="flex gap-4 border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-2 pb-3 text-sm font-normal transition-colors ${
              activeTab === 'orders'
                ? 'text-neutral-900 border-b-2 border-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {ordersCopy.tabOrders}
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-2 pb-3 text-sm font-normal transition-colors ${
              activeTab === 'messages'
                ? 'text-neutral-900 border-b-2 border-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {ordersCopy.tabMessages}
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="space-y-6">
            {error && <GlassCard className="p-4 text-sm text-red-600">{error}</GlassCard>}

            {orders.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <p className="text-sm text-neutral-500">{ordersCopy.noOrders}</p>
                <Link href="/rugeegg/raser" className="btn-primary inline-flex mt-6">
                  {ordersCopy.browseBreeds}
                </Link>
              </GlassCard>
            ) : (
              sortedOrders.map((order) => {
                const breedName = order.egg_breeds?.name || t.eggs.common.fallbackBreed
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
                const remainderDue = Math.max(0, order.remainder_amount - remainderPaidOre)
                const dueDate = order.remainder_due_date ? toDateOnly(order.remainder_due_date) : null
                const deliveryDate = toDateOnly(order.delivery_monday)
                const deliveryMondayLocal = new Date(`${order.delivery_monday}T00:00:00`)
                const canAdd = new Date() < deliveryMondayLocal && ['fully_paid', 'preparing'].includes(order.status)
                const daysToDue = dueDate ? daysBetween(dueDate, today) : null
                const daysToDueLabel = daysToDue !== null ? Math.max(daysToDue, 0) : null
                const daysToDelivery = daysBetween(deliveryDate, today)
                const statusMeta = getStatusMeta(order, remainderDue, daysToDue)
                const depositPayment = order.egg_payments?.find(
                  (payment) => payment.payment_type === 'deposit' && payment.status === 'completed'
                )
                const remainderPayment = order.egg_payments?.find(
                  (payment) => payment.payment_type === 'remainder' && payment.status === 'completed'
                )
                const depositPaid = !!depositPayment
                const remainderPaid = !!remainderPayment || remainderDue === 0
                const timelineSteps = [
                  {
                    key: 'placed',
                    label: ordersCopy.stepPlaced,
                    date: getTimelineDate(order.created_at || null),
                    completed: true,
                  },
                  {
                    key: 'deposit',
                    label: ordersCopy.stepDeposit,
                    date: depositPaid
                      ? getTimelineDate(depositPayment?.paid_at || null)
                      : t.eggs.common.notPaid,
                    completed: depositPaid,
                  },
                  {
                    key: 'remainder',
                    label: ordersCopy.stepRemainder,
                    date: remainderPaid
                      ? getTimelineDate(remainderPayment?.paid_at || null)
                      : order.remainder_due_date
                        ? getTimelineDate(order.remainder_due_date)
                        : t.eggs.common.notPaid,
                    completed: remainderPaid,
                  },
                  {
                    key: 'shipment',
                    label: ordersCopy.stepShipment,
                    date: getTimelineDate(order.delivery_monday),
                    completed: ['shipped', 'delivered'].includes(order.status),
                  },
                ]
                const currentStepIndex = timelineSteps.findIndex((step) => !step.completed)

                return (
                  <GlassCard
                    key={order.id}
                    className="p-6 space-y-6"
                    accentBorder={order.egg_breeds?.accent_color}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                          {t.eggs.common.order}
                        </p>
                        <h2 className="text-2xl font-normal text-neutral-900">{order.order_number}</h2>
                        <p className="text-sm text-neutral-600">
                          {breedName} - {t.eggs.common.week} {order.week_number} -{' '}
                          {formatDateFull(new Date(order.delivery_monday), language)}
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
                            {totalEggs} {t.eggs.common.eggs}
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
                            {formatPrice(order.total_amount, language)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-500">{t.eggs.common.deposit}</span>
                          <span className="font-normal text-neutral-900">
                            {formatPrice(order.deposit_amount, language)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-500">{t.eggs.common.remainder}</span>
                          <span className="font-normal text-neutral-900">
                            {formatPrice(remainderDue, language)}
                          </span>
                        </div>
                        {dueDate && remainderDue > 0 && (
                          <div className="flex items-start gap-2 text-xs text-neutral-600">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span>
                              {ordersCopy.duePrefix} {formatDateFull(dueDate, language)}
                              {daysToDueLabel !== null && ` - ${daysToDueLabel} ${t.eggs.common.daysLeft}`}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                          <CheckCircle2 className="w-4 h-4 text-neutral-900" />
                          <span>
                            {ordersCopy.shipmentPrefix} {formatDateFull(deliveryDate, language)}
                            {daysToDelivery >= 0 && ` - ${daysToDelivery} ${t.eggs.common.daysLeft}`}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm text-neutral-600">
                          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{ordersCopy.delivery}</p>
                          <p className="font-normal text-neutral-900">
                            {formatDeliveryMethod(order.delivery_method)}
                          </p>
                          {typeof order.delivery_fee === 'number' && (
                            <p className="text-xs text-neutral-500">
                              {formatPrice(order.delivery_fee, language)}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {remainderDue > 0 && order.status === 'deposit_paid' && (
                            <Link
                              href={`/rugeegg/mine-bestillinger/${order.id}/betaling`}
                              className="btn-primary inline-flex"
                            >
                              {ordersCopy.payRemainder}
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          )}
                          {canAdd && (
                            <Link
                              href={`/rugeegg/mine-bestillinger/${order.id}/betaling`}
                              className="btn-secondary inline-flex"
                            >
                              {ordersCopy.addEggs}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{ordersCopy.timeline}</p>
                      <div className="mt-4">
                        <div className="flex items-start justify-between">
                          {timelineSteps.map((step, index) => {
                            const isCompleted = step.completed
                            const isCurrent = currentStepIndex === index
                            const isLast = index === timelineSteps.length - 1

                            return (
                              <div key={step.key} className="flex items-start flex-1">
                                <div className="flex flex-col items-center relative z-10">
                                  <div
                                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                                      isCompleted
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : isCurrent
                                          ? 'bg-white border-amber-400 text-amber-600'
                                          : 'bg-white border-neutral-300 text-neutral-400'
                                    }`}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4" />
                                    ) : (
                                      <span className="block w-2 h-2 rounded-full bg-current" />
                                    )}
                                  </div>
                                  <p
                                    className={`mt-2 text-xs text-center ${
                                      isCompleted
                                        ? 'text-neutral-900'
                                        : isCurrent
                                          ? 'text-amber-700'
                                          : 'text-neutral-500'
                                    }`}
                                  >
                                    {step.label}
                                  </p>
                                  <p className="text-[11px] text-neutral-400 text-center">{step.date}</p>
                                </div>
                                {!isLast && (
                                  <div className="flex-1 h-0.5 mx-2 mt-4">
                                    <div className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-neutral-200'}`} />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <GlassCard className="p-6">
            <MessagingPanel />
          </GlassCard>
        )}
      </div>
    </div>
  )
}
