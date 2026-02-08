'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/eggs/GlassCard'
import { useLanguage } from '@/contexts/LanguageContext'
import { useOrder } from '@/contexts/eggs/EggOrderContext'
import { formatDate, formatPrice } from '@/lib/eggs/utils'
import { ArrowRight, Truck, MapPin, Store } from 'lucide-react'

const deliveryOptions = [
  {
    id: 'farm_pickup' as const,
    icon: Store,
    titleNo: 'Henting på gården',
    titleEn: 'Farm pickup',
    descriptionNo: 'Hent på Tinglum gård etter avtale.',
    descriptionEn: 'Pick up at Tinglum farm by appointment.',
    fee: 0,
  },
  {
    id: 'e6_pickup' as const,
    icon: MapPin,
    titleNo: 'E6 møtepunkt',
    titleEn: 'E6 pickup point',
    descriptionNo: 'Avhenting ved avtalt møtepunkt langs E6.',
    descriptionEn: 'Pickup at an agreed E6 meeting point.',
    fee: 20000,
  },
  {
    id: 'posten' as const,
    icon: Truck,
    titleNo: 'Posten levering',
    titleEn: 'Posten delivery',
    descriptionNo: 'Sendes trygt med Posten til nærmeste hentested.',
    descriptionEn: 'Delivered with Posten to your nearest pickup point.',
    fee: 30000,
  },
]

export default function EggDeliveryPage() {
  const router = useRouter()
  const { lang: language } = useLanguage()
  const { currentDraft, setDeliveryMethod } = useOrder()

  useEffect(() => {
    if (!currentDraft) {
      router.replace('/rugeegg/handlekurv')
    }
  }, [currentDraft, router])

  if (!currentDraft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-neutral-500">Laster…</div>
      </div>
    )
  }

  const selectedMethod = currentDraft.deliveryMethod
  const summaryRows = [
    {
      label: language === 'no' ? 'Rase' : 'Breed',
      value: currentDraft.breed.name,
    },
    {
      label: language === 'no' ? 'Uke' : 'Week',
      value: `${currentDraft.week.weekNumber} · ${formatDate(currentDraft.week.deliveryMonday, language)}`,
    },
    {
      label: language === 'no' ? 'Antall egg' : 'Eggs',
      value: String(currentDraft.quantity),
    },
  ]

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-normal text-neutral-900 mb-2">
              {language === 'no' ? 'Levering' : 'Delivery'}
            </h1>
            <p className="text-neutral-600">
              {language === 'no'
                ? 'Velg hvordan du vil motta rugeeggene.'
                : 'Choose how you want the eggs delivered.'}
            </p>
          </div>
          <Link href="/rugeegg/handlekurv" className="text-sm text-neutral-600 hover:text-neutral-900">
            {language === 'no' ? 'Tilbake til handlekurv' : 'Back to cart'}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {deliveryOptions.map((option) => {
              const disabled = option.id === 'e6_pickup' && !currentDraft.week.e6PickupAvailable
              const active = selectedMethod === option.id
              const Icon = option.icon

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setDeliveryMethod(option.id)}
                  className={`w-full text-left rounded-xl border px-6 py-5 transition-all ${
                    active
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-400'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        active ? 'bg-white/10' : 'bg-neutral-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-normal">
                          {language === 'no' ? option.titleNo : option.titleEn}
                        </h3>
                        <span className="text-sm font-normal">
                          {option.fee === 0
                            ? language === 'no'
                              ? 'Gratis'
                              : 'Free'
                            : formatPrice(option.fee, language)}
                        </span>
                      </div>
                      <p className={`text-sm ${active ? 'text-white/80' : 'text-neutral-600'}`}>
                        {language === 'no' ? option.descriptionNo : option.descriptionEn}
                      </p>
                      {disabled && (
                        <p className="text-xs text-neutral-500 mt-2">
                          {language === 'no' ? 'Ikke tilgjengelig denne uken.' : 'Not available this week.'}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="lg:col-span-1">
            <div>
              <GlassCard className="p-6 space-y-5">
                <h2 className="text-lg font-normal text-neutral-900">
                  {language === 'no' ? 'Sammendrag' : 'Summary'}
                </h2>

                <div className="space-y-3 text-sm">
                  {summaryRows.map((row) => (
                    <div key={row.label} className="flex justify-between text-neutral-600">
                      <span>{row.label}</span>
                      <span className="font-normal text-neutral-900">{row.value}</span>
                    </div>
                  ))}
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

                <button
                  type="button"
                  onClick={() => router.push('/rugeegg/bestill/betaling')}
                  disabled={!selectedMethod}
                  className="btn-primary w-full"
                >
                  {language === 'no' ? 'Fortsett til betaling' : 'Continue to payment'}
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
