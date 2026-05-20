import { DELIVERY_LABEL_DEFAULT_EGG, DELIVERY_LABEL_E6_PICKUP, DELIVERY_LABEL_FARM_PICKUP, DELIVERY_LABEL_POSTEN, VIPPS_PENDING_EMAIL } from '@/lib/constants'
import { APP_BASE_URL } from '@/lib/constants/app'
import { dispatchEmail } from '@/lib/email/dispatch'
import { buildCustomerOrderLink } from '@/lib/email/links'
import { renderManagedTemplate } from '@/lib/email/render'
import { buildEggOrderLinesHtml, summarizeEggOrderLines } from '@/lib/eggs/email-lines'

type EggDepositOrderLike = {
  id: string
  customer_name?: string | null
  customer_email?: string | null
  order_number?: string | null
  week_number?: number | null
  quantity?: number | null
  delivery_fee?: number | null
  delivery_method?: string | null
  deposit_amount?: number | null
  remainder_amount?: number | null
  total_amount?: number | null
  breed_name?: string | null
  egg_breeds?: { name?: string | null } | Array<{ name?: string | null }> | null
  egg_order_additions?: Array<{
    quantity?: number | null
    price_per_egg?: number | null
    subtotal?: number | null
    egg_breeds?: { name?: string | null } | Array<{ name?: string | null }> | null
  }> | null
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

function formatOreToNokWithPrefix(amountOre: number): string {
  return `kr ${Math.round((Number(amountOre) || 0) / 100).toLocaleString('nb-NO')}`
}

function getEggDeliveryLabel(deliveryMethod: string): string {
  if (deliveryMethod === 'posten') return DELIVERY_LABEL_POSTEN
  if (deliveryMethod === 'e6_pickup') return DELIVERY_LABEL_E6_PICKUP
  if (deliveryMethod === 'farm_pickup') return DELIVERY_LABEL_FARM_PICKUP
  return deliveryMethod || DELIVERY_LABEL_DEFAULT_EGG
}

function fallbackBreedName(order: EggDepositOrderLike): string {
  const relation = Array.isArray(order.egg_breeds) ? order.egg_breeds[0] : order.egg_breeds
  return String(relation?.name || order.breed_name || 'Rugeegg').trim() || 'Rugeegg'
}

export function getEggDepositStatus(order: {
  deposit_amount?: number | null
  remainder_amount?: number | null
  total_amount?: number | null
}): 'deposit_paid' | 'fully_paid' {
  const depositAmount = Number(order.deposit_amount || 0)
  const totalAmount = Number(order.total_amount || 0)
  const remainderAmount = Number(order.remainder_amount || 0)

  if (remainderAmount <= 0) return 'fully_paid'
  if (depositAmount > 0 && totalAmount > 0 && depositAmount >= totalAmount) return 'fully_paid'
  return 'deposit_paid'
}

export async function sendEggDepositConfirmationEmail(
  order: EggDepositOrderLike,
  options?: { sourcePath?: string }
): Promise<boolean> {
  const customerEmailForSend = normalizeEmail(order.customer_email)
  if (!customerEmailForSend || customerEmailForSend === VIPPS_PENDING_EMAIL) {
    return false
  }

  const eggSummaryNo = summarizeEggOrderLines(order, 'no')
  const eggSummaryEn = summarizeEggOrderLines(order, 'en')
  const deliveryLabelNo = getEggDeliveryLabel(String(order.delivery_method || ''))
  const orderLinesHtmlNo = buildEggOrderLinesHtml(eggSummaryNo.lines, 'no', {
    deliveryFeeOre: Number(order.delivery_fee || 0),
    deliveryLabel: deliveryLabelNo,
  })
  const orderLinesHtmlEn = buildEggOrderLinesHtml(eggSummaryEn.lines, 'en', {
    deliveryFeeOre: Number(order.delivery_fee || 0),
    deliveryLabel: deliveryLabelNo,
  })

  const rendered = await renderManagedTemplate({
    templateKey: 'egg.order.deposit.confirmed.customer',
    locale: 'no',
    variables: {
      customer_name: order.customer_name || 'Kunde',
      order_number: order.order_number,
      breed_name: eggSummaryNo.breedLabel || fallbackBreedName(order),
      week_number: order.week_number,
      base_quantity: eggSummaryNo.baseQuantity,
      additions_quantity: eggSummaryNo.additionsQuantity,
      total_quantity: eggSummaryNo.totalQuantity || Number(order.quantity || 0),
      order_lines_html: orderLinesHtmlNo,
      order_lines_html_en: orderLinesHtmlEn,
      total_amount_nok: formatOreToNokWithPrefix(Number(order.total_amount || 0)),
      deposit_amount_nok: formatOreToNokWithPrefix(Number(order.deposit_amount || 0)),
      remainder_amount_nok: formatOreToNokWithPrefix(Number(order.remainder_amount || 0)),
      order_url: buildCustomerOrderLink(APP_BASE_URL, 'egg', String(order.id)),
      tip_index: 0,
    },
  })

  if (!rendered) {
    throw new Error('Missing template egg.order.deposit.confirmed.customer')
  }

  const result = await dispatchEmail({
    to: customerEmailForSend,
    subject: rendered.subject,
    html: rendered.html,
    classification: 'transactional',
    templateKey: rendered.templateKey,
    sourcePath: options?.sourcePath || '/api/webhooks/vipps',
    eggOrderId: String(order.id),
    idempotency: {
      source: 'egg.deposit.confirmed.customer',
      entity: 'egg_order',
      id: String(order.id),
      template: 'egg.order.deposit.confirmed.customer',
    },
  })

  if (!result.success && !result.skipped) {
    throw new Error(result.error || 'Failed to send egg deposit confirmation')
  }

  return !result.skipped
}
