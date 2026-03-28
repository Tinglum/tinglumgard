'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { GlassCard } from '@/components/eggs/GlassCard'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCart } from '@/contexts/eggs/EggCartContext'
import { useOrder } from '@/contexts/eggs/EggOrderContext'
import { formatDate, formatPrice } from '@/lib/eggs/utils'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'

type EggPaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

type EggOrder = {
  id: string
  order_number: string
  status: string
  breed_name?: string
  breed_id: string
  week_number: number
  delivery_monday: string
  quantity: number
  deposit_amount: number
  egg_payments?: Array<{
    payment_type: string
    status: EggPaymentStatus
    paid_at?: string | null
  }>
  egg_breeds?: { name?: string } | null
}

export default function EggConfirmationPage() {
  const { lang: language, t } = useLanguage()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const { clearCart } = useCart()
  const { clearDraft } = useOrder()
  const [order, setOrder] = useState<EggOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<EggPaymentStatus>('pending')
  const [pollCount, setPollCount] = useState(0)
  const confirmation = t.eggs.confirmation
  const orderNotFoundError = t.eggs.errors.orderNotFound

  useEffect(() => {
    if (!orderId) return
    clearCart()
    clearDraft()
  }, [orderId, clearCart, clearDraft])

  useEffect(() => {
    let isActive = true
    async function loadOrder() {
      if (!orderId) {
        setIsLoading(false)
        return
      }
      try {
        const response = await fetch(`/api/eggs/my-orders/${orderId}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(orderNotFoundError)
        }
        const data = await response.json()
        if (!isActive) return
        setOrder(data)
        const depositPayment = data?.egg_payments?.find((payment: any) => payment.payment_type === 'deposit')
        if (depositPayment?.status) {
          setPaymentStatus(depositPayment.status as EggPaymentStatus)
        }
      } catch (error) {
        if (!isActive) return
        setOrder(null)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }
    loadOrder()
    return () => {
      isActive = false
    }
  }, [orderId, orderNotFoundError])

  useEffect(() => {
    if (!orderId || paymentStatus === 'completed' || pollCount >= 10) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/eggs/my-orders/${orderId}`, { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        const depositPayment = data?.egg_payments?.find((payment: any) => payment.payment_type === 'deposit')
        if (depositPayment?.status) {
          setPaymentStatus(depositPayment.status as EggPaymentStatus)
        }
        if (depositPayment?.status === 'completed') {
          setOrder(data)
        }
      } catch (error) {
        // Keep polling best-effort if transient fetch errors happen.
      }
      setPollCount((value) => value + 1)
    }, 3000)

    return () => clearInterval(interval)
  }, [orderId, paymentStatus, pollCount])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-neutral-500">{t.eggs.common.loading}</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <GlassCard className="p-8 text-center max-w-lg">
          <h1 className="text-2xl font-normal text-neutral-900 mb-3">{confirmation.orderNotFoundTitle}</h1>
          <p className="text-sm text-neutral-600 mb-6">{confirmation.orderNotFoundDescription}</p>
          <Link href="/rugeegg/raser" className="btn-primary inline-flex">
            {t.eggs.common.backToBreeds}
          </Link>
        </GlassCard>
      </div>
    )
  }

  const statusTitle =
    paymentStatus === 'completed'
      ? confirmation.titleCompleted
      : paymentStatus === 'failed'
        ? confirmation.titleFailed
        : confirmation.titlePending

  const statusLead =
    paymentStatus === 'completed'
      ? confirmation.leadCompleted
      : paymentStatus === 'failed'
        ? confirmation.leadFailed
        : confirmation.leadPending

  const StatusIcon = paymentStatus === 'completed' ? CheckCircle2 : paymentStatus === 'failed' ? XCircle : Clock3

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-neutral-50 text-neutral-900 border border-neutral-200 flex items-center justify-center">
            <StatusIcon className="w-7 h-7" />
          </div>
          <h1 className="text-4xl font-normal text-neutral-900">{statusTitle}</h1>
          <p className="text-neutral-600">{statusLead}</p>
          <p className="text-sm text-neutral-500">{t.eggs.payment.nonRefundableNote}</p>
        </div>

        <GlassCard className="p-6 space-y-4">
          <h2 className="text-lg font-normal text-neutral-900">{t.eggs.common.summary}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-neutral-500">{t.eggs.common.orderNumber}</div>
              <div className="font-normal text-neutral-900">{order.order_number}</div>
            </div>
            <div>
              <div className="text-neutral-500">{t.eggs.common.breed}</div>
              <div className="font-normal text-neutral-900">
                {order.egg_breeds?.name || order.breed_name || t.eggs.common.fallbackBreed}
              </div>
            </div>
            <div>
              <div className="text-neutral-500">{t.eggs.common.week}</div>
              <div className="font-normal text-neutral-900">{order.week_number}</div>
            </div>
            <div>
              <div className="text-neutral-500">{t.eggs.common.shippingDate}</div>
              <div className="font-normal text-neutral-900">
                {formatDate(new Date(order.delivery_monday), language)}
              </div>
            </div>
            <div>
              <div className="text-neutral-500">{t.eggs.common.totalEggs}</div>
              <div className="font-normal text-neutral-900">{order.quantity}</div>
            </div>
            <div>
              <div className="text-neutral-500">{t.eggs.common.deposit}</div>
              <div className="font-normal text-neutral-900">
                {formatPrice(order.deposit_amount, language)}
              </div>
            </div>
          </div>
        </GlassCard>

        {paymentStatus !== 'completed' && (
          <GlassCard className="p-5 text-sm text-neutral-700">
            {paymentStatus === 'failed' ? confirmation.failedHelp : confirmation.pendingHelp}
          </GlassCard>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/rugeegg/raser" className="btn-secondary w-full sm:w-auto justify-center">
            {t.eggs.common.backToBreeds}
          </Link>
          <Link href="/rugeegg/mine-bestillinger" className="btn-primary w-full sm:w-auto justify-center">
            {confirmation.goToMyOrders}
          </Link>
        </div>
      </div>
    </div>
  )
}
