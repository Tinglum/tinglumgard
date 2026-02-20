'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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

const STATUS_LABELS: Record<string, Record<string, string>> = {
  no: {
    pending: 'Venter',
    deposit_paid: 'Forskudd betalt',
    fully_paid: 'Fullt betalt',
    ready_for_pickup: 'Klar for henting',
    picked_up: 'Hentet',
    cancelled: 'Kansellert',
  },
  en: {
    pending: 'Pending',
    deposit_paid: 'Deposit paid',
    fully_paid: 'Fully paid',
    ready_for_pickup: 'Ready for pickup',
    picked_up: 'Picked up',
    cancelled: 'Cancelled',
  },
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  deposit_paid: 'bg-blue-100 text-blue-800',
  fully_paid: 'bg-green-100 text-green-800',
  ready_for_pickup: 'bg-purple-100 text-purple-800',
  picked_up: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-700',
}

export function ChickenOrderCard({ order, onPayRemainder }: ChickenOrderCardProps) {
  const { lang } = useLanguage()
  const labels = STATUS_LABELS[lang] || STATUS_LABELS.no

  const depositPaid = order.chicken_payments?.some(
    (p) => p.payment_type === 'deposit' && p.status === 'completed'
  )
  const remainderPaid = order.chicken_payments?.some(
    (p) => p.payment_type === 'remainder' && p.status === 'completed'
  )
  const showPayRemainder = order.status === 'deposit_paid' && !remainderPaid && onPayRemainder

  return (
    <Card className="p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: order.chicken_breeds?.accent_color || '#ccc' }} />
            <span className="font-medium text-neutral-900">{order.chicken_breeds?.name || 'Kylling'}</span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5 font-mono">{order.order_number}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
          {labels[order.status] || order.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <div>
          <span className="text-neutral-500">{lang === 'en' ? 'Hens' : 'Honer'}</span>
          <p className="font-medium">{order.quantity_hens}</p>
        </div>
        {order.quantity_roosters > 0 && (
          <div>
            <span className="text-neutral-500">{lang === 'en' ? 'Roosters' : 'Haner'}</span>
            <p className="font-medium">{order.quantity_roosters}</p>
          </div>
        )}
        <div>
          <span className="text-neutral-500">{lang === 'en' ? 'Pickup' : 'Henting'}</span>
          <p className="font-medium">{lang === 'en' ? 'Week' : 'Uke'} {order.pickup_week}, {order.pickup_year}</p>
        </div>
        <div>
          <span className="text-neutral-500">{lang === 'en' ? 'Age' : 'Alder'}</span>
          <p className="font-medium">{order.age_weeks_at_pickup} {lang === 'en' ? 'weeks' : 'uker'}</p>
        </div>
        <div>
          <span className="text-neutral-500">{lang === 'en' ? 'Price/hen' : 'Pris/hone'}</span>
          <p className="font-medium">kr {order.price_per_hen_nok}</p>
        </div>
        <div>
          <span className="text-neutral-500">{lang === 'en' ? 'Total' : 'Totalt'}</span>
          <p className="font-medium">kr {order.total_amount_nok}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-neutral-100 flex justify-between text-xs text-neutral-500">
        <span>
          {lang === 'en' ? 'Deposit' : 'Forskudd'}: kr {order.deposit_amount_nok}
          {depositPaid ? ' ✓' : ''}
        </span>
        <span>
          {lang === 'en' ? 'Remainder' : 'Rest'}: kr {order.remainder_amount_nok}
          {remainderPaid ? ' ✓' : ''}
        </span>
      </div>

      {showPayRemainder && (
        <Button className="w-full mt-3" size="sm" onClick={() => onPayRemainder(order.id)}>
          {lang === 'en' ? 'Pay remainder' : 'Betal restbelop'}
        </Button>
      )}
    </Card>
  )
}
