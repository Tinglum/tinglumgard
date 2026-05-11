import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import {
  buildEggOrderLineComponents,
  fetchAdminEggWeekInventory,
  getAdminEggAvailabilityForInventoryRows,
  getEggOrderCurrentQuantitiesByInventory,
} from '@/lib/eggs/admin-order-adjustments'
import { finalizeConfirmedEggOrder } from '@/lib/eggs/order-confirmation'
import { getFulfillmentAvailabilityByBreed } from '@/lib/eggs/fulfillment-availability'
import { supabaseAdmin } from '@/lib/supabase/server'
import { initiateVippsRefund } from '@/lib/vipps/refund'
import { vippsClient } from '@/lib/vipps/api-client'
import { dispatchEmail } from '@/lib/email/dispatch'
import { reconcileEggPaymentDependentFlowInstances } from '@/lib/email/lifecycle'
import { renderManagedTemplate, emailButton, emailDivider, emailTipBox, emailStoryFooter, ensureHtmlDocument } from '@/lib/email/render'
import { buildCustomerOrderLink } from '@/lib/email/links'
import { buildEggOrderLinesHtml, summarizeEggOrderLines } from '@/lib/eggs/email-lines'
import { logError } from '@/lib/logger'
import { notifyInventoryOverallocation } from '@/lib/notifications/inventory-overallocation'

interface EggOrderAddition {
  id: string
  breed_id: string
  inventory_id: string
  quantity: number
}

interface EggPaymentRow {
  id: string
  payment_type: 'deposit' | 'addition_deposit' | 'remainder'
  status: string
  amount_nok: number
  paid_at: string | null
  created_at: string
}

interface EggOrderPaymentView {
  id: string
  order_number: string
  status: string
  deposit_amount: number
  remainder_amount: number
  admin_notes: string | null
  egg_payments?: EggPaymentRow[]
}

interface EggOrderAdjustLineInput {
  inventoryId: string
  quantity: number
  overrideRemaining?: number | null
}

interface EggOrderAdjustView {
  id: string
  order_number: string
  status: string
  admin_notes: string | null
  inventory_id: string
  breed_id: string
  quantity: number
  price_per_egg: number
  subtotal: number
  delivery_fee: number
  deposit_amount: number
  total_amount: number
  remainder_amount: number
  year: number
  week_number: number
  delivery_monday: string | null
  egg_payments?: EggPaymentRow[] | null
  egg_order_additions?: Array<{
    id: string
    inventory_id: string
    breed_id: string
    quantity: number
    price_per_egg: number
    subtotal: number
  }> | null
}

const STATUS_LOCK = new Set(['preparing', 'shipped', 'delivered', 'cancelled', 'forfeited'])

function formatOreToNokWithPrefix(value: unknown) {
  const ore = Number(value || 0)
  const nok = Math.round(ore / 100)
  return `kr ${nok.toLocaleString('nb-NO')}`
}

async function releaseInventory(inventoryId: string, quantity: number) {
  const { data: inventory, error } = await supabaseAdmin
    .from('egg_inventory')
    .select('eggs_allocated, eggs_available, status')
    .eq('id', inventoryId)
    .single()

  if (error || !inventory) {
    logError('admin-egg-inventory-release-fetch', error)
    return
  }

  const nextAllocated = Math.max(0, (inventory.eggs_allocated || 0) - quantity)
  const remainingAfter = inventory.eggs_available - nextAllocated
  let nextStatus = inventory.status

  if (remainingAfter <= 0) {
    nextStatus = 'sold_out'
  } else if (inventory.status === 'sold_out') {
    nextStatus = 'open'
  }

  const { error: updateError } = await supabaseAdmin
    .from('egg_inventory')
    .update({ eggs_allocated: nextAllocated, status: nextStatus })
    .eq('id', inventoryId)

  if (updateError) {
    logError('admin-egg-inventory-release-update', updateError)
  }
}

async function allocateInventory(inventoryId: string, quantity: number) {
  const { data: inventory, error } = await supabaseAdmin
    .from('egg_inventory')
    .select('eggs_allocated, eggs_available, status')
    .eq('id', inventoryId)
    .single()

  if (error || !inventory) {
    throw new Error('Inventory not found')
  }

  const remaining = inventory.eggs_available - (inventory.eggs_allocated || 0)
  if (remaining < quantity) {
    throw new Error('Not enough inventory available')
  }

  const nextAllocated = (inventory.eggs_allocated || 0) + quantity
  const remainingAfter = inventory.eggs_available - nextAllocated
  let nextStatus = inventory.status

  if (remainingAfter <= 0) {
    nextStatus = 'sold_out'
  } else if (inventory.status === 'sold_out') {
    nextStatus = 'open'
  }

  const { error: updateError } = await supabaseAdmin
    .from('egg_inventory')
    .update({ eggs_allocated: nextAllocated, status: nextStatus })
    .eq('id', inventoryId)

  if (updateError) {
    throw updateError
  }
}

async function appendAdminNote(orderId: string, existingNotes: string | null, note: string) {
  const nextNotes = [existingNotes, note].filter(Boolean).join('\n')
  await supabaseAdmin
    .from('egg_orders')
    .update({ admin_notes: nextNotes })
    .eq('id', orderId)
}

function deriveStatusFromPayments(
  currentStatus: string,
  payments: EggPaymentRow[] = [],
  remainderTargetOre: number
): string {
  if (STATUS_LOCK.has(currentStatus)) {
    return currentStatus
  }

  const depositCompleted = payments.some(
    (payment) => payment.payment_type === 'deposit' && payment.status === 'completed'
  )

  if (!depositCompleted) {
    return 'pending'
  }

  const remainderPaidOre =
    payments.reduce((sum, payment) => {
      if (payment.payment_type !== 'remainder' || payment.status !== 'completed') return sum
      return sum + (payment.amount_nok || 0) * 100
    }, 0) || 0

  if (remainderTargetOre <= 0 || remainderPaidOre >= remainderTargetOre) {
    return 'fully_paid'
  }

  return 'deposit_paid'
}

function toNonNegativeInteger(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const rounded = Math.round(parsed)
  if (rounded < 0) return null
  return rounded
}

function getBreedPricePerEgg(value: any): number {
  if (Array.isArray(value)) {
    return Math.max(0, Number(value[0]?.price_per_egg || 0))
  }
  return Math.max(0, Number(value?.price_per_egg || 0))
}

function getUniqueInventoryOrder(
  originalBaseInventoryId: string,
  currentInventoryIds: string[],
  allInventoryIds: string[]
) {
  return Array.from(
    new Set(
      [originalBaseInventoryId, ...currentInventoryIds, ...allInventoryIds]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  )
}

async function applyManualRemainingOverride(
  inventoryRow: any,
  overrideRemaining: number
) {
  const currentAllocated = Math.max(0, Number(inventoryRow?.eggs_allocated || 0))
  const nextEggsAvailable = currentAllocated + overrideRemaining
  const baseline =
    Number.isFinite(Number(inventoryRow?.auto_forecast_eggs))
      ? Number(inventoryRow.auto_forecast_eggs)
      : Math.max(
          0,
          Number(inventoryRow?.eggs_available || 0) - Number(inventoryRow?.manual_adjustment || 0)
        )
  const nextManualOverride = nextEggsAvailable !== baseline
  const nextAdjustment = nextManualOverride ? nextEggsAvailable - baseline : 0
  let nextStatus = String(inventoryRow?.status || 'open')

  if (nextStatus !== 'closed') {
    if (nextEggsAvailable <= currentAllocated) {
      nextStatus = 'sold_out'
    } else if (nextStatus === 'sold_out' || nextStatus === 'locked') {
      nextStatus = 'open'
    }
  }

  const updatePayload: Record<string, unknown> = {
    eggs_available: nextEggsAvailable,
    auto_forecast_eggs: baseline,
    manual_adjustment: nextAdjustment,
    manual_override: nextManualOverride,
    forecast_source: nextManualOverride ? 'manual' : 'auto',
    auto_forecast_at: new Date().toISOString(),
    deficit_alert: nextEggsAvailable < currentAllocated,
    status: nextStatus,
  }

  const { data, error } = await supabaseAdmin
    .from('egg_inventory')
    .update(updatePayload)
    .eq('id', inventoryRow.id)
    .select('id, breed_id, year, week_number, delivery_monday, eggs_available, eggs_allocated, eggs_remaining, status, manual_override, manual_adjustment, auto_forecast_eggs, egg_breeds(id, name, price_per_egg)')
    .single()

  if (error || !data) {
    throw new Error('Failed to apply inventory override')
  }

  return data
}

async function adjustEggOrderLines(
  orderId: string,
  linesInput: EggOrderAdjustLineInput[],
  reason: string | undefined
) {
  const { data: orderRaw, error: orderError } = await supabaseAdmin
    .from('egg_orders')
    .select(
      'id, order_number, status, admin_notes, inventory_id, breed_id, quantity, price_per_egg, subtotal, delivery_fee, deposit_amount, total_amount, remainder_amount, year, week_number, delivery_monday, egg_payments(*), egg_order_additions(id, inventory_id, breed_id, quantity, price_per_egg, subtotal)'
    )
    .eq('id', orderId)
    .single()

  if (orderError || !orderRaw) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const order = orderRaw as EggOrderAdjustView
  const inventoryRows = (await fetchAdminEggWeekInventory({
    year: Number(order.year || 0),
    weekNumber: Number(order.week_number || 0),
  })) as any[]

  const inventoryById = new Map(
    inventoryRows.map((row) => [String(row.id), row])
  )

  const currentQuantities = getEggOrderCurrentQuantitiesByInventory(order)
  const requestedLines = new Map<string, { quantity: number; overrideRemaining: number | null }>()

  for (const line of linesInput || []) {
    const inventoryId = String(line?.inventoryId || '').trim()
    if (!inventoryId) continue

    const quantity = toNonNegativeInteger(line?.quantity)
    if (quantity === null) {
      return NextResponse.json({ error: 'Invalid quantity in line adjustment' }, { status: 400 })
    }

    const rawOverrideRemaining = line?.overrideRemaining
    const overrideRemaining =
      rawOverrideRemaining === undefined || rawOverrideRemaining === null
        ? null
        : toNonNegativeInteger(rawOverrideRemaining)

    if (rawOverrideRemaining !== undefined && rawOverrideRemaining !== null && overrideRemaining === null) {
      return NextResponse.json({ error: 'Invalid override value' }, { status: 400 })
    }

    requestedLines.set(inventoryId, { quantity, overrideRemaining })
  }

  const touchedInventoryIds = Array.from(
    new Set([
      ...Array.from(currentQuantities.keys()),
      ...Array.from(requestedLines.keys()),
    ])
  )

  for (const inventoryId of touchedInventoryIds) {
    if (!inventoryById.has(inventoryId)) {
      return NextResponse.json({ error: 'One or more breeds are invalid for this delivery week' }, { status: 400 })
    }
  }

  const availabilityByInventoryId = await getAdminEggAvailabilityForInventoryRows({
    inventoryRows,
    year: Number(order.year || 0),
    weekNumber: Number(order.week_number || 0),
    deliveryMonday: order.delivery_monday,
  })

  const currentComponents = buildEggOrderLineComponents(order)

  for (const inventoryId of touchedInventoryIds) {
    const inventoryRow = inventoryById.get(inventoryId)
    const availability = availabilityByInventoryId.get(inventoryId)
    const currentQty = currentQuantities.get(inventoryId) || 0
    const requested = requestedLines.get(inventoryId)
    const finalQty = requested ? requested.quantity : currentQty
    const overrideRemaining = requested?.overrideRemaining ?? null
    const remainingFree =
      overrideRemaining !== null
        ? overrideRemaining
        : Math.max(0, Number(availability?.remaining || 0))
    const maxWithoutError = currentQty + remainingFree

    if (finalQty > maxWithoutError) {
      return NextResponse.json(
        {
          error: `${availability?.breedName || 'Breed'}: need ${finalQty}, max ${maxWithoutError} without override`,
        },
        { status: 400 }
      )
    }

    if (overrideRemaining !== null && inventoryRow) {
      const updatedRow = await applyManualRemainingOverride(inventoryRow, overrideRemaining)
      inventoryById.set(inventoryId, updatedRow)
    }
  }

  for (const inventoryId of touchedInventoryIds) {
    const inventoryRow = inventoryById.get(inventoryId)
    if (!inventoryRow) continue

    const currentQty = currentQuantities.get(inventoryId) || 0
    const requested = requestedLines.get(inventoryId)
    const finalQty = requested ? requested.quantity : currentQty
    const delta = finalQty - currentQty

    if (delta === 0) continue

    const currentAllocated = Math.max(0, Number(inventoryRow.eggs_allocated || 0))
    const nextAllocated = Math.max(0, currentAllocated + delta)
    const eggsAvailable = Math.max(0, Number(inventoryRow.eggs_available || 0))
    let nextStatus = String(inventoryRow.status || 'open')

    if (nextStatus !== 'closed') {
      if (eggsAvailable <= nextAllocated) {
        nextStatus = 'sold_out'
      } else if (nextStatus === 'sold_out' || nextStatus === 'locked') {
        nextStatus = 'open'
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('egg_inventory')
      .update({ eggs_allocated: nextAllocated, status: nextStatus })
      .eq('id', inventoryId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update inventory allocation' }, { status: 500 })
    }

    inventoryById.set(inventoryId, {
      ...inventoryRow,
      eggs_allocated: nextAllocated,
      status: nextStatus,
    })
  }

  const allInventoryIds = inventoryRows.map((row) => String(row.id))
  const inventoryOrder = getUniqueInventoryOrder(
    String(order.inventory_id || ''),
    currentComponents.map((component) => component.inventoryId),
    allInventoryIds
  )

  const finalPositiveQuantities = new Map<string, number>()
  for (const inventoryId of inventoryOrder) {
    const currentQty = currentQuantities.get(inventoryId) || 0
    const finalQty = requestedLines.has(inventoryId)
      ? requestedLines.get(inventoryId)?.quantity || 0
      : currentQty
    if (finalQty > 0) {
      finalPositiveQuantities.set(inventoryId, finalQty)
    }
  }

  if (finalPositiveQuantities.size === 0) {
    return NextResponse.json({ error: 'Order must contain at least one egg line' }, { status: 400 })
  }

  const originalBaseInventoryId = String(order.inventory_id || '')
  const baseInventoryId = finalPositiveQuantities.has(originalBaseInventoryId)
    ? originalBaseInventoryId
    : inventoryOrder.find((inventoryId) => finalPositiveQuantities.has(inventoryId)) || originalBaseInventoryId

  const segmentsByInventory = new Map<
    string,
    Array<{ inventoryId: string; breedId: string; quantity: number; pricePerEgg: number; source: 'base' | 'addition' | 'new' }>
  >()

  for (const [inventoryId, finalQty] of Array.from(finalPositiveQuantities.entries())) {
    const existingSegments = currentComponents.filter((component) => component.inventoryId === inventoryId)
    const inventoryRow = inventoryById.get(inventoryId)
    const standardPrice = Math.max(0, getBreedPricePerEgg(inventoryRow?.egg_breeds))
    let remaining = finalQty
    const nextSegments: Array<{ inventoryId: string; breedId: string; quantity: number; pricePerEgg: number; source: 'base' | 'addition' | 'new' }> = []

    for (const segment of existingSegments) {
      if (remaining <= 0) break
      const take = Math.min(remaining, Math.max(0, Number(segment.quantity || 0)))
      if (take <= 0) continue
      nextSegments.push({
        inventoryId,
        breedId: segment.breedId,
        quantity: take,
        pricePerEgg: Math.max(0, Number(segment.pricePerEgg || 0)),
        source: segment.source,
      })
      remaining -= take
    }

    if (remaining > 0) {
      nextSegments.push({
        inventoryId,
        breedId: String(inventoryRow?.breed_id || ''),
        quantity: remaining,
        pricePerEgg: standardPrice,
        source: 'new',
      })
    }

    segmentsByInventory.set(inventoryId, nextSegments)
  }

  const baseSegments = segmentsByInventory.get(baseInventoryId) || []
  const baseSegment =
    baseSegments.find((segment) => segment.source === 'base') ||
    baseSegments[0]

  if (!baseSegment) {
    return NextResponse.json({ error: 'Failed to determine base egg line' }, { status: 500 })
  }

  const additionRows: Array<{
    egg_order_id: string
    inventory_id: string
    breed_id: string
    quantity: number
    price_per_egg: number
    subtotal: number
  }> = []

  for (const [inventoryId, segments] of Array.from(segmentsByInventory.entries())) {
    for (const segment of segments) {
      const isChosenBaseSegment = inventoryId === baseInventoryId && segment === baseSegment
      if (isChosenBaseSegment) continue
      additionRows.push({
        egg_order_id: orderId,
        inventory_id: segment.inventoryId,
        breed_id: segment.breedId,
        quantity: segment.quantity,
        price_per_egg: segment.pricePerEgg,
        subtotal: segment.quantity * segment.pricePerEgg,
      })
    }
  }

  const nextSubtotal = baseSegment.quantity * baseSegment.pricePerEgg
  const additionsTotal = additionRows.reduce((sum, row) => sum + row.subtotal, 0)
  const nextTotalAmount = nextSubtotal + Number(order.delivery_fee || 0) + additionsTotal
  const nextRemainderAmount = Math.max(0, nextTotalAmount - Number(order.deposit_amount || 0))
  const nextStatus = deriveStatusFromPayments(
    order.status,
    order.egg_payments || [],
    nextRemainderAmount
  )

  const { error: orderUpdateError } = await supabaseAdmin
    .from('egg_orders')
    .update({
      inventory_id: baseSegment.inventoryId,
      breed_id: baseSegment.breedId,
      quantity: baseSegment.quantity,
      price_per_egg: baseSegment.pricePerEgg,
      subtotal: nextSubtotal,
      total_amount: nextTotalAmount,
      remainder_amount: nextRemainderAmount,
      status: nextStatus,
    })
    .eq('id', orderId)

  if (orderUpdateError) {
    return NextResponse.json({ error: 'Failed to update base egg line' }, { status: 500 })
  }

  const { error: deleteAdditionsError } = await supabaseAdmin
    .from('egg_order_additions')
    .delete()
    .eq('egg_order_id', orderId)

  if (deleteAdditionsError) {
    return NextResponse.json({ error: 'Failed to refresh egg additions' }, { status: 500 })
  }

  if (additionRows.length > 0) {
    const { error: insertAdditionsError } = await supabaseAdmin
      .from('egg_order_additions')
      .insert(additionRows)

    if (insertAdditionsError) {
      return NextResponse.json({ error: 'Failed to save egg additions' }, { status: 500 })
    }
  }

  const summaryParts = inventoryOrder
    .filter((inventoryId) => finalPositiveQuantities.has(inventoryId))
    .map((inventoryId) => {
      const inventoryRow = inventoryById.get(inventoryId)
      const qty = finalPositiveQuantities.get(inventoryId) || 0
      const breedName = Array.isArray(inventoryRow?.egg_breeds)
        ? inventoryRow?.egg_breeds?.[0]?.name || 'Rugeegg'
        : inventoryRow?.egg_breeds?.name || 'Rugeegg'
      return `${qty}x ${breedName}`
    })

  const overrideParts = touchedInventoryIds
    .map((inventoryId) => {
      const requested = requestedLines.get(inventoryId)
      if (!requested || requested.overrideRemaining === null || requested.overrideRemaining === undefined) return ''
      const inventoryRow = inventoryById.get(inventoryId)
      const breedName = Array.isArray(inventoryRow?.egg_breeds)
        ? inventoryRow?.egg_breeds?.[0]?.name || 'Rugeegg'
        : inventoryRow?.egg_breeds?.name || 'Rugeegg'
      return `${breedName}: ${requested.overrideRemaining} fri`
    })
    .filter(Boolean)

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: adjusted egg lines - ${summaryParts.join(', ')}${overrideParts.length > 0 ? ` | override ${overrideParts.join(', ')}` : ''}${reason ? ` - ${reason}` : ''}`
  )

  return NextResponse.json({
    success: true,
    totals: {
      subtotal: nextSubtotal,
      total_amount: nextTotalAmount,
      remainder_amount: nextRemainderAmount,
    },
  })
}

async function getOrderForPaymentActions(orderId: string) {
  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, status, deposit_amount, remainder_amount, admin_notes, egg_payments(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return { order: null, error: 'Order not found' }
  }

  return { order: order as EggOrderPaymentView, error: null }
}

async function syncEggOrderStatus(orderId: string, reason: string | undefined) {
  const { order, error } = await getOrderForPaymentActions(orderId)
  if (error || !order) {
    return NextResponse.json({ error: error || 'Order not found' }, { status: 404 })
  }

  const nextStatus = deriveStatusFromPayments(
    order.status,
    order.egg_payments || [],
    order.remainder_amount || 0
  )

  const updatePayload: Record<string, unknown> = { status: nextStatus }
  if (nextStatus === 'delivered') {
    updatePayload.marked_delivered_at = new Date().toISOString()
  }

  const { error: updateError } = await supabaseAdmin
    .from('egg_orders')
    .update(updatePayload)
    .eq('id', orderId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to sync order status' }, { status: 500 })
  }

  if (nextStatus === 'fully_paid' || nextStatus === 'preparing' || nextStatus === 'shipped' || nextStatus === 'delivered') {
    await reconcileEggPaymentDependentFlowInstances(orderId, 'order_fully_paid')
  }

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: synced status to ${nextStatus}${reason ? ` - ${reason}` : ''}`
  )

  return NextResponse.json({ success: true, status: nextStatus })
}

async function markPaymentCompleted(
  orderId: string,
  paymentType: 'deposit' | 'remainder',
  reason: string | undefined
) {
  const { order, error } = await getOrderForPaymentActions(orderId)
  if (error || !order) {
    return NextResponse.json({ error: error || 'Order not found' }, { status: 404 })
  }

  const nowIso = new Date().toISOString()
  const payments = order.egg_payments || []

  if (paymentType === 'deposit') {
    let target = [...payments]
      .filter((payment) => payment.payment_type === 'deposit')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    if (!target) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('egg_payments')
        .insert({
          egg_order_id: orderId,
          payment_type: 'deposit',
          amount_nok: Math.round((order.deposit_amount || 0) / 100),
          status: 'completed',
          paid_at: nowIso,
          webhook_processed_at: nowIso,
        })
        .select('id')
        .single()

      if (insertError || !inserted) {
        return NextResponse.json({ error: 'Failed to create deposit payment' }, { status: 500 })
      }
    } else {
      const { error: updateError } = await supabaseAdmin
        .from('egg_payments')
        .update({ status: 'completed', paid_at: nowIso, webhook_processed_at: nowIso })
        .eq('id', target.id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to mark deposit paid' }, { status: 500 })
      }
    }
  } else {
    const paidRemainderOre =
      payments.reduce((sum, payment) => {
        if (payment.payment_type !== 'remainder' || payment.status !== 'completed') return sum
        return sum + (payment.amount_nok || 0) * 100
      }, 0) || 0

    const amountDueOre = Math.max(0, (order.remainder_amount || 0) - paidRemainderOre)
    if (amountDueOre <= 0) {
      return NextResponse.json({ error: 'Remainder already fully paid' }, { status: 400 })
    }

    const pending = [...payments]
      .filter((payment) => payment.payment_type === 'remainder' && payment.status !== 'completed')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    if (pending) {
      const { error: updateError } = await supabaseAdmin
        .from('egg_payments')
        .update({
          status: 'completed',
          amount_nok: Math.round(amountDueOre / 100),
          paid_at: nowIso,
          webhook_processed_at: nowIso,
        })
        .eq('id', pending.id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to mark remainder paid' }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('egg_payments')
        .insert({
          egg_order_id: orderId,
          payment_type: 'remainder',
          amount_nok: Math.round(amountDueOre / 100),
          status: 'completed',
          paid_at: nowIso,
          webhook_processed_at: nowIso,
          idempotency_key: `admin-manual-remainder-${orderId}-${Date.now()}`,
        })

      if (insertError) {
        return NextResponse.json({ error: 'Failed to create remainder payment' }, { status: 500 })
      }
    }
  }

  if (paymentType === 'deposit') {
    try {
      await finalizeConfirmedEggOrder(orderId)
    } catch (error) {
      // Inventory reservation failure should not block admin from marking payment.
      // The customer already paid — log warning and continue.
      logError('admin-egg-mark-payment-completed-reservation', error, {
        orderId,
        paymentType,
      })
      notifyInventoryOverallocation({
        orderId,
        orderNumber: order.order_number || orderId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        source: 'admin-mark-deposit-paid',
      }).catch(() => {})
    }
  }

  const synced = await syncEggOrderStatus(orderId, reason)
  if (!synced.ok) {
    return synced
  }

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: marked ${paymentType} as completed${reason ? ` - ${reason}` : ''}`
  )

  return NextResponse.json({ success: true })
}

async function markPaymentRefunded(
  orderId: string,
  paymentType: 'deposit' | 'remainder',
  reason: string | undefined
) {
  const { order, error } = await getOrderForPaymentActions(orderId)
  if (error || !order) {
    return NextResponse.json({ error: error || 'Order not found' }, { status: 404 })
  }

  const target = [...(order.egg_payments || [])]
    .filter((payment) => payment.payment_type === paymentType)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  if (!target) {
    return NextResponse.json({ error: `No ${paymentType} payment found` }, { status: 400 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('egg_payments')
    .update({ status: 'refunded' })
    .eq('id', target.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to mark payment refunded' }, { status: 500 })
  }

  if (paymentType === 'deposit') {
    await supabaseAdmin
      .from('egg_orders')
      .update({ status: 'pending' })
      .eq('id', orderId)
  } else {
    await syncEggOrderStatus(orderId, reason)
  }

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: marked ${paymentType} as refunded${reason ? ` - ${reason}` : ''}`
  )

  return NextResponse.json({ success: true })
}

const LIVE_STATUSES = new Set(['pending', 'deposit_paid', 'fully_paid', 'preparing', 'shipped', 'delivered'])

async function setEggOrderStatus(orderId: string, nextStatus: string, reason: string | undefined) {
  if (!nextStatus || typeof nextStatus !== 'string') {
    return NextResponse.json({ error: 'Missing status value' }, { status: 400 })
  }

  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select('id, status, admin_notes, marked_shipped_at, forfeited_at, inventory_id, quantity, egg_order_additions(inventory_id, quantity)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const isRestoreFromForfeit =
    (order.status === 'forfeited' || order.forfeited_at) &&
    LIVE_STATUSES.has(nextStatus)

  const updatePayload: Record<string, unknown> = { status: nextStatus }

  if (nextStatus === 'delivered') {
    updatePayload.marked_delivered_at = new Date().toISOString()
  }
  if (nextStatus === 'shipped' && !order.marked_shipped_at) {
    updatePayload.marked_shipped_at = new Date().toISOString()
  }

  // Restoring a forfeited order: clear forfeit markers
  if (isRestoreFromForfeit) {
    updatePayload.forfeited_at = null
    updatePayload.forfeit_reason = null
  }

  const { error: updateError } = await supabaseAdmin
    .from('egg_orders')
    .update(updatePayload)
    .eq('id', orderId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to set status' }, { status: 500 })
  }

  // Re-allocate inventory when restoring a forfeited/cancelled order to a live status
  if (isRestoreFromForfeit && (nextStatus === 'deposit_paid' || nextStatus === 'fully_paid' || nextStatus === 'pending')) {
    try {
      await allocateInventory(order.inventory_id, order.quantity)
      for (const addition of (order.egg_order_additions as any[]) || []) {
        await allocateInventory(addition.inventory_id, addition.quantity)
      }
    } catch (allocErr: any) {
      // Log but don't fail — admin is making a deliberate restore.
      // Inventory may be overallocated; surface in admin note.
      logError('admin-egg-restore-inventory', allocErr, { orderId })
      await appendAdminNote(
        orderId,
        order.admin_notes,
        `Admin: WARNING — inventory re-allocation failed on restore: ${allocErr?.message || 'unknown error'}`
      )
      notifyInventoryOverallocation({
        orderId,
        orderNumber: orderId,
        errorMessage: allocErr?.message || 'unknown',
        source: 'admin-restore-order',
      }).catch(() => {})
    }
  }

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: status set to ${nextStatus}${isRestoreFromForfeit ? ' (restored from forfeit — inventory re-allocated)' : ''}${reason ? ` - ${reason}` : ''}`
  )

  return NextResponse.json({ success: true })
}

async function refundDeposit(orderId: string, reason: string | undefined) {
  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, admin_notes, egg_payments(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const depositPayment = order.egg_payments?.find((p: any) => p.payment_type === 'deposit')

  if (depositPayment?.status === 'refunded') {
    return NextResponse.json({ error: 'Deposit already refunded' }, { status: 400 })
  }

  if (!depositPayment || depositPayment.status !== 'completed' || !depositPayment.vipps_order_id) {
    return NextResponse.json({ error: 'No completed deposit payment found' }, { status: 400 })
  }

  const refundResult = await initiateVippsRefund(
    depositPayment.vipps_order_id,
    depositPayment.amount_nok,
    `Refund deposit for egg order ${order.order_number}`
  )

  if (!refundResult.success) {
    return NextResponse.json({ error: refundResult.error || 'Vipps refund failed' }, { status: 500 })
  }

  await supabaseAdmin
    .from('egg_payments')
    .update({ status: 'refunded' })
    .eq('id', depositPayment.id)

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: refunded deposit${reason ? ` - ${reason}` : ''}`
  )

  return NextResponse.json({ success: true })
}

async function cancelEggOrder(orderId: string, reason: string | undefined, releaseStock: boolean) {
  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, admin_notes, inventory_id, quantity, egg_order_additions(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (releaseStock) {
    await releaseInventory(order.inventory_id, order.quantity)
    for (const addition of order.egg_order_additions || []) {
      await releaseInventory(addition.inventory_id, addition.quantity)
    }
  }

  await supabaseAdmin
    .from('egg_orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: cancelled${reason ? ` - ${reason}` : ''}${releaseStock ? '' : ' (inventory kept)'}`
  )

  return NextResponse.json({ success: true })
}

async function moveEggOrder(orderId: string, year: number, weekNumber: number, reason: string | undefined) {
  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, admin_notes, breed_id, inventory_id, quantity, egg_order_additions(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const { data: targetInventory, error: targetError } = await supabaseAdmin
    .from('egg_inventory')
    .select('id, eggs_available, eggs_allocated, delivery_monday, year, week_number')
    .eq('breed_id', order.breed_id)
    .eq('year', year)
    .eq('week_number', weekNumber)
    .maybeSingle()

  if (targetError || !targetInventory) {
    return NextResponse.json({ error: 'Target week not found for this breed' }, { status: 404 })
  }

  const additions: EggOrderAddition[] = order.egg_order_additions || []
  const targetByAdditionId = new Map<string, { id: string; quantity: number }>()
  const requiredByInventory = new Map<string, number>()

  requiredByInventory.set(
    targetInventory.id,
    (requiredByInventory.get(targetInventory.id) || 0) + order.quantity
  )

  for (const addition of additions) {
    const { data: additionInventory } = await supabaseAdmin
      .from('egg_inventory')
      .select('id, eggs_available, eggs_allocated')
      .eq('breed_id', addition.breed_id)
      .eq('year', year)
      .eq('week_number', weekNumber)
      .maybeSingle()

    if (!additionInventory) {
      return NextResponse.json({ error: 'Target week missing for additions' }, { status: 400 })
    }

    targetByAdditionId.set(addition.id, { id: additionInventory.id, quantity: addition.quantity })
    requiredByInventory.set(
      additionInventory.id,
      (requiredByInventory.get(additionInventory.id) || 0) + addition.quantity
    )
  }

  for (const [inventoryId, requiredQty] of Array.from(requiredByInventory.entries())) {
    const { data: inventory } = await supabaseAdmin
      .from('egg_inventory')
      .select('eggs_available, eggs_allocated')
      .eq('id', inventoryId)
      .single()

    if (!inventory) {
      return NextResponse.json({ error: 'Target inventory missing' }, { status: 400 })
    }

    const remaining = inventory.eggs_available - (inventory.eggs_allocated || 0)
    if (remaining < requiredQty) {
      return NextResponse.json({ error: 'Not enough inventory for move' }, { status: 400 })
    }
  }

  for (const [inventoryId, requiredQty] of Array.from(requiredByInventory.entries())) {
    await allocateInventory(inventoryId, requiredQty)
  }

  await releaseInventory(order.inventory_id, order.quantity)

  for (const addition of additions) {
    const target = targetByAdditionId.get(addition.id)
    if (!target) continue

    await releaseInventory(addition.inventory_id, addition.quantity)

    await supabaseAdmin
      .from('egg_order_additions')
      .update({ inventory_id: target.id })
      .eq('id', addition.id)
  }

  await supabaseAdmin
    .from('egg_orders')
    .update({
      inventory_id: targetInventory.id,
      week_number: targetInventory.week_number,
      year: targetInventory.year,
      delivery_monday: targetInventory.delivery_monday,
    })
    .eq('id', orderId)

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: moved to week ${weekNumber}/${year}${reason ? ` - ${reason}` : ''}`
  )

  return NextResponse.json({ success: true })
}

async function updateEggDelivery(
  orderId: string,
  deliveryMethod: string | undefined,
  deliveryFee: number | undefined,
  reason: string | undefined
) {
  if (!deliveryMethod || !Number.isFinite(deliveryFee)) {
    return NextResponse.json({ error: 'Invalid delivery data' }, { status: 400 })
  }

  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, admin_notes, subtotal, deposit_amount, status')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const { data: additions } = await supabaseAdmin
    .from('egg_order_additions')
    .select('subtotal')
    .eq('egg_order_id', orderId)

  const additionsTotal = (additions || []).reduce((sum, row: any) => sum + (row.subtotal || 0), 0)
  const nextBaseTotal = (order.subtotal || 0) + deliveryFee
  const nextTotal = nextBaseTotal + additionsTotal
  const nextRemainder = Math.max(0, nextTotal - (order.deposit_amount || 0))

  let nextStatus = order.status
  if (['deposit_paid', 'fully_paid'].includes(order.status)) {
    const { data: remainderPayments } = await supabaseAdmin
      .from('egg_payments')
      .select('amount_nok, status')
      .eq('egg_order_id', orderId)
      .eq('payment_type', 'remainder')
      .eq('status', 'completed')

    const remainderPaidOre =
      (remainderPayments || []).reduce((sum, p: any) => sum + (p.amount_nok || 0) * 100, 0) || 0
    nextStatus = remainderPaidOre >= nextRemainder ? 'fully_paid' : 'deposit_paid'
  }

  const { error: updateError } = await supabaseAdmin
    .from('egg_orders')
    .update({
      delivery_method: deliveryMethod,
      delivery_fee: deliveryFee,
      total_amount: nextTotal,
      remainder_amount: nextRemainder,
      status: nextStatus,
    })
    .eq('id', orderId)

  if (updateError) {
    logError('admin-egg-delivery-update', updateError)
    return NextResponse.json({ error: 'Failed to update delivery' }, { status: 500 })
  }

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: delivery updated to ${deliveryMethod} (${deliveryFee} ore)${reason ? ` - ${reason}` : ''}`
  )

  return NextResponse.json({ success: true })
}

async function markEggOrderShipped(
  orderId: string,
  trackingNumber: string | undefined,
  reason: string | undefined
) {
  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select(
      'id, order_number, customer_name, customer_email, status, delivery_method, admin_notes, tracking_number, quantity, price_per_egg, deposit_amount, remainder_amount, total_amount, week_number, delivery_monday, delivery_fee, egg_breeds(name), egg_order_additions(quantity, price_per_egg, subtotal, egg_breeds(name))'
    )
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.delivery_method !== 'posten') {
    return NextResponse.json({ error: 'Only available for Posten orders' }, { status: 400 })
  }

  if (!['fully_paid', 'preparing'].includes(order.status)) {
    return NextResponse.json({ error: 'Order must be fully paid or preparing' }, { status: 400 })
  }

  const raw = (trackingNumber || order.tracking_number || '').trim()
  if (!raw) {
    return NextResponse.json({ error: 'Tracking number required' }, { status: 400 })
  }

  // Normalise any Posten input format into a clean tracking ID + URL.
  // Accepts:
  //   1. Full URL  — https://sporing.posten.no/sporing/370722152417281240
  //   2. Item number or consignment number — 370722152417281240 (pure digits, 10+)
  //   3. Legacy ND/NO prefix — ND123456789NO
  function resolvePostenTracking(input: string): { trackingId: string; trackingUrl: string } | null {
    // Full sporing/tracking URL → extract the path segment after /sporing/
    const urlMatch = input.match(/^https?:\/\/(?:sporing|tracking)\.posten\.no\/sporing\/([^\s/?#]+)/i)
    if (urlMatch) {
      const id = urlMatch[1]
      return { trackingId: id, trackingUrl: `https://sporing.posten.no/sporing/${id}` }
    }
    // Pure numeric (item number / consignment number), 10+ digits
    if (/^\d{10,}$/.test(input)) {
      return { trackingId: input, trackingUrl: `https://sporing.posten.no/sporing/${input}` }
    }
    // Legacy ND/NO prefix codes
    if (/^(ND|NO)\d+$/i.test(input)) {
      const id = input.toUpperCase()
      return { trackingId: id, trackingUrl: `https://sporing.posten.no/sporing/${id}` }
    }
    return null
  }

  const resolved = resolvePostenTracking(raw)
  if (!resolved) {
    return NextResponse.json({ error: 'Invalid tracking number or link' }, { status: 400 })
  }
  const { trackingId, trackingUrl } = resolved

  const markedShippedAt = new Date().toISOString()
  const { error: updErr } = await supabaseAdmin
    .from('egg_orders')
    .update({
      status: 'shipped',
      tracking_number: trackingId,
      marked_shipped_at: markedShippedAt,
      marked_delivered_at: markedShippedAt, // Posten orders: shipped = done from admin side
    })
    .eq('id', orderId)

  if (updErr) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: marked shipped, tracking: ${trackingId}${reason ? ` - ${reason}` : ''}`
  )
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'https://tinglumgard.no'
  const eggSummaryNo = summarizeEggOrderLines(order as any, 'no')
  const eggSummaryEn = summarizeEggOrderLines(order as any, 'en')
  const orderLinesHtml = buildEggOrderLinesHtml(eggSummaryNo.lines, 'no', {
    deliveryFeeOre: Number((order as any)?.delivery_fee || 0),
    deliveryLabel: String((order as any)?.delivery_method || ''),
  })
  const orderLinesHtmlEn = buildEggOrderLinesHtml(eggSummaryEn.lines, 'en', {
    deliveryFeeOre: Number((order as any)?.delivery_fee || 0),
    deliveryLabel: String((order as any)?.delivery_method || ''),
  })
  const totalQuantity = eggSummaryNo.totalQuantity
  const deliveryDate = (order as any)?.delivery_monday
    ? new Date(`${(order as any).delivery_monday}T00:00:00`).toLocaleDateString('nb-NO')
    : ''

  try {
    const rendered = await renderManagedTemplate({
      templateKey: 'egg.order.shipped.customer',
      locale: 'no',
      variables: {
        customer_name: order.customer_name || 'Kunde',
        order_number: order.order_number,
        breed_name: eggSummaryNo.breedLabel || String((order as any)?.egg_breeds?.name || 'Rugeegg'),
        tracking_number: trackingId,
        tracking_url: trackingUrl,
        order_lines_html: orderLinesHtml,
        order_lines_html_en: orderLinesHtmlEn,
        total_quantity: totalQuantity,
        deposit_amount_nok: formatOreToNokWithPrefix((order as any).deposit_amount),
        remainder_amount_nok: formatOreToNokWithPrefix((order as any).remainder_amount),
        total_amount_nok: formatOreToNokWithPrefix((order as any).total_amount),
        delivery_week: (order as any).week_number || '',
        delivery_date: deliveryDate || '',
        order_url: buildCustomerOrderLink(appUrl, 'egg', String(orderId)),
        tip_index: 2,
      },
    })

    if (!rendered) {
      throw new Error('Missing template egg.order.shipped.customer')
    }

    await dispatchEmail({
      to: order.customer_email,
      subject: rendered.subject,
      html: rendered.html,
      classification: 'transactional',
      locale: 'no',
      sourcePath: '/api/admin/eggs/orders/[id]/actions',
      eggOrderId: orderId,
      templateKey: rendered.templateKey,
      metadata: {
        flow_key: 'egg.order.shipped.customer',
        tracking_number: trackingId,
      },
    })
  } catch (e) {
    logError('admin-egg-mark-shipped-email', e)
  }

  return NextResponse.json({ success: true, trackingNumber: trackingId })
}

const WISHLIST_DISCOUNT_FACTOR = 0.70 // 30% off

function buildWishlistRemainderEmail(options: {
  customerName: string
  orderNumber: string
  weekNumber: number
  items: Array<{ breedName: string; qty: number; discountedPriceOre: number; subtotalOre: number }>
  totalOre: number
  discountPct: number
  orderPageUrl: string
}): string {
  const { customerName, orderNumber, weekNumber, items, totalOre, discountPct, orderPageUrl } = options
  const firstName = customerName.trim().split(/\s+/)[0] || customerName
  const totalNok = Math.round(totalOre / 100)
  const totalQty = items.reduce((s, i) => s + i.qty, 0)

  const itemRowsHtml = items
    .map((item) => {
      const unitNok = Math.round(item.discountedPriceOre / 100)
      const subNok = Math.round(item.subtotalOre / 100)
      return `<tr>
        <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;border-bottom:1px solid #E8DFD5;">${item.breedName}</td>
        <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;border-bottom:1px solid #E8DFD5;text-align:center;">${item.qty} stk</td>
        <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1210;border-bottom:1px solid #E8DFD5;text-align:right;">kr ${unitNok}/egg</td>
        <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#2C1810;border-bottom:1px solid #E8DFD5;text-align:right;">kr ${subNok}</td>
      </tr>`
    })
    .join('')

  const tableHtml = `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border:1px solid #E8DFD5;border-radius:8px;overflow:hidden;margin:0 0 24px;">
    <thead>
      <tr style="background:#FAF8F5;">
        <th style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#6B5B4E;text-transform:uppercase;letter-spacing:0.4px;text-align:left;border-bottom:1px solid #E8DFD5;">Rase</th>
        <th style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#6B5B4E;text-transform:uppercase;letter-spacing:0.4px;text-align:center;border-bottom:1px solid #E8DFD5;">Antall</th>
        <th style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#6B5B4E;text-transform:uppercase;letter-spacing:0.4px;text-align:right;border-bottom:1px solid #E8DFD5;">Pris/egg</th>
        <th style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#6B5B4E;text-transform:uppercase;letter-spacing:0.4px;text-align:right;border-bottom:1px solid #E8DFD5;">Sum</th>
      </tr>
    </thead>
    <tbody>
      ${itemRowsHtml}
      <tr style="background:#FAF8F5;">
        <td colspan="3" style="padding:12px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#1C1210;text-align:right;">Restbeløp for ønskelistegg</td>
        <td style="padding:12px 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#2C1810;text-align:right;">kr ${totalNok}</td>
      </tr>
    </tbody>
  </table>`

  const body = [
    `<p style="margin:0 0 18px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:5px 14px;letter-spacing:0.4px;text-transform:uppercase;">Ønskelisten din er oppfylt ✓</span></p>`,
    `<p style="font-size:16px;line-height:1.6;margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">Hei ${firstName},</p>`,
    `<p style="font-size:16px;line-height:1.6;margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;color:#1C1210;">Vi hadde ekstra rugeegg tilgjengelig og har lagt <strong>${totalQty} egg</strong> til i bestillingen din (<strong>${orderNumber}</strong>, uke ${weekNumber}) — akkurat som du ønsket!</p>`,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;color:#6B5B4E;">Som takk for tålmodigheten får du <strong>${discountPct}% rabatt</strong> på disse eggene. Nedenfor ser du hva som er lagt til, og hva du skylder for ønskelisteggene.</p>`,
    tableHtml,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;color:#1C1210;font-weight:700;">Betal restbeløpet på Min side:</p>`,
    `<p style="font-size:14px;line-height:1.6;margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;color:#6B5B4E;">Restbeløpet på <strong>kr ${totalNok}</strong> er lagt til i bestillingen din. Logg inn på Min side for å betale enkelt og trygt med Vipps.</p>`,
    emailButton('Betal restbeløp på Min side', orderPageUrl, 'primary'),
    `<p style="font-size:13px;line-height:1.6;margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;color:#6B5B4E;">Har du spørsmål? Logg inn på Min side og ta kontakt.</p>`,
    emailDivider(),
    emailTipBox('eggs', 3),
    emailStoryFooter('eggs', 2),
  ].join('')

  return ensureHtmlDocument(
    body,
    'no',
    `Ønskelisten din er oppfylt — ${totalQty} egg lagt til i bestilling ${orderNumber}`,
    { productScope: 'eggs', classification: 'transactional' }
  )
}

async function fulfillWishlistItems(
  orderId: string,
  items: Array<{ wishlistItemId: string; breedId: string; qty: number }>,
  reason?: string
): Promise<NextResponse> {
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items provided' }, { status: 400 })
  }

  const validItems = items.filter(
    (item) => item.wishlistItemId && item.breedId && Number.isFinite(item.qty) && item.qty > 0
  )
  if (validItems.length === 0) {
    return NextResponse.json({ error: 'All items have qty 0' }, { status: 400 })
  }

  // Fetch order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, status, customer_email, customer_name, year, week_number, admin_notes, delivery_monday, remainder_amount, total_amount')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Fetch and validate wishlist items
  const wishlistItemIds = validItems.map((i) => i.wishlistItemId)
  const { data: dbWishlistItems, error: wishlistError } = await supabaseAdmin
    .from('egg_wishlist_items')
    .select('id, breed_id, qty_requested, qty_allocated, qty_remaining, request_id, egg_breeds(name, price_per_egg)')
    .in('id', wishlistItemIds)

  if (wishlistError || !dbWishlistItems || dbWishlistItems.length !== wishlistItemIds.length) {
    return NextResponse.json({ error: 'One or more wishlist items not found' }, { status: 404 })
  }

  const wishlistItemMap = new Map(dbWishlistItems.map((item) => [item.id, item]))
  const availabilityByBreed = await getFulfillmentAvailabilityByBreed({
    breedIds: validItems.map((item) => item.breedId),
    year: order.year,
    weekNumber: order.week_number,
    deliveryMonday: order.delivery_monday,
  })
  const remainingByBreed = new Map(
    Array.from(availabilityByBreed.entries()).map(([breedId, availability]) => [
      breedId,
      availability.remaining,
    ])
  )

  // Resolve inventory and build addition rows
  type AdditionRow = {
    breed_id: string
    inventory_id: string
    quantity: number
    price_per_egg: number
    subtotal: number
    breedName: string
  }
  const additions: AdditionRow[] = []

  for (const fulfillItem of validItems) {
    const dbItem = wishlistItemMap.get(fulfillItem.wishlistItemId)
    if (!dbItem) {
      return NextResponse.json({ error: `Wishlist item not found: ${fulfillItem.wishlistItemId}` }, { status: 404 })
    }

    const remaining = dbItem.qty_remaining ?? (dbItem.qty_requested - (dbItem.qty_allocated || 0))
    if (fulfillItem.qty > remaining) {
      return NextResponse.json({
        error: `Qty ${fulfillItem.qty} exceeds remaining ${remaining} for ${(dbItem as any).egg_breeds?.name || fulfillItem.breedId}`,
      }, { status: 400 })
    }

    const availability = availabilityByBreed.get(fulfillItem.breedId)
    if (!availability?.inventoryId) {
      return NextResponse.json({
        error: `No inventory found for this breed in week ${order.week_number}/${order.year}`,
      }, { status: 400 })
    }

    const eggsRemaining = remainingByBreed.get(fulfillItem.breedId) ?? 0
    if (eggsRemaining < fulfillItem.qty) {
      const breedName = String((dbItem as any).egg_breeds?.name || fulfillItem.breedId)
      const stockLabel = availability.source === 'actual_collected' ? 'collected eggs' : 'eggs'
      return NextResponse.json({
        error: `Not enough ${stockLabel} available for ${breedName}: need ${fulfillItem.qty}, have ${eggsRemaining}`,
      }, { status: 400 })
    }
    remainingByBreed.set(fulfillItem.breedId, Math.max(0, eggsRemaining - fulfillItem.qty))

    const fullPriceOre = Number((dbItem as any).egg_breeds?.price_per_egg || 0)
    const discountedPriceOre = Math.round(fullPriceOre * WISHLIST_DISCOUNT_FACTOR)
    const subtotalOre = fulfillItem.qty * discountedPriceOre

    additions.push({
      breed_id: fulfillItem.breedId,
      inventory_id: availability.inventoryId,
      quantity: fulfillItem.qty,
      price_per_egg: discountedPriceOre,
      subtotal: subtotalOre,
      breedName: String((dbItem as any).egg_breeds?.name || 'Rugeegg'),
    })
  }

  // All validations passed — execute

  // 1. Create egg_order_additions
  const { error: additionsError } = await supabaseAdmin
    .from('egg_order_additions')
    .insert(
      additions.map((a) => ({
        egg_order_id: orderId,
        breed_id: a.breed_id,
        inventory_id: a.inventory_id,
        quantity: a.quantity,
        price_per_egg: a.price_per_egg,
        subtotal: a.subtotal,
      }))
    )

  if (additionsError) {
    logError('fulfill-wishlist-additions-insert', additionsError)
    return NextResponse.json({ error: 'Failed to create order additions' }, { status: 500 })
  }

  // 2. Allocate inventory for each addition
  for (const addition of additions) {
    try {
      await allocateInventory(addition.inventory_id, addition.quantity)
    } catch (e) {
      logError('fulfill-wishlist-inventory-allocate', e)
    }
  }

  // 3. Update wishlist items qty_allocated
  for (const fulfillItem of validItems) {
    const dbItem = wishlistItemMap.get(fulfillItem.wishlistItemId)!
    const nextAllocated = (dbItem.qty_allocated || 0) + fulfillItem.qty
    await supabaseAdmin
      .from('egg_wishlist_items')
      .update({ qty_allocated: nextAllocated })
      .eq('id', fulfillItem.wishlistItemId)
  }

  // 4. Update parent wishlist request status
  const requestIds = Array.from(new Set(dbWishlistItems.map((item) => item.request_id).filter(Boolean)))
  for (const requestId of requestIds) {
    const { data: reqItems } = await supabaseAdmin
      .from('egg_wishlist_items')
      .select('id, qty_requested, qty_allocated')
      .eq('request_id', requestId)

    if (!reqItems) continue

    // Build a map of items we just updated so we can compute the accurate new remaining
    const updatesForRequest = new Map(
      validItems
        .filter((vi) => wishlistItemMap.get(vi.wishlistItemId)?.request_id === requestId)
        .map((vi) => [vi.wishlistItemId, vi.qty])
    )

    const totalRemaining = reqItems.reduce((sum, item) => {
      const additionalAllocation = updatesForRequest.get(item.id) || 0
      const newAllocated = (item.qty_allocated || 0) + additionalAllocation
      return sum + Math.max(0, (item.qty_requested || 0) - newAllocated)
    }, 0)

    const nextStatus = totalRemaining <= 0 ? 'allocated' : 'partially_allocated'
    await supabaseAdmin
      .from('egg_wishlist_requests')
      .update({ status: nextStatus })
      .eq('id', requestId)
  }

  // 5. Update order: add wishlist total to remainder_amount, set status back to deposit_paid
  const totalOre = additions.reduce((sum, a) => sum + a.subtotal, 0)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'https://tinglumgard.no'

  const currentRemainder = order.remainder_amount || 0
  const currentTotal = order.total_amount || 0

  const { error: updateOrderError } = await supabaseAdmin
    .from('egg_orders')
    .update({
      remainder_amount: currentRemainder + totalOre,
      total_amount: currentTotal + totalOre,
      status: 'deposit_paid',
    })
    .eq('id', orderId)

  if (updateOrderError) {
    logError('fulfill-wishlist-update-order', updateOrderError)
    return NextResponse.json({ error: 'Failed to update order remainder' }, { status: 500 })
  }

  // 6. Send wishlist remainder email
  const orderPageUrl = `${appUrl}/rugeegg/mine-bestillinger`
  try {
    const emailItems = additions.map((a) => ({
      breedName: a.breedName,
      qty: a.quantity,
      discountedPriceOre: a.price_per_egg,
      subtotalOre: a.subtotal,
    }))

    const emailHtml = buildWishlistRemainderEmail({
      customerName: order.customer_name || 'Kunde',
      orderNumber: order.order_number,
      weekNumber: order.week_number,
      items: emailItems,
      totalOre,
      discountPct: 30,
      orderPageUrl,
    })

    await dispatchEmail({
      to: order.customer_email,
      subject: `Ønskelisten din er oppfylt – restbeløp kr ${Math.round(totalOre / 100)} (${order.order_number})`,
      html: emailHtml,
      classification: 'transactional',
      locale: 'no',
      sourcePath: '/api/admin/eggs/orders/[id]/actions',
      eggOrderId: orderId,
      templateKey: 'egg.wishlist.remainder',
      metadata: { flow_key: 'egg.wishlist.remainder', total_ore: totalOre, discount_pct: 30 },
    })
  } catch (e) {
    logError('fulfill-wishlist-email', e)
  }

  // 7. Admin note
  const noteLines = additions.map((a) => `${a.quantity}× ${a.breedName} @ 70%`).join(', ')
  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: wishlist oppfylt — ${noteLines}, restbeløp +kr ${Math.round(totalOre / 100)} (30% rabatt), status → deposit_paid${reason ? ` - ${reason}` : ''}`
  )

  return NextResponse.json({ success: true, totalOre, remainderAmount: currentRemainder + totalOre })
}

async function sendWishlistRemainderEmail(
  orderId: string,
  sinceDate: string // ISO date — only include additions created on or after this
): Promise<NextResponse> {
  try {

  const { data: order, error: orderError } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, customer_name, customer_email, week_number, remainder_amount')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError || !order) return NextResponse.json({ error: 'Order not found', detail: orderError?.message }, { status: 404 })
  if (!order.customer_email || order.customer_email === 'pending@vipps.no') {
    return NextResponse.json({ error: 'No valid email' }, { status: 400 })
  }

  const { data: additions, error: addErr } = await supabaseAdmin
    .from('egg_order_additions')
    .select('quantity, price_per_egg, subtotal, breed_id')
    .eq('egg_order_id', orderId)
    .gte('created_at', sinceDate)

  if (addErr) return NextResponse.json({ error: 'additions fetch failed', detail: addErr.message }, { status: 500 })
  if (!additions || additions.length === 0) {
    return NextResponse.json({ error: 'No wishlist additions found for given date' }, { status: 400 })
  }

  const breedIds = [...new Set(additions.map((a) => a.breed_id))]
  const { data: breeds, error: breedErr } = await supabaseAdmin
    .from('egg_breeds')
    .select('id, name')
    .in('id', breedIds)
  if (breedErr) return NextResponse.json({ error: 'breeds fetch failed', detail: breedErr.message }, { status: 500 })
  const breedNameMap = new Map((breeds || []).map((b) => [b.id, b.name]))

  const items = additions.map((a) => ({
    breedName: breedNameMap.get(a.breed_id) || 'Ukjent rase',
    qty: a.quantity,
    discountedPriceOre: a.price_per_egg,
    subtotalOre: a.subtotal,
  }))

  const totalOre = items.reduce((sum, i) => sum + i.subtotalOre, 0)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no'

  let emailHtml: string
  try {
    emailHtml = buildWishlistRemainderEmail({
      customerName: order.customer_name || 'Kunde',
      orderNumber: order.order_number,
      weekNumber: order.week_number,
      items,
      totalOre,
      discountPct: 30,
      orderPageUrl: `${appUrl}/rugeegg/mine-bestillinger`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'buildEmail failed', detail: e?.message }, { status: 500 })
  }

  try {
    await dispatchEmail({
      to: order.customer_email,
      subject: `Ønskelisten din er oppfylt – restbeløp kr ${Math.round(totalOre / 100)} (${order.order_number})`,
      html: emailHtml,
      classification: 'transactional',
      locale: 'no',
      sourcePath: '/api/admin/eggs/orders/[id]/actions',
      eggOrderId: orderId,
      templateKey: 'egg.wishlist.remainder',
      metadata: { flow_key: 'egg.wishlist.remainder', total_ore: totalOre, discount_pct: 30 },
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'dispatchEmail failed', detail: e?.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, totalOre, sentTo: order.customer_email })

  } catch (e: any) {
    return NextResponse.json({ error: 'wishlist_remainder_unhandled', detail: e?.message }, { status: 500 })
  }
}

async function sendRemainderReminder(orderId: string) {
  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, customer_name, customer_email, week_number, remainder_amount, remainder_due_date, delivery_monday, egg_breeds(name)')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (!order.customer_email || order.customer_email === 'pending@vipps.no') {
    return NextResponse.json({ error: 'No valid email for this order' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no'
  const breedName = Array.isArray((order as any).egg_breeds)
    ? (order as any).egg_breeds[0]?.name || 'Rugeegg'
    : (order as any).egg_breeds?.name || 'Rugeegg'
  const remainderNok = Math.round((order.remainder_amount || 0) / 100).toLocaleString('nb-NO')
  const dueLabel = order.remainder_due_date
    ? new Date(order.remainder_due_date).toLocaleDateString('nb-NO')
    : new Date(order.delivery_monday).toLocaleDateString('nb-NO')

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:-apple-system,sans-serif;line-height:1.6;color:#111827}.container{max-width:600px;margin:0 auto;padding:20px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px}.title{font-size:20px;font-weight:700;margin-bottom:10px}.muted{color:#6b7280;font-size:14px}.amount{font-size:18px;font-weight:700;margin:12px 0}.button{display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none}</style>
</head>
<body><div class="container"><div class="card">
<div class="title">Påminnelse om restbetaling</div>
<p>Hei ${order.customer_name},</p>
<p class="muted">Bestilling ${order.order_number} · ${breedName} · Uke ${order.week_number}</p>
<div class="amount">Restbeløp: kr ${remainderNok}</div>
<p>Vennligst betal innen ${dueLabel} for å beholde bestillingen.</p>
<p><a class="button" href="${appUrl}/rugeegg/mine-bestillinger">Betal restbeløp</a></p>
</div></div></body></html>`

  await dispatchEmail({
    to: order.customer_email,
    subject: `Påminnelse om restbetaling - ${order.order_number}`,
    html,
  })

  return NextResponse.json({ success: true })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'refund_deposit':
        return await refundDeposit(params.id, data?.reason)
      case 'cancel_order':
        return await cancelEggOrder(params.id, data?.reason, data?.releaseInventory ?? true)
      case 'cancel_and_refund':
        {
          const refundResponse = await refundDeposit(params.id, data?.reason)
          if (!refundResponse.ok) {
            return refundResponse
          }
          return await cancelEggOrder(params.id, data?.reason, data?.releaseInventory ?? true)
        }
      case 'move_week':
        return await moveEggOrder(params.id, data?.year, data?.weekNumber, data?.reason)
      case 'update_delivery':
        return await updateEggDelivery(
          params.id,
          data?.deliveryMethod,
          data?.deliveryFee,
          data?.reason
        )
      case 'mark_deposit_paid':
        return await markPaymentCompleted(params.id, 'deposit', data?.reason)
      case 'mark_remainder_paid':
        return await markPaymentCompleted(params.id, 'remainder', data?.reason)
      case 'mark_deposit_refunded':
        return await markPaymentRefunded(params.id, 'deposit', data?.reason)
      case 'mark_remainder_refunded':
        return await markPaymentRefunded(params.id, 'remainder', data?.reason)
      case 'sync_status':
        return await syncEggOrderStatus(params.id, data?.reason)
      case 'set_status':
        return await setEggOrderStatus(params.id, data?.status, data?.reason)
      case 'mark_shipped':
        return await markEggOrderShipped(params.id, data?.trackingNumber, data?.reason)
      case 'adjust_order_lines':
        return await adjustEggOrderLines(params.id, data?.lines || [], data?.reason)
      case 'fulfill_wishlist':
        return await fulfillWishlistItems(params.id, data?.items || [], data?.reason)
      case 'send_remainder_reminder':
        return await sendRemainderReminder(params.id)
      case 'send_wishlist_remainder':
        return await sendWishlistRemainderEmail(params.id, data?.sinceDate || new Date().toISOString().slice(0, 10))
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    logError('admin-egg-actions', error)
    return NextResponse.json({ error: 'Failed to update egg order' }, { status: 500 })
  }
}

