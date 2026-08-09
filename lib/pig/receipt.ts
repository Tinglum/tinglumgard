// Pig-order (Mangalitsa) adapter for the shared receipt renderer.
// Pig money is in whole NOK, so amounts are multiplied by 100 to øre.
// MVA 15 % (næringsmidler / food), included in the amount paid.
import { openReceipt, esc, type Lang, type ReceiptLine, type ReceiptModel, type ReceiptPay } from '@/lib/receipts/receipt'

type PigPayment = {
  payment_type?: string | null
  status?: string | null
  amount_nok?: number | null
  paid_at?: string | null
  created_at?: string | null
  vipps_order_id?: string | null
}

export type PigReceiptOrder = {
  order_number: string
  status: string
  customer_name?: string | null
  total_amount: number
  ribbe_choice?: string | null
  display_box_name_no?: string | null
  display_box_name_en?: string | null
  delivery_type?: string | null
  created_at?: string | null
  last_modified_at?: string | null
  marked_delivered_at?: string | null
  extra_products?: any[] | null
  payments?: PigPayment[] | null
}

const STATUS: Record<Lang, Record<string, string>> = {
  no: { pending: 'Venter', deposit_paid: 'Forskudd betalt', paid: 'Betalt', fully_paid: 'Betalt', ready_for_pickup: 'Klar for henting', completed: 'Fullført', shipped: 'Sendt', delivered: 'Levert', cancelled: 'Kansellert' },
  en: { pending: 'Pending', deposit_paid: 'Deposit paid', paid: 'Paid', fully_paid: 'Paid', ready_for_pickup: 'Ready for pickup', completed: 'Completed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' },
}

function payLabel(type: string | null | undefined, lang: Lang): string {
  const no: Record<string, string> = { deposit: 'Forskudd', remainder: 'Restbetaling' }
  const en: Record<string, string> = { deposit: 'Deposit', remainder: 'Remainder' }
  return (lang === 'no' ? no : en)[type || ''] || esc(type)
}

function buildPigModel(order: PigReceiptOrder, lang: Lang): ReceiptModel {
  const extras = order.extra_products || []
  const extrasNok = extras.reduce((s, e: any) => s + Number(e.total_price || 0), 0)
  const totalNok = Number(order.total_amount || 0)
  const baseNok = Math.max(0, totalNok - extrasNok)
  const boxLabel = (lang === 'no' ? order.display_box_name_no : order.display_box_name_en) || (lang === 'no' ? 'Kasse' : 'Box')

  const lines: ReceiptLine[] = [
    {
      name: boxLabel,
      sub: lang === 'no' ? 'Grunnbestilling' : 'Base order',
      qty: order.ribbe_choice || '',
      amountOre: baseNok * 100,
    },
  ]
  extras.forEach((e: any) => {
    const qty = Number(e.quantity || 0)
    lines.push({
      name: String(e.name || e.name_no || e.slug || (lang === 'no' ? 'Tillegg' : 'Extra')),
      sub: lang === 'no' ? 'Tilleggsprodukt' : 'Extra product',
      qty: qty > 0 ? `${qty} x` : '',
      amountOre: Number(e.total_price || 0) * 100,
    })
  })

  const completed = (order.payments || []).filter((p) => p.status === 'completed')
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
    fulfilledLabel: lang === 'no' ? 'Levert' : 'Delivered',
    fulfilledAt: order.marked_delivered_at || null,
    lines,
    totalOre: totalNok * 100,
    paidOre,
    payments,
    mvaRate: 0.15,
  }
}

export function openPigReceipt(order: PigReceiptOrder, lang: Lang): void {
  openReceipt(buildPigModel(order, lang), lang)
}
