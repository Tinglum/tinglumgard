'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CheckCircle, Clock, RefreshCcw, XCircle } from 'lucide-react'

export default function ChickenConfirmationPage() {
  const { t } = useLanguage()
  const chickens = (t as any).chickens
  const commonCopy = chickens.common
  const confirmationCopy = chickens.confirmation
  const summaryCopy = chickens.orderSummary

  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [attempts, setAttempts] = useState(0)
  const [showCompletedState, setShowCompletedState] = useState(false)

  const formatCopy = (template: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce(
      (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
      template
    )

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }

    let cancelled = false
    const maxAttempts = 30

    const checkOrder = async () => {
      if (cancelled) return

      try {
        const res = await fetch(`/api/chickens/orders/${orderId}/status`, { cache: 'no-store' })
        if (res.ok) {
          const found = await res.json()
          setOrder(found)

          if (found.status !== 'pending') {
            setLoading(false)
            return
          }
        }
      } catch {
        // Ignore transient polling errors.
      }

      setAttempts((prev) => {
        const next = prev + 1
        if (next >= maxAttempts) {
          setLoading(false)
        } else {
          setTimeout(checkOrder, 2000)
        }
        return next
      })
    }

    checkOrder()

    return () => {
      cancelled = true
    }
  }, [orderId])

  const isPaid = order?.status === 'deposit_paid' || order?.status === 'fully_paid'
  const rawPaymentState = order?.status === 'cancelled' ? 'failed' : isPaid ? 'completed' : 'pending'

  useEffect(() => {
    if (rawPaymentState !== 'completed') {
      setShowCompletedState(false)
      return
    }

    setShowCompletedState(false)
    const timeoutId = setTimeout(() => setShowCompletedState(true), 2000)
    return () => clearTimeout(timeoutId)
  }, [rawPaymentState])

  const displayPaymentState =
    rawPaymentState === 'completed' && showCompletedState
      ? 'completed'
      : rawPaymentState === 'failed'
        ? 'failed'
        : 'pending'

  const handleManualRefresh = async () => {
    if (!orderId) return

    setLoading(true)
    try {
      const res = await fetch(`/api/chickens/orders/${orderId}/status`, { cache: 'no-store' })
      if (res.ok) {
        const found = await res.json()
        setOrder(found)
      }
    } catch {
      // Ignore manual refresh errors and keep page responsive.
    } finally {
      // Never leave user on infinite spinner after manual refresh.
      setLoading(false)
    }
  }

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-500">{confirmationCopy.noOrderFound}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-16">
      <div className="max-w-lg mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          {displayPaymentState === 'pending' ? (
            <div className="space-y-4">
              <Clock className="w-12 h-12 text-amber-500 mx-auto animate-pulse" />
              <h1 className="text-2xl font-light text-neutral-900">{confirmationCopy.processingTitle}</h1>
              <p className="text-neutral-500">{loading ? confirmationCopy.processingBody : confirmationCopy.pendingBody}</p>
              {!loading && (
                <>
                  <p className="text-xs text-neutral-400">
                    {formatCopy(confirmationCopy.statusChecks, { count: attempts })}
                  </p>
                  <Button variant="outline" onClick={handleManualRefresh} className="inline-flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    {confirmationCopy.checkAgain}
                  </Button>
                </>
              )}
            </div>
          ) : displayPaymentState === 'completed' ? (
            <div className="space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h1 className="text-2xl font-light text-neutral-900">{confirmationCopy.confirmedTitle}</h1>
              <p className="text-neutral-600">{confirmationCopy.depositReceived}</p>
              {order && (
                <div className="bg-neutral-50 rounded-lg p-4 text-sm text-left space-y-2 mt-4">
                  <p><strong>{confirmationCopy.orderLabel}:</strong> {order.order_number}</p>
                  <p><strong>{confirmationCopy.breedLabel}:</strong> {order.chicken_breeds?.name || confirmationCopy.unknownBreed}</p>
                  <p><strong>{confirmationCopy.hensLabel}:</strong> {order.quantity_hens}</p>
                  {order.quantity_roosters > 0 && (
                    <p><strong>{confirmationCopy.roostersLabel}:</strong> {order.quantity_roosters}</p>
                  )}
                  <p><strong>{confirmationCopy.pickupWeekLabel}:</strong> {summaryCopy.week} {order.pickup_week}, {order.pickup_year}</p>
                  <p><strong>{confirmationCopy.totalLabel}:</strong> {commonCopy.currency} {order.total_amount_nok}</p>
                  <p><strong>{confirmationCopy.depositPaidLabel}:</strong> {commonCopy.currency} {order.deposit_amount_nok}</p>
                  <p><strong>{confirmationCopy.remainderLabel}:</strong> {commonCopy.currency} {order.remainder_amount_nok}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <XCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h1 className="text-2xl font-light text-neutral-900">{confirmationCopy.failedTitle}</h1>
              <p className="text-neutral-500">{confirmationCopy.failedBody}</p>
            </div>
          )}

          <div className="mt-8 flex gap-3 justify-center">
            <Link href="/kyllinger">
              <Button variant="outline">{confirmationCopy.backToChickens}</Button>
            </Link>
            <Link href="/min-side">
              <Button>{confirmationCopy.myOrders}</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
