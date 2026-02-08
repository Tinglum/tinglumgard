'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { GlassCard } from '@/components/eggs/GlassCard'
import { MessagingPanel } from '@/components/MessagingPanel'
import { formatDateFull, formatPrice } from '@/lib/eggs/utils'
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Package,
  MessageSquare,
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
  const isMobile = useIsMobile()
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

  if (isMobile) {
    return (
      <div className="relative min-h-screen bg-[#F6F4EF] text-[#1E1B16]">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#E4F1F0] blur-3xl" />
          <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-[#F4D7C1] blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-[#D9E6D6] blur-3xl" />
        </div>
        <div className="mx-auto max-w-md px-5 pb-24 pt-6 font-[family:var(--font-manrope)]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {language === 'no' ? 'Tilbake' : 'Back'}
          </Link>

          <header className="mt-6 rounded-[28px] border border-[#E4DED5] bg-white p-6 shadow-[0_18px_40px_rgba(30,27,22,0.12)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">
              {language === 'no' ? 'Mine rugeegg' : 'My eggs'}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">
              {language === 'no' ? 'Mine bestillinger' : 'My orders'}
            </h1>
            <p className="mt-2 text-sm text-[#5E5A50]">
              {language === 'no'
                ? 'Oversikt over dine rugeegg-bestillinger.'
                : 'Overview of your hatching egg orders.'}
            </p>
          </header>

          <div className="mt-6 grid grid-cols-2 gap-2">
            {[
              { id: 'orders', label: language === 'no' ? 'Bestillinger' : 'Orders', icon: Package },
              { id: 'messages', label: language === 'no' ? 'Meldinger' : 'Messages', icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                    isActive
                      ? 'border-[#1E1B16] bg-[#1E1B16] text-[#F6F4EF]'
                      : 'border-[#E4DED5] bg-white text-[#6A6258]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {error && activeTab === 'orders' && (
            <div className="mt-4 rounded-2xl border border-[#F1C6C6] bg-[#FDF2F2] px-4 py-3 text-xs text-[#9B4B4B]">
              {error}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="mt-6 space-y-4">
              {orders.length === 0 ? (
                <div className="rounded-[28px] border border-[#E4DED5] bg-white p-6 text-center">
                  <Package className="mx-auto h-10 w-10 text-[#0F6C6F]" />
                  <h3 className="mt-4 text-lg font-semibold text-[#1E1B16]">
                    {language === 'no' ? 'Ingen bestillinger funnet ennå.' : 'No orders found yet.'}
                  </h3>
                  <p className="mt-2 text-sm text-[#5E5A50]">
                    {language === 'no' ? 'Se tilgjengelige raser og bestill.' : 'Browse available breeds and order.'}
                  </p>
                  <Link
                    href="/rugeegg/raser"
                    className="mt-4 inline-flex items-center justify-center rounded-2xl bg-[#1E1B16] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#F6F4EF]"
                  >
                    {language === 'no' ? 'Se raser' : 'Browse breeds'}
                  </Link>
                </div>
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

                  return (
                    <div
                      key={order.id}
                      className="rounded-[28px] border border-[#E4DED5] bg-white p-5 shadow-[0_18px_40px_rgba(30,27,22,0.12)]"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">
                            {language === 'no' ? 'Ordre' : 'Order'}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-[#1E1B16]">{order.order_number}</p>
                          <p className="mt-1 text-sm text-[#5E5A50]">
                            {breedName} · {language === 'no' ? 'Uke' : 'Week'} {order.week_number}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
                            statusMeta.className
                          }`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3 text-sm text-[#5E5A50]">
                        <div className="flex items-center justify-between">
                          <span>{language === 'no' ? 'Mengde' : 'Quantity'}</span>
                          <span className="font-semibold text-[#1E1B16]">
                            {totalEggs} {language === 'no' ? 'egg' : 'eggs'}
                          </span>
                        </div>
                        {additionsEggs > 0 && (
                          <div className="text-xs text-[#6A6258]">
                            {language === 'no'
                              ? `+${additionsEggs} tillegg`
                              : `+${additionsEggs} additions`}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span>{language === 'no' ? 'Total' : 'Total'}</span>
                          <span className="font-semibold text-[#1E1B16]">
                            {formatPrice(order.total_amount, language)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-[#E4DED5] bg-[#FBFAF7] px-4 py-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[#5E5A50]">
                            {language === 'no' ? 'Forskudd' : 'Deposit'}
                          </span>
                          <span className="font-semibold text-[#1E1B16]">
                            {formatPrice(order.deposit_amount, language)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[#5E5A50]">
                            {language === 'no' ? 'Restbetaling' : 'Remainder'}
                          </span>
                          <span className="font-semibold text-[#1E1B16]">
                            {formatPrice(remainderDue, language)}
                          </span>
                        </div>
                        {dueDate && remainderDue > 0 && (
                          <div className="mt-2 flex items-start gap-2 text-xs text-[#5E5A50]">
                            <AlertTriangle className="h-4 w-4 text-[#B35A2A]" />
                            <span>
                              {language === 'no'
                                ? `Forfaller ${formatDateFull(dueDate, language)}`
                                : `Due ${formatDateFull(dueDate, language)}`}
                              {daysToDueLabel !== null &&
                                ` · ${daysToDueLabel} ${language === 'no' ? 'dager igjen' : 'days left'}`}
                            </span>
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs text-[#5E5A50]">
                          <CheckCircle2 className="h-4 w-4 text-[#1E1B16]" />
                          <span>
                            {language === 'no'
                              ? `Forsendelse ${formatDateFull(deliveryDate, language)}`
                              : `Shipment ${formatDateFull(deliveryDate, language)}`}
                            {daysToDelivery >= 0 &&
                              ` · ${daysToDelivery} ${language === 'no' ? 'dager igjen' : 'days left'}`}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">
                          {language === 'no' ? 'Statuslinje' : 'Timeline'}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {timelineSteps.map((step) => (
                            <div
                              key={step.key}
                              className={`rounded-2xl border px-3 py-3 ${
                                step.completed
                                  ? 'border-[#0F6C6F] bg-[#EEF6F5]'
                                  : 'border-[#E4DED5] bg-white'
                              }`}
                            >
                              <p className="text-xs font-semibold text-[#1E1B16]">{step.label}</p>
                              <p className="mt-1 text-[11px] text-[#5E5A50]">{step.date}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 text-sm text-[#5E5A50]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">
                          {language === 'no' ? 'Forsendelse' : 'Shipment'}
                        </p>
                        <p className="font-semibold text-[#1E1B16]">
                          {formatDeliveryMethod(order.delivery_method, language)}
                        </p>
                        {typeof order.delivery_fee === 'number' && (
                          <p className="text-xs text-[#6A6258]">
                            {formatPrice(order.delivery_fee, language)}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        {remainderDue > 0 && order.status === 'deposit_paid' && (
                          <Link
                            href={`/rugeegg/mine-bestillinger/${order.id}/betaling`}
                            className="block w-full rounded-2xl bg-[#1E1B16] px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#F6F4EF]"
                          >
                            {language === 'no' ? 'Betal rest' : 'Pay remainder'}
                          </Link>
                        )}
                        {canAdd && ['deposit_paid', 'fully_paid'].includes(order.status) && (
                          <Link
                            href={`/rugeegg/mine-bestillinger/${order.id}/betaling`}
                            className="block w-full rounded-2xl border border-[#E4DED5] px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#6A6258]"
                          >
                            {language === 'no' ? 'Legg til egg' : 'Add eggs'}
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => downloadCalendar(order, breedName)}
                          className="block w-full rounded-2xl border border-[#E4DED5] px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#6A6258]"
                        >
                          {language === 'no' ? 'Legg til i kalender' : 'Add to calendar'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="mt-6 rounded-[28px] border border-[#E4DED5] bg-white p-4 shadow-[0_18px_40px_rgba(30,27,22,0.12)]">
              <MessagingPanel variant="light" />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-20">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 bg-neutral-100"
          style={{
            transform: `translateY(${typeof window !== 'undefined' ? window.scrollY * 0.15 : 0}px)`,
            transition: 'transform 0.05s linear',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-16">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm font-light text-neutral-600 hover:text-neutral-900 transition-all duration-300 mb-8"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {language === 'no' ? 'Tilbake' : 'Back'}
          </Link>

          <h1 className="text-5xl font-light tracking-tight text-neutral-900 mb-8">
            {language === 'no' ? 'Mine bestillinger' : 'My orders'}
          </h1>

          <div className="flex gap-4 border-b border-neutral-200 mb-8">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-3 px-6 py-4 font-light transition-all duration-300 relative ${
                activeTab === 'orders'
                  ? 'text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-900 hover:-translate-y-0.5'
              }`}
            >
              <Package className="w-5 h-5" />
              {language === 'no' ? 'Bestillinger' : 'Orders'}
              {activeTab === 'orders' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.3)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex items-center gap-3 px-6 py-4 font-light transition-all duration-300 relative ${
                activeTab === 'messages'
                  ? 'text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-900 hover:-translate-y-0.5'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              {language === 'no' ? 'Meldinger' : 'Messages'}
              {activeTab === 'messages' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.3)]" />
              )}
            </button>
          </div>
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
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {timelineSteps.map((step) => (
                          <div
                            key={step.key}
                            className={`rounded-xl border px-3 py-3 ${
                              step.completed
                                ? 'border-emerald-200 bg-emerald-50'
                                : 'border-neutral-200 bg-white'
                            }`}
                          >
                            <p className="text-xs font-semibold text-neutral-900">{step.label}</p>
                            <p className="mt-1 text-xs text-neutral-500">{step.date}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="max-w-4xl">
            <GlassCard className="p-6">
              <MessagingPanel />
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  )
}
