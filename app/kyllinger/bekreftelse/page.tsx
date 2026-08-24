'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CheckCircle, Clock, RefreshCcw, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react'

export default function ChickenConfirmationPage() {
  const { t, lang } = useLanguage()
  const chickens = (t as any).chickens
  const commonCopy = chickens.common
  const confirmationCopy = chickens.confirmation
  const summaryCopy = chickens.orderSummary

  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const isPaymentDeferred = searchParams.get('payment_deferred') === 'true'
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [attempts, setAttempts] = useState(0)
  const [showCompletedState, setShowCompletedState] = useState(false)
  const [retrying, setRetrying] = useState(false)

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

    if (isPaymentDeferred) {
      fetch(`/api/chickens/orders/${orderId}/status`, { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(found => { if (found) setOrder(found) })
        .finally(() => setLoading(false))
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

          if (found.status !== 'pending' || found.manual_confirmation) {
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
  const isManual = Boolean(order?.manual_confirmation)
  const paymentAttempts = Number(order?.payment_attempts || 0)
  const isFailure = !loading && !isPaid && !isManual

  // Chickens are NOT auto-reserved on a failed Vipps payment. We no longer
  // auto-confirm the order manually; instead the failure state tells the
  // customer the chickens are not reserved and to complete payment (here or on
  // Min side). Reservation happens only when the deposit completes.

  useEffect(() => {
    if (!isPaid) {
      setShowCompletedState(false)
      return
    }
    setShowCompletedState(false)
    const timeoutId = setTimeout(() => setShowCompletedState(true), 2000)
    return () => clearTimeout(timeoutId)
  }, [isPaid])

  const handleRetry = async () => {
    if (!orderId) return
    setRetrying(true)
    try {
      const res = await fetch(`/api/chickens/orders/${orderId}/deposit`, { method: 'POST' })
      const data = res.ok ? await res.json() : null
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }
    } catch {
      // fall through — keep the page usable
    }
    setRetrying(false)
  }

  // Display state machine
  const displayState: 'pending' | 'completed' | 'manual_confirmed' | 'retry' | 'manual_pending' | 'failed' =
    isPaid && showCompletedState ? 'completed'
      : isManual ? 'manual_confirmed'
        : loading ? 'pending'
          : isPaid ? 'pending'
            : 'retry'

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-500">{confirmationCopy.noOrderFound}</p>
      </div>
    )
  }

  const orderRecap = order && (
    <div className="bg-neutral-50 rounded-lg p-4 text-sm text-left space-y-2 mt-4">
      <p><strong>{confirmationCopy.orderLabel}:</strong> {order.order_number}</p>
      <p><strong>{confirmationCopy.breedLabel}:</strong> {order.chicken_breeds?.name || confirmationCopy.unknownBreed}</p>
      <p><strong>{confirmationCopy.hensLabel}:</strong> {order.quantity_hens}</p>
      {order.quantity_roosters > 0 && (
        <p><strong>{confirmationCopy.roostersLabel}:</strong> {order.quantity_roosters}</p>
      )}
      <p><strong>{confirmationCopy.pickupWeekLabel}:</strong> {summaryCopy.week} {order.pickup_week}, {order.pickup_year}</p>
      <p><strong>{confirmationCopy.totalLabel}:</strong> {commonCopy.currency} {order.total_amount_nok}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-neutral-50 py-16">
      <div className="max-w-lg mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          {isPaymentDeferred && !isPaid && !isManual ? (
            <div className="space-y-4">
              <Clock className="w-12 h-12 text-blue-500 mx-auto" />
              <h1 className="text-2xl font-light text-neutral-900">
                {lang === 'no' ? 'Bestilling registrert' : 'Order registered'}
              </h1>
              <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 text-sm text-blue-800 text-left">
                <p className="font-semibold text-blue-900 mb-1">
                  {lang === 'no' ? 'Vipps er midlertidig utilgjengelig' : 'Vipps is temporarily unavailable'}
                </p>
                <p>
                  {lang === 'no'
                    ? 'Bestillingen din er registrert og reservert. Vipps-betaling er midlertidig nede, så depositum er ikke trukket ennå. Vi tar kontakt når betalingen kan gjennomføres.'
                    : 'Your order has been registered and reserved. Vipps payment is temporarily down, so the deposit has not been charged yet. We will contact you when payment can be processed.'}
                </p>
              </div>
              {orderRecap}
            </div>
          ) : displayState === 'pending' ? (
            <div className="space-y-4">
              <Clock className="w-12 h-12 text-amber-500 mx-auto animate-pulse" />
              <h1 className="text-2xl font-light text-neutral-900">{confirmationCopy.processingTitle}</h1>
              <p className="text-neutral-500">{loading ? confirmationCopy.processingBody : confirmationCopy.pendingBody}</p>
              {!loading && (
                <p className="text-xs text-neutral-400">
                  {formatCopy(confirmationCopy.statusChecks, { count: attempts })}
                </p>
              )}
            </div>
          ) : displayState === 'completed' ? (
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
          ) : displayState === 'manual_confirmed' ? (
            <div className="space-y-4">
              <ShieldCheck className="w-16 h-16 text-green-600 mx-auto" />
              <h1 className="text-2xl font-light text-neutral-900">
                {lang === 'no' ? 'Bestillingen er bekreftet' : 'Your order is confirmed'}
              </h1>
              <div className="bg-green-50 border border-green-300 rounded-lg p-4 text-sm text-green-900 text-left">
                <p>
                  {lang === 'no'
                    ? 'Vipps-betalingen gikk dessverre ikke gjennom, men vi har lagt inn bestillingen din manuelt — den er bekreftet og reservert. Betalingen er ikke trukket ennå; vi tar kontakt for å avtale betaling, eller du kan ordne det ved henting. Du trenger ikke gjøre noe nå.'
                    : 'The Vipps payment did not go through, but we have entered your order manually — it is confirmed and reserved. No payment has been charged yet; we will be in touch to arrange payment, or you can settle it at pickup. Nothing is required from you right now.'}
                </p>
              </div>
              {orderRecap}
            </div>
          ) : displayState === 'retry' ? (
            <div className="space-y-4">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
              <h1 className="text-2xl font-light text-neutral-900">
                {lang === 'no' ? 'Vipps-betalingen gikk ikke gjennom' : 'Vipps payment did not go through'}
              </h1>
              <p className="text-neutral-600">
                {lang === 'no'
                  ? 'Vipps-betalingen gikk ikke gjennom, så kyllingene er ikke reservert ennå. Fullfør betalingen for å reservere dem – ellers kan du gjøre det når som helst fra Min side.'
                  : 'The Vipps payment did not go through, so the chickens are not reserved yet. Complete the payment to reserve them – or you can do it any time from Min side.'}
              </p>
              <Button onClick={handleRetry} disabled={retrying} className="inline-flex items-center gap-2">
                <RefreshCcw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
                {retrying
                  ? (lang === 'no' ? 'Åpner Vipps…' : 'Opening Vipps…')
                  : (lang === 'no' ? 'Betal og reserver kyllingene' : 'Pay and reserve the chickens')}
              </Button>
              {orderRecap}
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
