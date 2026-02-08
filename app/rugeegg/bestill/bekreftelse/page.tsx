'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { GlassCard } from '@/components/eggs/GlassCard'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate, formatPrice } from '@/lib/eggs/utils'
import { CheckCircle2 } from 'lucide-react'

type EggOrder = {
  id: string
  order_number: string
  breed_name?: string
  breed_id: string
  week_number: number
  delivery_monday: string
  quantity: number
  deposit_amount: number
  egg_breeds?: { name?: string } | null
}

export default function EggConfirmationPage() {
  const { lang: language } = useLanguage()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [order, setOrder] = useState<EggOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
          throw new Error('Order not found')
        }
        const data = await response.json()
        if (!isActive) return
        setOrder(data)
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
  }, [orderId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-neutral-500">Laster...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <GlassCard className="p-8 text-center max-w-lg">
          <h1 className="text-2xl font-normal text-neutral-900 mb-3">
            {language === 'no' ? 'Fant ingen ordre' : 'Order not found'}
          </h1>
          <p className="text-sm text-neutral-600 mb-6">
            {language === 'no'
              ? 'Bestillingen ble ikke funnet.'
              : 'We could not find your order.'}
          </p>
          <Link href="/rugeegg/raser" className="btn-primary inline-flex">
            {language === 'no' ? 'Tilbake til raser' : 'Back to breeds'}
          </Link>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-neutral-50 text-neutral-900 border border-neutral-200 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="text-4xl font-normal text-neutral-900">
            {language === 'no' ? 'Bestilling mottatt!' : 'Order confirmed!'}
          </h1>
          <p className="text-neutral-600">
            {language === 'no'
              ? 'Vi har registrert forskuddsbetalingen.'
              : 'We have registered your deposit.'}
          </p>
          <p className="text-sm text-neutral-500">
            {language === 'no'
              ? 'Forskuddet refunderes ikke. Vi jobber med levende dyr, og bestillingen setter i gang produksjonsplanlegging.'
              : 'The deposit is non-refundable. We work with live animals, and the order starts production planning.'}
          </p>
        </div>

        <GlassCard className="p-6 space-y-4">
          <h2 className="text-lg font-normal text-neutral-900">
            {language === 'no' ? 'Oppsummering' : 'Summary'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-neutral-500">{language === 'no' ? 'Ordrenummer' : 'Order number'}</div>
              <div className="font-normal text-neutral-900">{order.order_number}</div>
            </div>
            <div>
              <div className="text-neutral-500">{language === 'no' ? 'Rase' : 'Breed'}</div>
              <div className="font-normal text-neutral-900">
                {order.egg_breeds?.name || order.breed_name || ''}
              </div>
            </div>
            <div>
              <div className="text-neutral-500">{language === 'no' ? 'Uke' : 'Week'}</div>
              <div className="font-normal text-neutral-900">{order.week_number}</div>
            </div>
            <div>
              <div className="text-neutral-500">{language === 'no' ? 'Sendingsdato' : 'Shipping date'}</div>
              <div className="font-normal text-neutral-900">
                {formatDate(new Date(order.delivery_monday), language)}
              </div>
            </div>
            <div>
              <div className="text-neutral-500">{language === 'no' ? 'Antall egg' : 'Eggs'}</div>
              <div className="font-normal text-neutral-900">{order.quantity}</div>
            </div>
            <div>
              <div className="text-neutral-500">{language === 'no' ? 'Forskudd betalt' : 'Deposit paid'}</div>
              <div className="font-normal text-neutral-900">
                {formatPrice(order.deposit_amount, language)}
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/rugeegg/raser" className="btn-secondary w-full sm:w-auto justify-center">
            {language === 'no' ? 'Tilbake til raser' : 'Back to breeds'}
          </Link>
          <Link href="/rugeegg/mine-bestillinger" className="btn-primary w-full sm:w-auto justify-center">
            {language === 'no' ? 'Til mine bestillinger' : 'Go to my orders'}
          </Link>
        </div>
      </div>
    </div>
  )
}


