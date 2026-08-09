// Chicken-order adapter for the shared receipt renderer.
// Chicken money is in whole NOK, so amounts are multiplied by 100 to øre.
// MVA 25 % (live animals), included in the amount paid.
import { openReceipt, esc, type Lang, type ReceiptLine, type ReceiptModel, type ReceiptPay } from '@/lib/receipts/receipt'

type ChickenPayment = {
  payment_type?: string | null
  status?: string | null
  amount_nok?: number | null
  paid_at?: string | null
  created_at?: string | null
  vipps_order_id?: string | null
}

type ChickenAddition = {
  quantity_hens?: number | null
  quantity_roosters?: number | null
  subtotal_nok?: number | null
  price_per_hen_nok?: number | null
  chicken_breeds?: { name?: string | null } | null
}

export type ChickenReceiptOrder = {
  order_number: string
  status: string
  customer_name?: string | null
  quantity_hens: number
  quantity_roosters: number
  subtotal_nok?: number | null
  price_per_hen_nok?: number | null
  price_per_rooster_nok?: number | null
  total_amount_nok: number
  delivery_fee_nok?: number | null
  delivery_method?: string | null
  pickup_monday?: string | null
  created_at?: string | null
  chicken_breeds?: { name?: string | null } | null
  chicken_order_additions?: ChickenAddition[] | null
  chicken_payments?: ChickenPayment[] | null
}

const STATUS: Record<Lang, Record<string, string>> = {
  no: { pending: 'Venter', deposit_paid: 'Forskudd betalt', fully_paid: 'Betalt', ready_for_pickup: 'Klar for henting', picked_up: 'Hentet', cancelled: 'Kansellert', forfeited: 'Bortfalt' },
  en: { pending: 'Pending', deposit_paid: 'Deposit paid', fully_paid: 'Paid', ready_for_pickup: 'Ready for pickup', picked_up: 'Picked up', cancelled: 'Cancelled', forfeited: 'Forfeited' },
}

function payLabel(type: string | null | undefined, lang: Lang): string {
  const no: Record<string, string> = { deposit: 'Forskudd', remainder: 'Restbetaling' }
  const en: Record<string, string> = { deposit: 'Deposit', remainder: 'Remainder' }
  return (lang === 'no' ? no : en)[type || ''] || esc(type)
}

function birdsQty(hens: number, roosters: number, lang: Lang): string {
  const h = lang === 'no' ? 'høner' : 'hens'
  const r = lang === 'no' ? 'haner' : 'roosters'
  const parts: string[] = []
  if (hens > 0) parts.push(`${hens} ${h}`)
  if (roosters > 0) parts.push(`${roosters} ${r}`)
  return parts.join(' + ')
}

function buildChickenModel(order: ChickenReceiptOrder, lang: Lang): ReceiptModel {
  const baseName = order.chicken_breeds?.name || (lang === 'no' ? 'Kyllinger' : 'Chickens')
  const baseSubtotalNok =
    Number(order.subtotal_nok || 0) > 0
      ? Number(order.subtotal_nok || 0)
      : Number(order.quantity_hens || 0) * Number(order.price_per_hen_nok || 0) +
        Number(order.quantity_roosters || 0) * Number(order.price_per_rooster_nok || 0)

  const lines: ReceiptLine[] = [
    {
      name: baseName,
      sub: lang === 'no' ? 'Grunnbestilling' : 'Base order',
      qty: birdsQty(Number(order.quantity_hens || 0), Number(order.quantity_roosters || 0), lang),
      amountOre: Math.max(0, baseSubtotalNok) * 100,
    },
  ]
  for (const a of order.chicken_order_additions || []) {
    const subtotal =
      Number(a.subtotal_nok || 0) > 0
        ? Number(a.subtotal_nok || 0)
        : Number(a.quantity_hens || 0) * Number(a.price_per_hen_nok || order.price_per_hen_nok || 0)
    if (Number(a.quantity_hens || 0) <= 0 && Number(a.quantity_roosters || 0) <= 0) continue
    lines.push({
      name: a.chicken_breeds?.name || (lang === 'no' ? 'Ekstra kyllinger' : 'Extra chickens'),
      sub: lang === 'no' ? 'Tillegg' : 'Addition',
      qty: birdsQty(Number(a.quantity_hens || 0), Number(a.quantity_roosters || 0), lang),
      amountOre: subtotal * 100,
    })
  }
  const deliveryNok = Number(order.delivery_fee_nok || 0)
  if (deliveryNok > 0) lines.push({ name: lang === 'no' ? 'Frakt' : 'Shipping', amountOre: deliveryNok * 100 })

  const completed = (order.chicken_payments || []).filter((p) => p.status === 'completed')
  const paidOre = completed.reduce((s, p) => s + Number(p.amount_nok || 0) * 100, 0)
  const payments: ReceiptPay[] = completed.map((p) => ({
    label: payLabel(p.payment_type, lang),
    dateIso: p.paid_at || p.created_at || null,
    vippsRef: p.vipps_order_id || null,
    amountOre: Number(p.amount_nok || 0) * 100,
  }))

  return {
    orderNumber: order.order_number,
    statusLabel: STATUS[lang][order.status] || esc(order.status),
    customerName: order.customer_name || '',
    orderedAt: order.created_at || null,
    fulfilledLabel: lang === 'no' ? 'Henting' : 'Pickup',
    fulfilledAt: order.pickup_monday || null,
    lines,
    totalOre: Number(order.total_amount_nok || 0) * 100,
    paidOre,
    payments,
    mvaRate: 0.25,
  }
}

export function openChickenReceipt(order: ChickenReceiptOrder, lang: Lang): void {
  openReceipt(buildChickenModel(order, lang), lang)
}
