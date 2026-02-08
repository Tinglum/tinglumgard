'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/eggs/GlassCard'
import { useLanguage } from '@/contexts/LanguageContext'
import { useOrder } from '@/contexts/eggs/EggOrderContext'
import { formatDate, formatPrice } from '@/lib/eggs/utils'
import { ArrowRight, CreditCard, ShieldCheck } from 'lucide-react'

export default function EggPaymentPage() {
  const router = useRouter()
  const { lang: language } = useLanguage()
  const { currentDraft } = useOrder()
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentDraft) {
      router.replace('/rugeegg/handlekurv')
      return
    }
    if (!currentDraft.deliveryMethod) {
      router.replace('/rugeegg/bestill/levering')
    }
  }, [currentDraft, router])

  if (!currentDraft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-neutral-500">Laster...</div>
      </div>
    )
  }

  const handlePayment = async () => {
    setIsPaying(true)
    setError(null)
    try {
      const orderDetails = {
        productType: 'eggs',
        breedId: currentDraft.breed.id,
        inventoryId: currentDraft.week.id,
        quantity: currentDraft.quantity,
        deliveryMethod: currentDraft.deliveryMethod,
        notes: '',
      }

      const response = await fetch('/api/auth/vipps/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderDetails }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Vipps login failed')
      }

      window.location.href = result.authUrl
    } catch (error) {
      setIsPaying(false)
      console.error('Payment error', error)
      setError(
        language === 'no'
          ? 'Kunne ikke starte Vipps-innlogging. Prøv igjen.'
          : 'Failed to start Vipps login. Please try again.'
      )
    }
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-normal text-neutral-900 mb-2">
              {language === 'no' ? 'Betaling' : 'Payment'}
            </h1>
            <p className="text-neutral-600">
              {language === 'no'
                ? 'Betal forskuddet for å bekrefte bestillingen.'
                : 'Pay the deposit to confirm your order.'}
            </p>
          </div>
          <Link href="/rugeegg/bestill/levering" className="text-sm text-neutral-600 hover:text-neutral-900">
            {language === 'no' ? 'Tilbake til levering' : 'Back to delivery'}
          </Link>
        </div>

        {error && (
          <GlassCard className="p-4 text-sm text-red-600">
            {error}
          </GlassCard>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-normal text-neutral-900">
                    {language === 'no' ? 'Forskudd' : 'Deposit'}
                  </h2>
                  <p className="text-sm text-neutral-600">
                    {language === 'no'
                      ? 'Du betaler 50% nå, resten før levering.'
                      : 'You pay 50% now, the rest before delivery.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
                <span className="text-sm text-neutral-600">
                  {language === 'no' ? 'Forskudd å betale' : 'Deposit due'}
                </span>
                <span className="text-2xl font-normal text-neutral-900">
                  {formatPrice(currentDraft.depositAmount, language)}
                </span>
              </div>
            </GlassCard>

            <GlassCard className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-50 text-neutral-900 border border-neutral-200 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-normal text-neutral-900">
                    {language === 'no' ? 'Trygg betaling' : 'Secure payment'}
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {language === 'no'
                      ? 'Vi bruker Vipps for raske og sikre betalinger.'
                      : 'We use Vipps for fast and secure payments.'}
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-1">
            <div>
              <GlassCard className="p-6 space-y-5">
                <h2 className="text-lg font-normal text-neutral-900">
                  {language === 'no' ? 'Bestilling' : 'Order'}
                </h2>
                <div className="space-y-2 text-sm text-neutral-600">
                  <div className="flex justify-between">
                    <span>{language === 'no' ? 'Rase' : 'Breed'}</span>
                    <span className="font-normal text-neutral-900">{currentDraft.breed.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'no' ? 'Uke' : 'Week'}</span>
                    <span className="font-normal text-neutral-900">
                      {currentDraft.week.weekNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'no' ? 'Levering' : 'Delivery'}</span>
                    <span className="font-normal text-neutral-900">
                      {formatDate(currentDraft.week.deliveryMonday, language)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <span>{language === 'no' ? 'Subtotal' : 'Subtotal'}</span>
                    <span className="font-normal text-neutral-900">
                      {formatPrice(currentDraft.subtotal, language)}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>{language === 'no' ? 'Levering' : 'Delivery'}</span>
                    <span className="font-normal text-neutral-900">
                      {formatPrice(currentDraft.deliveryFee, language)}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-900 text-base">
                    <span>{language === 'no' ? 'Totalt' : 'Total'}</span>
                    <span className="font-normal">{formatPrice(currentDraft.totalAmount, language)}</span>
                  </div>
                </div>

                <button type="button" onClick={handlePayment} disabled={isPaying} className="btn-primary w-full">
                  {language === 'no' ? 'Betal med Vipps' : 'Pay with Vipps'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


