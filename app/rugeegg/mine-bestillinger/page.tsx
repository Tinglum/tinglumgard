'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { GlassCard } from '@/components/eggs/GlassCard'
import { MessagingPanel } from '@/components/MessagingPanel'
import { formatDateFull, formatPrice } from '@/lib/eggs/utils'
import {
  ArrowRight,
  Calendar,
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

const formatDeliveryMethod = (method: string, language: string) => {
  if (method === 'posten') {
    return language === 'no' ? 'Sending med Posten' : 'Posten shipment'
  }
  if (method === 'e6_pickup') {
    return language === 'no' ? 'E6 møtepunkt' : 'E6 pickup'
  }
  if (method === 'farm_pickup') {
    return language === 'no' ? 'Henting på gården' : 'Farm pickup'
  }
  return method
}

const buildCalendarIcs = (params: {
  orderNumber: string
  breedName: string
  deliveryMonday: string
  language: string
}) => {
  const deliveryDate = new Date(params.deliveryMonday)
  const endDate = new Date(deliveryDate)
  endDate.setDate(endDate.getDate() + 1)
  const formatDate = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '')
  const summary =
    params.language === 'no'
      ? `Rugeegg sending - ${params.breedName}`
      : `Hatching eggs shipment - ${params.breedName}`
  const description =
    params.language === 'no'
      ? `Bestilling ${params.orderNumber} sendes denne uken.`
      : `Order ${params.orderNumber} ships this week.`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tinglum Gård//Rugeegg//NO',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${params.orderNumber}-${formatDate(deliveryDate)}@tinglumgard.no`,
    `DTSTAMP:${formatDate(new Date())}T000000Z`,
    `DTSTART;VALUE=DATE:${formatDate(deliveryDate)}`,
    `DTEND;VALUE=DATE:${formatDate(endDate)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

const getStatusMeta = (
  order: EggOrder,
  remainderDue: number,
  daysToDue: number | null,
  language: string
) => {
  const base = {
    label: language === 'no' ? 'Venter' : 'Pending',
    className: 'bg-neutral-100 text-neutral-700',
  }

  switch (order.status) {
    case 'deposit_paid':
      if (remainderDue > 0) {
        const urgent = daysToDue !== null && daysToDue <= 6
        return {
          label: language === 'no' ? 'Restbetaling' : 'Remainder due',
          className: urgent ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700',
        }
      }
      return {
        label: language === 'no' ? 'Forskudd betalt' : 'Deposit paid',
        className: 'bg-emerald-50 text-emerald-700',
      }
    case 'fully_paid':
      return {
        label: language === 'no' ? 'Betalt' : 'Paid',
        className: 'bg-emerald-50 text-emerald-700',
      }
    case 'preparing':
      return {
        label: language === 'no' ? 'Klargjøres' : 'Preparing',
        className: 'bg-indigo-50 text-indigo-700',
      }
    case 'shipped':
      return {
        label: language === 'no' ? 'Sendt' : 'Shipped',
        className: 'bg-indigo-50 text-indigo-700',
      }
    case 'delivered':
      return {
        label: language === 'no' ? 'Levert' : 'Delivered',
        className: 'bg-neutral-100 text-neutral-700',
      }
    case 'forfeited':
      return {
        label: language === 'no' ? 'Forfalt' : 'Forfeited',
        className: 'bg-rose-50 text-rose-700',
      }
    case 'cancelled':
      return {
        label: language === 'no' ? 'Kansellert' : 'Cancelled',
        className: 'bg-rose-50 text-rose-700',
      }
    default:
      return base
  }
}

export default function EggOrdersPage() {
  const { lang: language } = useLanguage()
  const [orders, setOrders] = useState<EggOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'orders' | 'messages'>('orders')
  const today = useMemo(() => toDateOnly(new Date()), [])

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
          throw new Error(data?.error || 'Kunne ikke hente bestillinger')
        }

        if (isMounted) {
          setOrders(data || [])
          setAuthRequired(false)
          setError(null)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Kunne ikke hente bestillinger')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadOrders()
    return () => {
      isMounted = false
    }
  }, [])

  const downloadCalendar = (order: EggOrder, breedName: string) => {
    const ics = buildCalendarIcs({
      orderNumber: order.order_number,
      breedName,
      deliveryMonday: order.delivery_monday,
      language,
    })
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `rugeegg-${order.order_number}.ics`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
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
            <h1 className="text-3xl font-normal text-neutral-900 mb-2">
              {language === 'no' ? 'Logg inn med Vipps' : 'Log in with Vipps'}
            </h1>
            <p className="text-sm text-neutral-600">
              {language === 'no'
                ? 'For å se dine rugeegg-bestillinger må du logge inn.'
                : 'Log in to view your hatching egg orders.'}
            </p>
          </div>
          <button
            onClick={() =>
              (window.location.href = '/api/auth/vipps/login?returnTo=/rugeegg/mine-bestillinger')
            }
            className="btn-primary w-full"
          >
            {language === 'no' ? 'Logg inn med Vipps' : 'Log in with Vipps'}
          </button>
          <Link href="/rugeegg/raser" className="text-sm text-neutral-500 hover:text-neutral-700">
            {language === 'no' ? 'Til raser' : 'Back to breeds'}
          </Link>
        </GlassCard>
      </div>
    )
  }

  const getTimelineDate = (value?: string | null) => {
    if (!value) return '-'
    return formatDateFull(new Date(value), language)
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-normal text-neutral-900 mb-2">
              {language === 'no' ? 'Mine bestillinger' : 'My orders'}
            </h1>
            <p className="text-neutral-600">
              {language === 'no'
                ? 'Oversikt over dine rugeegg-bestillinger.'
                : 'Overview of your hatching egg orders.'}
            </p>
          </div>
          <Link href="/rugeegg/raser" className="text-sm text-neutral-600 hover:text-neutral-900">
            {language === 'no' ? 'Til raser' : 'Back to breeds'}
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
            {language === 'no' ? 'Bestillinger' : 'Orders'}
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-2 pb-3 text-sm font-normal transition-colors ${
              activeTab === 'messages'
                ? 'text-neutral-900 border-b-2 border-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {language === 'no' ? 'Meldinger' : 'Messages'}
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="space-y-6">
            {error && (
              <GlassCard className="p-4 text-sm text-red-600">
                {error}
              </GlassCard>
            )}

            {orders.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <p className="text-sm text-neutral-500">
                  {language === 'no'
                    ? 'Ingen bestillinger funnet ennå.'
                    : 'No orders found yet.'}
                </p>
                <Link href="/rugeegg/raser" className="btn-primary inline-flex mt-6">
                  {language === 'no' ? 'Se raser' : 'Browse breeds'}
                </Link>
              </GlassCard>
            ) : (
              sortedOrders.map((order) => {
                const breedName = order.egg_breeds?.name || (language === 'no' ? 'Rugeegg' : 'Eggs')
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
                const dayBefore = new Date(deliveryDate)
                dayBefore.setDate(dayBefore.getDate() - 1)
                const canAdd = today <= dayBefore
                const daysToDue = dueDate ? daysBetween(dueDate, today) : null
                const daysToDueLabel = daysToDue !== null ? Math.max(daysToDue, 0) : null
                const daysToDelivery = daysBetween(deliveryDate, today)
                const statusMeta = getStatusMeta(order, remainderDue, daysToDue, language)
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
                    label: language === 'no' ? 'Bestilling' : 'Order placed',
                    date: getTimelineDate(order.created_at || null),
                    completed: true,
                  },
                  {
                    key: 'deposit',
                    label: language === 'no' ? 'Forskudd' : 'Deposit',
                    date: depositPaid
                      ? getTimelineDate(depositPayment?.paid_at || null)
                      : language === 'no'
                        ? 'Ikke betalt'
                        : 'Not paid',
                    completed: depositPaid,
                  },
                  {
                    key: 'remainder',
                    label: language === 'no' ? 'Restbetaling' : 'Remainder',
                    date: remainderPaid
                      ? getTimelineDate(remainderPayment?.paid_at || null)
                      : order.remainder_due_date
                        ? getTimelineDate(order.remainder_due_date)
                        : language === 'no'
                          ? 'Ikke betalt'
                          : 'Not paid',
                    completed: remainderPaid,
                  },
                  {
                    key: 'shipment',
                    label: language === 'no' ? 'Sending' : 'Shipment',
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
                          {language === 'no' ? 'Ordre' : 'Order'}
                        </p>
                        <h2 className="text-2xl font-normal text-neutral-900">{order.order_number}</h2>
                        <p className="text-sm text-neutral-600">
                          {breedName} · {language === 'no' ? 'Uke' : 'Week'} {order.week_number} ·{' '}
                          {formatDateFull(new Date(order.delivery_monday), language)}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                            {language === 'no' ? 'Mengde' : 'Quantity'}
                          </p>
                          <p className="text-2xl font-normal text-neutral-900">
                            {totalEggs} {language === 'no' ? 'egg' : 'eggs'}
                          </p>
                          {additionsEggs > 0 && (
                            <p className="text-xs text-neutral-500">
                              {language === 'no'
                                ? `+${additionsEggs} tillegg`
                                : `+${additionsEggs} additions`}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                            {language === 'no' ? 'Total' : 'Total'}
                          </p>
                          <p className="text-lg font-normal text-neutral-900">
                            {formatPrice(order.total_amount, language)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-500">
                            {language === 'no' ? 'Forskudd' : 'Deposit'}
                          </span>
                          <span className="font-normal text-neutral-900">
                            {formatPrice(order.deposit_amount, language)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-500">
                            {language === 'no' ? 'Restbetaling' : 'Remainder'}
                          </span>
                          <span className="font-normal text-neutral-900">
                            {formatPrice(remainderDue, language)}
                          </span>
                        </div>
                        {dueDate && remainderDue > 0 && (
                          <div className="flex items-start gap-2 text-xs text-neutral-600">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span>
                              {language === 'no'
                                ? `Forfaller ${formatDateFull(dueDate, language)}`
                                : `Due ${formatDateFull(dueDate, language)}`}
                              {daysToDueLabel !== null &&
                                ` · ${daysToDueLabel} ${language === 'no' ? 'dager igjen' : 'days left'}`}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                          <CheckCircle2 className="w-4 h-4 text-neutral-900" />
                          <span>
                            {language === 'no'
                              ? `Forsendelse ${formatDateFull(deliveryDate, language)}`
                              : `Shipment ${formatDateFull(deliveryDate, language)}`}
                            {daysToDelivery >= 0 &&
                              ` · ${daysToDelivery} ${language === 'no' ? 'dager igjen' : 'days left'}`}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm text-neutral-600">
                          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                            {language === 'no' ? 'Forsendelse' : 'Shipment'}
                          </p>
                          <p className="font-normal text-neutral-900">
                            {formatDeliveryMethod(order.delivery_method, language)}
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
                              {language === 'no' ? 'Betal rest' : 'Pay remainder'}
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          )}
                          {canAdd && ['deposit_paid', 'fully_paid'].includes(order.status) && (
                            <Link
                              href={`/rugeegg/mine-bestillinger/${order.id}/betaling`}
                              className="btn-secondary inline-flex"
                            >
                              {language === 'no' ? 'Legg til egg' : 'Add eggs'}
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => downloadCalendar(order, breedName)}
                            className="btn-secondary inline-flex"
                          >
                            <Calendar className="w-4 h-4" />
                            {language === 'no' ? 'Legg til i kalender' : 'Add to calendar'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                        {language === 'no' ? 'Statuslinje' : 'Timeline'}
                      </p>
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
                                    <div
                                      className={`h-full ${
                                        isCompleted ? 'bg-emerald-500' : 'bg-neutral-200'
                                      }`}
                                    />
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
