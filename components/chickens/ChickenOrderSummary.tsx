'use client'

import { useLanguage } from '@/contexts/LanguageContext'

export interface ChickenSummaryLine {
  id: string
  breedName: string
  accentColor: string
  ageWeeks: number
  quantityHens: number
  quantityRoosters: number
  pricePerHen: number
  pricePerRooster: number
}

interface SummaryProps {
  weekNumber: number
  year: number
  lines: ChickenSummaryLine[]
  subtotal: number
  deliveryFee: number
  total: number
  deposit: number
  remainder: number
}

export function ChickenOrderSummary(props: SummaryProps) {
  const { lang } = useLanguage()

  return (
    <div className="bg-neutral-50 rounded-xl p-5 space-y-4">
      <h4 className="font-medium text-neutral-900">
        {lang === 'en' ? 'Order Summary' : 'Bestillingssammendrag'}
      </h4>

      <div className="text-sm text-neutral-600 space-y-1">
        <div className="flex justify-between">
          <span>{lang === 'en' ? 'Pickup week' : 'Hentingsuke'}</span>
          <span>{lang === 'en' ? 'Week' : 'Uke'} {props.weekNumber}, {props.year}</span>
        </div>
        <div className="flex justify-between">
          <span>{lang === 'en' ? 'Selected lines' : 'Valgte linjer'}</span>
          <span>{props.lines.length}</span>
        </div>
      </div>

      <div className="border-t border-neutral-200 pt-3 text-sm space-y-3">
        {props.lines.map((line) => {
          const hensSubtotal = line.quantityHens * line.pricePerHen
          const roostersSubtotal = line.quantityRoosters * line.pricePerRooster
          const lineTotal = hensSubtotal + roostersSubtotal

          return (
            <div key={line.id} className="rounded-lg border border-neutral-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: line.accentColor }} />
                  <span className="font-medium text-neutral-900">{line.breedName}</span>
                </div>
                <span className="text-xs text-neutral-500">
                  {lang === 'en' ? 'Age' : 'Alder'}: {line.ageWeeks}u
                </span>
              </div>

              <div className="mt-2 space-y-1 text-neutral-700">
                <div className="flex justify-between">
                  <span>{line.quantityHens} {lang === 'en' ? 'hens' : 'h\u00F8ner'} x kr {line.pricePerHen}</span>
                  <span>kr {hensSubtotal}</span>
                </div>
                {line.quantityRoosters > 0 && (
                  <div className="flex justify-between">
                    <span>{line.quantityRoosters} {lang === 'en' ? 'roosters' : 'haner'} x kr {line.pricePerRooster}</span>
                    <span>kr {roostersSubtotal}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-neutral-900 pt-1 border-t border-neutral-100">
                  <span>{lang === 'en' ? 'Line total' : 'Linjesum'}</span>
                  <span>kr {lineTotal}</span>
                </div>
              </div>
            </div>
          )
        })}

        {props.deliveryFee > 0 && (
          <div className="flex justify-between text-neutral-600">
            <span>{lang === 'en' ? 'Delivery' : 'Levering'}</span>
            <span>kr {props.deliveryFee}</span>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-200 pt-3">
        <div className="flex justify-between text-sm text-neutral-600">
          <span>{lang === 'en' ? 'Subtotal' : 'Delsum'}</span>
          <span>kr {props.subtotal}</span>
        </div>
        <div className="mt-1 flex justify-between font-medium text-lg text-neutral-900">
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
