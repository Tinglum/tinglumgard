'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { GlassCard } from '@/components/eggs/GlassCard'
import { useLanguage } from '@/contexts/LanguageContext'
import { AlertCircle } from 'lucide-react'

export default function EggCheckoutPage() {
  const searchParams = useSearchParams()
  const { lang } = useLanguage()
  const error = searchParams.get('error')
  const orderId = searchParams.get('orderId')

  const isPaymentFailed = error === 'payment_failed'
  const isOrderFailed = error === 'order_creation_failed'

  const title = lang === 'no'
    ? isPaymentFailed ? 'Betalingen feilet' : isOrderFailed ? 'Kunne ikke opprette bestilling' : 'Noe gikk galt'
    : isPaymentFailed ? 'Payment failed' : isOrderFailed ? 'Could not create order' : 'Something went wrong'

  const message = lang === 'no'
    ? isPaymentFailed
      ? 'Vi kunne ikke starte betalingen. Bestillingen din er opprettet — du kan prøve å betale på nytt.'
      : isOrderFailed
        ? 'Det oppstod en feil under oppretting av bestillingen. Vennligst prøv igjen.'
        : 'Det oppstod en uventet feil. Vennligst prøv igjen.'
    : isPaymentFailed
      ? 'We could not start the payment. Your order has been created — you can retry payment.'
      : isOrderFailed
        ? 'An error occurred while creating the order. Please try again.'
        : 'An unexpected error occurred. Please try again.'

  return (
    <main className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-4 py-16">
      <GlassCard className="max-w-md w-full text-center space-y-6 p-8">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
        <p className="text-neutral-600">{message}</p>
        <div className="flex flex-col gap-3 pt-2">
          {isPaymentFailed && orderId && (
            <Link
              href={`/rugeegg/mine-bestillinger/${orderId}/betaling`}
              className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
            >
              {lang === 'no' ? 'Prøv betaling på nytt' : 'Retry payment'}
            </Link>
          )}
          <Link
            href="/min-side"
            className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            {lang === 'no' ? 'Mine bestillinger' : 'My orders'}
          </Link>
          <Link
            href="/rugeegg"
            className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            {lang === 'no' ? 'Tilbake til rugeegg' : 'Back to hatching eggs'}
          </Link>
        </div>
      </GlassCard>
    </main>
  )
}
