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
  const { lang: language, t } = useLanguage()
  const { currentDraft } = useOrder()
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copy = t.eggs.payment

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
        <div className="text-sm text-neutral-500">{t.eggs.common.loading}</div>
      </div>
    )
  }

  const totalEggs = currentDraft.items.reduce((sum, item) => sum + item.quantity, 0)
  const shippingAddress = currentDraft.shippingAddress || ''
  const shippingPostalCode = currentDraft.shippingPostalCode || ''
  const shippingCity = currentDraft.shippingCity || ''
  const shippingCountry = currentDraft.shippingCountry || ''
  const requiresShipping = currentDraft.deliveryMethod === 'posten'
  const shippingComplete = !requiresShipping || (
    shippingAddress.trim() &&
    shippingPostalCode.trim() &&
    shippingCity.trim() &&
    shippingCountry.trim()
  )

  const handlePayment = async () => {
    if (!shippingComplete) {
      setError(t.eggs.errors.shippingAddressMissing)
      return
    }

    setIsPaying(true)
    setError(null)
    try {
      const orderDetails = {
        productType: 'eggs',
        items: currentDraft.items.map((item) => ({
          breedId: item.breed.id,
          inventoryId: item.week.id,
          quantity: item.quantity,
        })),
        deliveryMethod: currentDraft.deliveryMethod,
        shippingAddress: requiresShipping ? shippingAddress : undefined,
        shippingPostalCode: requiresShipping ? shippingPostalCode : undefined,
        shippingCity: requiresShipping ? shippingCity : undefined,
        shippingCountry: requiresShipping ? shippingCountry : undefined,
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
        throw new Error(result.error || t.eggs.errors.vippsLoginFailed)
      }

      window.location.href = result.authUrl
    } catch (paymentError) {
      setIsPaying(false)
      console.error('Payment error', paymentError)
      setError(t.eggs.errors.vippsLoginFailed)
    }
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-normal text-neutral-900 mb-2">{copy.title}</h1>
            <p className="text-neutral-600">
              {currentDraft.isFullPayment ? copy.subtitleFullPayment : copy.subtitleDeposit}
            </p>
          </div>
          <Link href="/rugeegg/bestill/levering" className="text-sm text-neutral-600 hover:text-neutral-900">
            {t.eggs.common.backToShipment}
          </Link>
        </div>

        {error && <GlassCard className="p-4 text-sm text-red-600">{error}</GlassCard>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-normal text-neutral-900">
                    {currentDraft.isFullPayment ? copy.fullPaymentTitle : copy.depositTitle}
                  </h2>
                  <p className="text-sm text-neutral-600">
                    {currentDraft.isFullPayment ? copy.fullPaymentDescription : copy.depositDescription}
                  </p>
                  <p className="text-xs text-neutral-500 mt-2">{copy.nonRefundableNote}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
                <span className="text-sm text-neutral-600">
                  {currentDraft.isFullPayment ? copy.dueNow : copy.depositDue}
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
                  <h3 className="text-base font-normal text-neutral-900">{copy.securePaymentTitle}</h3>
                  <p className="text-sm text-neutral-600">{copy.securePaymentDescription}</p>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-1">
            <div>
              <GlassCard className="p-6 space-y-5">
                <h2 className="text-lg font-normal text-neutral-900">{copy.orderTitle}</h2>
                <div className="space-y-2 text-sm text-neutral-600">
                  <div className="flex justify-between">
                    <span>{t.eggs.common.totalEggs}</span>
                    <span className="font-normal text-neutral-900">{totalEggs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.eggs.common.week}</span>
                    <span className="font-normal text-neutral-900">
                      {currentDraft.deliveryWeek.weekNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.eggs.common.shipment}</span>
                    <span className="font-normal text-neutral-900">
                      {formatDate(currentDraft.deliveryWeek.deliveryMonday, language)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <span>{t.eggs.common.subtotal}</span>
                    <span className="font-normal text-neutral-900">
                      {formatPrice(currentDraft.subtotal, language)}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>{copy.packingAndShipment}</span>
                    <span className="font-normal text-neutral-900">
                      {formatPrice(currentDraft.deliveryFee, language)}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-900 text-base">
                    <span>{t.eggs.common.total}</span>
                    <span className="font-normal">{formatPrice(currentDraft.totalAmount, language)}</span>
                  </div>
                  <div className="flex justify-between text-blue-700 text-sm font-medium pt-1">
                    <span>{copy.dueNowSummary}</span>
                    <span>{formatPrice(currentDraft.depositAmount, language)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={isPaying}
                  className="w-full px-6 py-4 bg-[#FF5B24] text-white rounded-xl text-sm font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:bg-[#E6501F] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex items-center justify-center gap-2"
                >
                  {t.eggs.common.payWithVipps}
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
