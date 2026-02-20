'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CheckCircle, Clock } from 'lucide-react'

export default function ChickenConfirmationPage() {
  const { lang } = useLanguage()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) { setLoading(false); return }

    // Poll for order status (Vipps callback may take a moment)
    let attempts = 0
    const maxAttempts = 10

    const checkOrder = async () => {
      try {
        const res = await fetch('/api/chickens/my-orders')
        if (res.ok) {
          const orders = await res.json()
          const found = orders.find((o: any) => o.id === orderId)
          if (found) {
            setOrder(found)
            if (found.status !== 'pending' || attempts >= maxAttempts) {
              setLoading(false)
              return
            }
          }
        }
      } catch {}

      attempts++
      if (attempts < maxAttempts) {
        setTimeout(checkOrder, 2000)
      } else {
        setLoading(false)
      }
    }

    checkOrder()
  }, [orderId])

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-500">{lang === 'en' ? 'No order found' : 'Ingen bestilling funnet'}</p>
      </div>
    )
  }

  const isPaid = order?.status === 'deposit_paid' || order?.status === 'fully_paid'

  return (
    <div className="min-h-screen bg-neutral-50 py-16">
      <div className="max-w-lg mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          {loading ? (
            <div className="space-y-4">
              <Clock className="w-12 h-12 text-amber-500 mx-auto animate-pulse" />
              <h1 className="text-2xl font-light text-neutral-900">
                {lang === 'en' ? 'Processing payment...' : 'Behandler betaling...'}
              </h1>
              <p className="text-neutral-500">
                {lang === 'en' ? 'Please wait while we confirm your payment.' : 'Vennligst vent mens vi bekrefter betalingen din.'}
              </p>
            </div>
          ) : isPaid ? (
            <div className="space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h1 className="text-2xl font-light text-neutral-900">
                {lang === 'en' ? 'Order Confirmed!' : 'Bestilling bekreftet!'}
              </h1>
              <p className="text-neutral-600">
                {lang === 'en' ? 'Your deposit has been received.' : 'Forskuddet ditt er mottatt.'}
              </p>
              {order && (
                <div className="bg-neutral-50 rounded-lg p-4 text-sm text-left space-y-2 mt-4">
                  <p><strong>{lang === 'en' ? 'Order' : 'Bestilling'}:</strong> {order.order_number}</p>
                  <p><strong>{lang === 'en' ? 'Breed' : 'Rase'}:</strong> {order.chicken_breeds?.name}</p>
                  <p><strong>{lang === 'en' ? 'Hens' : 'Honer'}:</strong> {order.quantity_hens}</p>
                  {order.quantity_roosters > 0 && (
                    <p><strong>{lang === 'en' ? 'Roosters' : 'Haner'}:</strong> {order.quantity_roosters}</p>
                  )}
                  <p><strong>{lang === 'en' ? 'Pickup week' : 'Hentingsuke'}:</strong> {lang === 'en' ? 'Week' : 'Uke'} {order.pickup_week}, {order.pickup_year}</p>
                  <p><strong>{lang === 'en' ? 'Total' : 'Totalt'}:</strong> kr {order.total_amount_nok}</p>
                  <p><strong>{lang === 'en' ? 'Deposit paid' : 'Forskudd betalt'}:</strong> kr {order.deposit_amount_nok}</p>
                  <p><strong>{lang === 'en' ? 'Remainder' : 'Restbetaling'}:</strong> kr {order.remainder_amount_nok}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Clock className="w-12 h-12 text-amber-500 mx-auto" />
              <h1 className="text-2xl font-light text-neutral-900">
                {lang === 'en' ? 'Payment Pending' : 'Betaling venter'}
              </h1>
              <p className="text-neutral-500">
                {lang === 'en'
                  ? 'Your payment is being processed. You will receive an email when confirmed.'
                  : 'Betalingen din behandles. Du far en e-post nar den er bekreftet.'
                }
              </p>
            </div>
          )}

          <div className="mt-8 flex gap-3 justify-center">
            <Link href="/kyllinger">
              <Button variant="outline">{lang === 'en' ? 'Back to chickens' : 'Tilbake til kyllinger'}</Button>
            </Link>
            <Link href="/min-side">
              <Button>{lang === 'en' ? 'My orders' : 'Mine bestillinger'}</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
