'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

interface ChickenOrderCardProps {
  order: {
    id: string
    order_number: string
    quantity_hens: number
    quantity_roosters: number
    pickup_year: number
    pickup_week: number
    age_weeks_at_pickup: number
    price_per_hen_nok: number
    total_amount_nok: number
    deposit_amount_nok: number
    remainder_amount_nok: number
    delivery_method: string
    status: string
    created_at: string
    chicken_breeds?: { name: string; accent_color: string }
    chicken_payments?: Array<{ payment_type: string; status: string; amount_nok: number }>
  }
  onPayRemainder?: (orderId: string) => void
}

export function ChickenOrderCard({ order, onPayRemainder }: ChickenOrderCardProps) {
  const { lang, t } = useLanguage()
  const myOrdersCopy = (t as any).chickens.myOrders
  const common = t.common
  const locale = lang === 'en' ? 'en-US' : 'nb-NO'

  const statusMeta: Record<string, { label: string; className: string }> = {
    pending: { label: myOrdersCopy.statusPending, className: 'bg-amber-50 text-amber-700' },
    deposit_paid: { label: myOrdersCopy.statusDepositPaid, className: 'bg-blue-50 text-blue-700' },
    fully_paid: { label: myOrdersCopy.statusFullyPaid, className: 'bg-emerald-50 text-emerald-700' },
    ready_for_pickup: { label: myOrdersCopy.statusReadyForPickup, className: 'bg-indigo-50 text-indigo-700' },
    picked_up: { label: myOrdersCopy.statusPickedUp, className: 'bg-neutral-100 text-neutral-700' },
    cancelled: { label: myOrdersCopy.statusCancelled, className: 'bg-rose-50 text-rose-700' },
  }

  const depositPaid = order.chicken_payments?.some(
    (payment) => payment.payment_type === 'deposit' && payment.status === 'completed'
  )
  const remainderPaid = order.chicken_payments?.some(
    (payment) => payment.payment_type === 'remainder' && payment.status === 'completed'
  )

  const showPayRemainder = order.status === 'deposit_paid' && !remainderPaid && onPayRemainder
  const meta = statusMeta[order.status] || { label: order.status, className: 'bg-neutral-100 text-neutral-700' }

  return (
    <Card className="p-6 border-neutral-200 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{t.minSide.order}</p>
          <h3 className="text-2xl font-normal text-neutral-900">{order.order_number}</h3>
          <p className="text-sm text-neutral-600">
            {order.chicken_breeds?.name || common.defaultChickenName} - {myOrdersCopy.weekLabel} {order.pickup_week}, {order.pickup_year}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${meta.className}`}>
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.hensLabel}</p>
            <p className="text-2xl font-normal text-neutral-900">{order.quantity_hens}</p>
          </div>
          {order.quantity_roosters > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.roostersLabel}</p>
              <p className="text-lg font-normal text-neutral-900">{order.quantity_roosters}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">{myOrdersCopy.depositLabel}</span>
            <span className="font-normal text-neutral-900">
              {common.currency} {order.deposit_amount_nok.toLocaleString(locale)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">{myOrdersCopy.remainderLabel}</span>
            <span className="font-normal text-neutral-900">
              {common.currency} {order.remainder_amount_nok.toLocaleString(locale)}
            </span>
          </div>
          {showPayRemainder && (
            <div className="flex items-start gap-2 text-xs text-neutral-600">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>{myOrdersCopy.payRemainder}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <CheckCircle2 className="w-4 h-4 text-neutral-900" />
            <span>{myOrdersCopy.totalLabel}: {common.currency} {order.total_amount_nok.toLocaleString(locale)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-neutral-600">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.ageLabel}</p>
            <p className="font-normal text-neutral-900">
              {order.age_weeks_at_pickup} {myOrdersCopy.weeksLabel}
            </p>
          </div>
          <div className="text-sm text-neutral-600">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{myOrdersCopy.pricePerHenLabel}</p>
            <p className="font-normal text-neutral-900">{common.currency} {order.price_per_hen_nok.toLocaleString(locale)}</p>
          </div>
        </div>
      </div>

      {showPayRemainder && (
        <div className="mt-5 pt-5 border-t border-neutral-200">
          <Button className="btn-primary" onClick={() => onPayRemainder?.(order.id)}>
            {myOrdersCopy.payRemainder}
          </Button>
        </div>
      )}
    </Card>
  )
}
