// Egg-order adapter for the shared receipt renderer. Egg money is in øre.
import { openReceipt, esc, type Lang, type ReceiptLine, type ReceiptModel, type ReceiptPay } from '@/lib/receipts/receipt'

type ReceiptPayment = {
  payment_type?: string | null
  status?: string | null
  amount_nok?: number | null
  paid_at?: string | null
  created_at?: string | null
  vipps_order_id?: string | null
}

type ReceiptAddition = {
  quantity?: number | null
  subtotal?: number | null
  egg_breeds?: { name?: string | null } | null
}

export type ReceiptOrder = {
  order_number: string
  status: string
  customer_name?: string | null
  quantity: number
  subtotal?: number | null
  total_amount: number
  delivery_fee?: number | null
  price_adjustment_ore?: number | null
  delivery_method: string
  created_at?: string | null
  marked_shipped_at?: string | null
  marked_delivered_at?: string | null
  egg_breeds?: { name?: string | null } | null
  egg_payments?: ReceiptPayment[] | null
  egg_order_additions?: ReceiptAddition[] | null
}

const STATUS: Record<Lang, Record<string, string>> = {
  no: { deposit_paid: 'Forskudd betalt', fully_paid: 'Betalt', preparing: 'Klargjøres', shipped: 'Sendt', delivered: 'Levert', cancelled: 'Kansellert', forfeited: 'Bortfalt', pending: 'Venter' },
  en: { deposit_paid: 'Deposit paid', fully_paid: 'Paid', preparing: 'Preparing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', forfeited: 'Forfeited', pending: 'Pending' },
}

function payLabel(type: string | null | undefined, lang: Lang): string {
  const no: Record<string, string> = { deposit: 'Forskudd', remainder: 'Restbetaling', addition_deposit: 'Ekstra egg' }
  const en: Record<string, string> = { deposit: 'Deposit', remainder: 'Remainder', addition_deposit: 'Extra eggs' }
  return (lang === 'no' ? no : en)[type || ''] || esc(type)
}

function buildEggModel(order: ReceiptOrder, lang: Lang): ReceiptModel {
  const eggsWord = lang === 'no' ? 'egg' : 'eggs'
  const additions = (order.egg_order_additions || []).filter((a) => Number(a.quantity || 0) > 0)
  const additionsOre = additions.reduce((s, a) => s + Number(a.subtotal || 0), 0)
  const deliveryOre = Number(order.delivery_fee || 0)
  const priceAdjOre = Number(order.price_adjustment_ore || 0)
  const totalOre = Number(order.total_amount || 0)
  const baseOre =
    order.subtotal != null && Number.isFinite(Number(order.subtotal))
      ? Number(order.subtotal)
      : Math.max(0, totalOre - additionsOre - deliveryOre - priceAdjOre)

  const lines: ReceiptLine[] = []
  const baseQty = Number(order.quantity || 0)
  if (baseQty > 0) {
    lines.push({
      name: order.egg_breeds?.name || (lang === 'no' ? 'Grunnbestilling' : 'Base order'),
      sub: lang === 'no' ? 'Grunnbestilling' : 'Base order',
      qty: `${baseQty} ${eggsWord}`,
      amountOre: baseOre,
    })
  }
  for (const a of additions) {
    lines.push({
      name: a.egg_breeds?.name || (lang === 'no' ? 'Ekstra egg' : 'Extra eggs'),
      sub: lang === 'no' ? 'Ekstra egg' : 'Extra eggs',
      qty: `${Number(a.quantity || 0)} ${eggsWord}`,
      amountOre: Number(a.subtotal || 0),
    })
  }
  if (deliveryOre > 0) lines.push({ name: lang === 'no' ? 'Sending med Posten' : 'Shipping with Posten', amountOre: deliveryOre })
  if (priceAdjOre !== 0) lines.push({ name: lang === 'no' ? 'Justering' : 'Adjustment', amountOre: priceAdjOre })

  const completed = (order.egg_payments || []).filter((p) => p.status === 'completed')
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
    fulfilledLabel: lang === 'no' ? 'Sendt' : 'Shipped',
    fulfilledAt: order.marked_shipped_at || order.marked_delivered_at || null,
    lines,
    totalOre,
    paidOre,
    payments,
    mvaRate: 0.25,
  }
}

export function openEggReceipt(order: ReceiptOrder, lang: Lang): void {
  openReceipt(buildEggModel(order, lang), lang)
}
