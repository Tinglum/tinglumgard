'use client'

import { useLanguage } from '@/contexts/LanguageContext'

interface SummaryProps {
  breedName: string
  accentColor: string
  weekNumber: number
  year: number
  ageWeeks: number
  quantityHens: number
  quantityRoosters: number
  pricePerHen: number
  pricePerRooster: number
  subtotal: number
  deliveryFee: number
  total: number
  deposit: number
  remainder: number
  maxAvailableHens: number
  remainingHens: number
}

export function ChickenOrderSummary(props: SummaryProps) {
  const { lang } = useLanguage()

  return (
    <div className="bg-neutral-50 rounded-xl p-5 space-y-3">
      <h4 className="font-medium text-neutral-900">
        {lang === 'en' ? 'Order Summary' : 'Bestillingssammendrag'}
      </h4>

      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: props.accentColor }} />
        <span className="font-medium">{props.breedName}</span>
      </div>

      <div className="text-sm text-neutral-600 space-y-1">
        <div className="flex justify-between">
          <span>{lang === 'en' ? 'Pickup week' : 'Hentingsuke'}</span>
          <span>{lang === 'en' ? 'Week' : 'Uke'} {props.weekNumber}, {props.year}</span>
        </div>
        <div className="flex justify-between">
          <span>{lang === 'en' ? 'Age at pickup' : 'Alder ved henting'}</span>
          <span>{props.ageWeeks} {lang === 'en' ? 'weeks' : 'uker'}</span>
        </div>
        <div className="flex justify-between">
          <span>{lang === 'en' ? 'Available now' : 'Tilgjengelig nå'}</span>
          <span>{props.maxAvailableHens}</span>
        </div>
        <div className="flex justify-between">
          <span>{lang === 'en' ? 'Remaining after selection' : 'Igjen etter valg'}</span>
          <span>{props.remainingHens}</span>
        </div>
      </div>

      <div className="border-t border-neutral-200 pt-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span>{props.quantityHens} {lang === 'en' ? 'hens' : 'høner'} x kr {props.pricePerHen}</span>
          <span>kr {props.quantityHens * props.pricePerHen}</span>
        </div>
        {props.quantityRoosters > 0 && (
          <div className="flex justify-between">
            <span>{props.quantityRoosters} {lang === 'en' ? 'roosters' : 'haner'} x kr {props.pricePerRooster}</span>
            <span>kr {props.quantityRoosters * props.pricePerRooster}</span>
          </div>
        )}
        {props.deliveryFee > 0 && (
          <div className="flex justify-between text-neutral-500">
            <span>{lang === 'en' ? 'Delivery' : 'Levering'}</span>
            <span>kr {props.deliveryFee}</span>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-200 pt-3">
        <div className="flex justify-between font-medium text-lg">
          <span>{lang === 'en' ? 'Total' : 'Totalt'}</span>
          <span>kr {props.total}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between text-green-700 font-medium">
          <span>{lang === 'en' ? 'Deposit (30%)' : 'Forskudd (30%)'}</span>
          <span>kr {props.deposit}</span>
        </div>
        <div className="flex justify-between text-neutral-500">
          <span>{lang === 'en' ? 'Remainder' : 'Restbetaling'}</span>
          <span>kr {props.remainder}</span>
        </div>
      </div>
    </div>
  )
}
