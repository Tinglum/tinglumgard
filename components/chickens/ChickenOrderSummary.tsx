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
  const { t } = useLanguage()
  const chickens = (t as any).chickens
  const commonCopy = chickens.common
  const summaryCopy = chickens.orderSummary

  return (
    <div className="bg-neutral-50 rounded-xl p-5 space-y-4">
      <h4 className="font-medium text-neutral-900">
        {summaryCopy.title}
      </h4>

      <div className="text-sm text-neutral-600 space-y-1">
        <div className="flex justify-between">
          <span>{summaryCopy.pickupWeek}</span>
          <span>{summaryCopy.week} {props.weekNumber}, {props.year}</span>
        </div>
        <div className="flex justify-between">
          <span>{summaryCopy.selectedLines}</span>
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
                  {summaryCopy.age}: {line.ageWeeks}{commonCopy.ageWeekShort}
                </span>
              </div>

              <div className="mt-2 space-y-1 text-neutral-700">
                <div className="flex justify-between">
                  <span>{line.quantityHens} {summaryCopy.hens} {commonCopy.timesSymbol} {commonCopy.currency} {line.pricePerHen}</span>
                  <span>{commonCopy.currency} {hensSubtotal}</span>
                </div>
                {line.quantityRoosters > 0 && (
                  <div className="flex justify-between">
                    <span>{line.quantityRoosters} {summaryCopy.roosters} {commonCopy.timesSymbol} {commonCopy.currency} {line.pricePerRooster}</span>
                    <span>{commonCopy.currency} {roostersSubtotal}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-neutral-900 pt-1 border-t border-neutral-100">
                  <span>{summaryCopy.lineTotal}</span>
                  <span>{commonCopy.currency} {lineTotal}</span>
                </div>
              </div>
            </div>
          )
        })}

        {props.deliveryFee > 0 && (
          <div className="flex justify-between text-neutral-600">
            <span>{summaryCopy.delivery}</span>
            <span>{commonCopy.currency} {props.deliveryFee}</span>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-200 pt-3">
        <div className="flex justify-between text-sm text-neutral-600">
          <span>{summaryCopy.subtotal}</span>
          <span>{commonCopy.currency} {props.subtotal}</span>
        </div>
        <div className="mt-1 flex justify-between font-medium text-lg text-neutral-900">
          <span>{summaryCopy.total}</span>
          <span>{commonCopy.currency} {props.total}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between text-green-700 font-medium">
          <span>{summaryCopy.deposit}</span>
          <span>{commonCopy.currency} {props.deposit}</span>
        </div>
        <div className="flex justify-between text-neutral-500">
          <span>{summaryCopy.remainder}</span>
          <span>{commonCopy.currency} {props.remainder}</span>
        </div>
      </div>
    </div>
  )
}
