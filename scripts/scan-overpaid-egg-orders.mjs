#!/usr/bin/env node
// Read-only diagnostic: finds egg orders where completed payments (deposit + remainder)
// exceed the order's total_amount by more than 1 kr — the same damage pattern found on
// EGG13063678 (additions silently deleted after payment completed, leaving an overpayment).
//
// Usage: node --env-file=.env.local scripts/scan-overpaid-egg-orders.mjs
//
// STRICTLY READ-ONLY. This script performs no insert/update/delete of any kind.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with: node --env-file=.env.local scripts/scan-overpaid-egg-orders.mjs'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const TOLERANCE_ORE = 100 // 1 kr rounding tolerance
const REFERENCE_ORDER_NUMBER = 'EGG13063678'

function formatKr(ore) {
  return (ore / 100).toFixed(2)
}

async function fetchAllEggOrders() {
  const pageSize = 500
  let from = 0
  const all = []

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from('egg_orders')
      .select(
        'id, order_number, status, total_amount, deposit_amount, remainder_amount, customer_email, customer_phone, year, week_number, delivery_monday, created_at'
      )
      .range(from, from + pageSize - 1)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch egg_orders page:', error.message)
      process.exit(1)
    }

    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return all
}

async function fetchCompletedPayments(orderId) {
  const { data, error } = await supabase
    .from('egg_payments')
    .select('id, payment_type, amount_nok, status, paid_at, created_at')
    .eq('egg_order_id', orderId)
    .eq('status', 'completed')

  if (error) {
    console.error(`Failed to fetch egg_payments for order ${orderId}:`, error.message)
    return []
  }
  return data || []
}

async function fetchAdditions(orderId) {
  const { data, error } = await supabase
    .from('egg_order_additions')
    .select('id, quantity, subtotal, created_at, breed_id, egg_breeds ( name )')
    .eq('egg_order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(`Failed to fetch egg_order_additions for order ${orderId}:`, error.message)
    return []
  }
  return data || []
}

function printOrderReport(order, payments, additions, { isReference = false } = {}) {
  const totalPaidOre = payments.reduce((sum, p) => sum + (Number(p.amount_nok) || 0) * 100, 0)
  const totalAmountOre = Number(order.total_amount) || 0
  const overpaymentOre = totalPaidOre - totalAmountOre

  const remainderPayments = payments
    .filter((p) => p.payment_type === 'remainder')
    .sort((a, b) => new Date(b.paid_at || b.created_at || 0) - new Date(a.paid_at || a.created_at || 0))
  const lastRemainderPayment = remainderPayments[0]

  console.log('')
  console.log('='.repeat(80))
  console.log(`${isReference ? '[REFERENCE CASE] ' : ''}Order ${order.order_number} (id: ${order.id})`)
  console.log('-'.repeat(80))
  console.log(`  Status:              ${order.status}`)
  console.log(`  Total amount:        ${formatKr(totalAmountOre)} kr`)
  console.log(`  Total paid:          ${formatKr(totalPaidOre)} kr`)
  console.log(`  Overpayment:         ${formatKr(overpaymentOre)} kr`)
  console.log(`  Customer email:      ${order.customer_email || '(none)'}`)
  console.log(`  Customer phone:      ${order.customer_phone || '(none)'}`)
  console.log(`  Delivery year/week:  ${order.year || '?'} / ${order.week_number || '?'}`)
  console.log(`  Delivery monday:     ${order.delivery_monday || '(none)'}`)
  console.log(
    `  Last completed remainder payment: ${
      lastRemainderPayment ? lastRemainderPayment.paid_at || lastRemainderPayment.created_at : '(none)'
    }`
  )

  if (additions.length === 0) {
    console.log('  Additions: (none)')
  } else {
    console.log(`  Additions (${additions.length}):`)
    for (const a of additions) {
      const breedName = a.egg_breeds?.name || '(unknown breed)'
      console.log(
        `    - ${breedName} x${a.quantity}, subtotal ${formatKr(a.subtotal * 100)} kr, created_at ${a.created_at}`
      )
    }
  }

  console.log('  Completed payments:')
  for (const p of payments) {
    console.log(
      `    - ${p.payment_type}: ${formatKr((Number(p.amount_nok) || 0) * 100)} kr, paid_at ${
        p.paid_at || '(unset)'
      }`
    )
  }
}

async function main() {
  console.log('Scanning egg_orders for overpayment (paid amount exceeds total_amount by > 1 kr)...')

  const orders = await fetchAllEggOrders()
  console.log(`Loaded ${orders.length} egg orders.`)

  const flagged = []
  let referenceOrder = null

  for (const order of orders) {
    const payments = await fetchCompletedPayments(order.id)
    const totalPaidOre = payments.reduce((sum, p) => sum + (Number(p.amount_nok) || 0) * 100, 0)
    const totalAmountOre = Number(order.total_amount) || 0
    const overpaymentOre = totalPaidOre - totalAmountOre

    const isReference = order.order_number === REFERENCE_ORDER_NUMBER
    if (isReference) {
      referenceOrder = { order, payments }
    }

    if (overpaymentOre > TOLERANCE_ORE) {
      flagged.push({ order, payments, overpaymentOre })
    }
  }

  console.log(`\nFound ${flagged.length} order(s) with overpayment > 1 kr.`)

  if (referenceOrder && !flagged.some((f) => f.order.id === referenceOrder.order.id)) {
    // Print reference case separately even if it doesn't meet the threshold (shouldn't happen,
    // but the requirement is to always show it).
    const additions = await fetchAdditions(referenceOrder.order.id)
    printOrderReport(referenceOrder.order, referenceOrder.payments, additions, { isReference: true })
  }

  for (const { order, payments } of flagged) {
    const additions = await fetchAdditions(order.id)
    printOrderReport(order, payments, additions, { isReference: order.order_number === REFERENCE_ORDER_NUMBER })
  }

  if (!referenceOrder) {
    console.log(`\nNote: reference order ${REFERENCE_ORDER_NUMBER} was not found in egg_orders.`)
  }

  console.log('\nDone. This script made no writes to the database.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unexpected error:', err)
    process.exit(0) // still exit 0 per spec; error is logged for visibility
  })
