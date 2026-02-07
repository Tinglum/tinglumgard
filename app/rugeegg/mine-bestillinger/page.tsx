'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate, formatPrice } from '@/lib/eggs/utils'
import { GlassCard } from '@/components/eggs/GlassCard'

type EggOrder = {
  id: string
  order_number: string
  quantity: number
  total_amount: number
  deposit_amount: number
  remainder_amount: number
  remainder_due_date?: string | null
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

export default function EggOrdersPage() {
  const { lang: language } = useLanguage()
  const [orders, setOrders] = useState<EggOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUnauthorized, setIsUnauthorized] = useState(false)

  useEffect(() => {
    let isActive = true
    async function loadOrders() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/eggs/my-orders', { cache: 'no-store' })
        if (response.status === 401) {
          if (!isActive) return
          setIsUnauthorized(true)
          setOrders([])
          return
        }
        if (!response.ok) {
          throw new Error('Failed to fetch orders')
        }
        const data = await response.json()
        if (!isActive) return
        setOrders(data || [])
      } catch (err) {
        if (!isActive) return
        console.error('Failed to load egg orders', err)
        setError(language === 'no' ? 'Kunne ikke laste bestillinger.' : 'Failed to load orders.')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }
    loadOrders()
    return () => {
      isActive = false
    }
  }, [language])

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-semibold text-neutral-900 mb-2">
              {language === 'no' ? 'Mine bestillinger' : 'My orders'}
            </h1>
            <p className="text-neutral-600">
              {language === 'no'
                ? 'Oversikt over dine rugeegg-bestillinger.'
                : 'Overview of your egg orders.'}
            </p>
          </div>
          <Link href="/rugeegg/raser" className="text-sm text-neutral-600 hover:text-neutral-900">
            {language === 'no' ? 'Til raser' : 'Back to breeds'}
          </Link>
        </div>

        {isUnauthorized && (
          <GlassCard className="p-6 text-center">
            <p className="text-sm text-neutral-600 mb-4">
              {language === 'no'
                ? 'Logg inn med Vipps for Ã¥ se bestillingene dine.'
                : 'Log in with Vipps to view your orders.'}
            </p>
            <Link
              href="/api/auth/vipps/login?returnTo=/rugeegg/mine-bestillinger"
              className="btn-primary inline-flex justify-center"
            >
              {language === 'no' ? 'Logg inn' : 'Log in'}
            </Link>
          </GlassCard>
        )}

        {error && <div className="text-sm text-red-600">{error}</div>}

        {isLoading && (
          <div className="text-sm text-neutral-500">
            {language === 'no' ? 'Laster bestillingerâ€¦' : 'Loading ordersâ€¦'}
          </div>
        )}

        {!isLoading && !isUnauthorized && orders.length === 0 && (
          <GlassCard className="p-8 text-center">
            <p className="text-sm text-neutral-600">
              {language === 'no'
                ? 'Ingen bestillinger funnet ennÃ¥.'
                : 'No orders found yet.'}
            </p>
          </GlassCard>
        )}

        <div className="space-y-4">
          {orders.map((order) => {
            const remainderPaidOre =
              order.egg_payments?.reduce((sum, p) => {
                if (p.payment_type !== 'remainder' || p.status !== 'completed') return sum
                return sum + (p.amount_nok || 0) * 100
              }, 0) || 0

            const remainderDue = Math.max(0, order.remainder_amount - remainderPaidOre)
            const cutoff = new Date(order.delivery_monday)
            cutoff.setDate(cutoff.getDate() - 1)
            const today = new Date(new Date().toISOString().split('T')[0])
            const canEdit = today <= cutoff
            const isActiveOrder = !['cancelled', 'forfeited'].includes(order.status)

            return (
              <GlassCard key={order.id} className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">
                      {order.order_number}
                    </div>
                    <div className="text-lg font-display font-semibold text-neutral-900">
                      {order.egg_breeds?.name || (language === 'no' ? 'Rugeegg' : 'Eggs')}
                    </div>
                    <div className="text-sm text-neutral-600">
                      {language === 'no' ? 'Uke' : 'Week'} {order.week_number} Â·{' '}
                      {formatDate(new Date(order.delivery_monday), language)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-neutral-500">
                      {order.quantity} {language === 'no' ? 'egg' : 'eggs'}
                    </div>
                    <div className="text-lg font-semibold text-neutral-900">
                      {formatPrice(order.total_amount, language)}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {language === 'no' ? 'Forskudd' : 'Deposit'}:{' '}
                      {formatPrice(order.deposit_amount, language)}
                    </div>
                    {order.status === 'deposit_paid' && order.remainder_due_date && (
                      <div className="text-xs text-neutral-500">
                        {language === 'no' ? 'Restbetaling innen' : 'Remainder due'}:{' '}
                        {formatDate(new Date(order.remainder_due_date), language)}
                      </div>
                    )}
                    {remainderDue <= 0 && (
                      <div className="text-xs text-emerald-600">
                        {language === 'no' ? 'Restbetaling betalt' : 'Remainder paid'}
                      </div>
                    )}
                  </div>
                </div>

                {isActiveOrder && (remainderDue > 0 || canEdit) && (
                  <div className="mt-4 flex flex-wrap justify-end gap-3">
                    {canEdit && (
                      <Link
                        href={`/rugeegg/mine-bestillinger/${order.id}/betaling`}
                        className="btn-secondary"
                      >
                        {language === 'no' ? 'Legg til egg' : 'Add eggs'}
                      </Link>
                    )}
                    {remainderDue > 0 && (
                      <Link
                        href={`/rugeegg/mine-bestillinger/${order.id}/betaling`}
                        className="btn-primary"
                      >
                        {language === 'no' ? 'Betal rest' : 'Pay remainder'}
                      </Link>
                    )}
                  </div>
                )}
              </GlassCard>
            )
          })}
        </div>
      </div>
    </div>
  )
}
