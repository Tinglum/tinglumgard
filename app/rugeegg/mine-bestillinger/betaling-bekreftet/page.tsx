'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/eggs/GlassCard'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate, formatPrice } from '@/lib/eggs/utils'

type EggOrder = {
  id: string
  order_number: string
  quantity: number
  total_amount: number
  deposit_amount: number
  remainder_amount: number
  week_number: number
  delivery_monday: string
  status: string
  egg_breeds?: { name?: string } | null
  egg_payments?: Array<{
    payment_type: string
    status: string
    amount_nok?: number
  }>
}

export default function EggRemainderConfirmationPage() {
  const { lang: language } = useLanguage()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [order, setOrder] = useState<EggOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pollCount, setPollCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    async function loadOrder() {
      if (!orderId) {
        setIsLoading(false)
        return
      }
      try {
        const response = await fetch(`/api/eggs/orders/${orderId}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Order not found')
        }
        const data = await response.json()
        if (!isActive) return
        setOrder(data)
        setError(null)
      } catch (err) {
        if (!isActive) return
        setError(language === 'no' ? 'Fant ikke bestillingen.' : 'Order not found.')
        setOrder(null)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }
    loadOrder()
    return () => {
      isActive = false
    }
  }, [orderId, language, pollCount])

  const remainderPaidOre = useMemo(() => {
    return (
      order?.egg_payments?.reduce((sum, payment) => {
        if (payment.payment_type !== 'remainder' || payment.status !== 'completed') return sum
        return sum + (payment.amount_nok || 0) * 100
      }, 0) || 0
    )
  }, [order])

  const remainderDue = useMemo(() => {
    if (!order) return 0
    return Math.max(0, order.remainder_amount - remainderPaidOre)
  }, [order, remainderPaidOre])

  const isPaid = remainderDue <= 0 && !!order

  const cutoffDate = useMemo(() => {
    if (!order) return null
    const cutoff = new Date(order.delivery_monday)
    cutoff.setDate(cutoff.getDate() - 1)
    return cutoff
  }, [order])

  const canAdd = useMemo(() => {
    if (!cutoffDate) return false
    const today = new Date(new Date().toISOString().split('T')[0])
    return today <= cutoffDate
  }, [cutoffDate])

  useEffect(() => {
    if (!order || isPaid || pollCount >= 8) return
    const timer = setTimeout(() => setPollCount((count) => count + 1), 3000)
    return () => clearTimeout(timer)
  }, [order, isPaid, pollCount])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <GlassCard className="p-8 text-center max-w-lg">
          <h1 className="text-2xl font-display font-semibold text-neutral-900 mb-3">
            {language === 'no' ? 'Fant ingen ordre' : 'Order not found'}
          </h1>
          <p className="text-sm text-neutral-600 mb-6">{error}</p>
          <Link href="/rugeegg/mine-bestillinger" className="btn-primary inline-flex">
            {language === 'no' ? 'Til mine bestillinger' : 'Back to orders'}
          </Link>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl space-y-8">
        <div className="text-center space-y-3">
          <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {isPaid ? <CheckCircle2 className="w-7 h-7" /> : <Loader2 className="w-7 h-7 animate-spin" />}
          </div>
          <h1 className="text-4xl font-display font-semibold text-neutral-900">
            {isPaid
              ? (language === 'no' ? 'Betaling mottatt!' : 'Payment received!')
              : (language === 'no' ? 'Bekrefter betaling...' : 'Confirming payment...')}
          </h1>
          <p className="text-neutral-600">
            {isPaid
              ? (language === 'no' ? 'Restbetalingen er registrert.' : 'The remainder has been registered.')
              : (language === 'no' ? 'Dette kan ta et minutt. Siden oppdateres automatisk.' : 'This can take a minute. The page will refresh automatically.')}
          </p>
        </div>

        <GlassCard className="p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-neutral-900">
            {language === 'no' ? 'Oppsummering' : 'Summary'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-neutral-500">{language === 'no' ? 'Ordrenummer' : 'Order number'}</div>
              <div className="font-semibold text-neutral-900">{order.order_number}</div>
            </div>
            <div>
              <div className="text-neutral-500">{language === 'no' ? 'Rase' : 'Breed'}</div>
              <div className="font-semibold text-neutral-900">
                {order.egg_breeds?.name || (language === 'no' ? 'Rugeegg' : 'Eggs')}
              </div>
            </div>
            <div>
              <div className="text-neutral-500">{language === 'no' ? 'Uke' : 'Week'}</div>
              <div className="font-semibold text-neutral-900">{order.week_number}</div>
            </div>
            <div>
              <div className="text-neutral-500">{language === 'no' ? 'Leveringsdato' : 'Delivery date'}</div>
              <div className="font-semibold text-neutral-900">
                {formatDate(new Date(order.delivery_monday), language)}
              </div>
            </div>
            <div>
              <div className="text-neutral-500">{language === 'no' ? 'Antall egg' : 'Eggs'}</div>
              <div className="font-semibold text-neutral-900">{order.quantity}</div>
            </div>
            <div>
              <div className="text-neutral-500">{language === 'no' ? 'Totalt' : 'Total'}</div>
              <div className="font-semibold text-neutral-900">{formatPrice(order.total_amount, language)}</div>
            </div>
          </div>
        </GlassCard>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/rugeegg/mine-bestillinger" className="btn-secondary w-full sm:w-auto justify-center">
            {language === 'no' ? 'Til mine bestillinger' : 'Back to orders'}
          </Link>
          {canAdd && (
            <Link href={`/rugeegg/mine-bestillinger/${order.id}/betaling`} className="btn-primary w-full sm:w-auto justify-center">
              {language === 'no' ? 'Legg til egg' : 'Add eggs'}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
