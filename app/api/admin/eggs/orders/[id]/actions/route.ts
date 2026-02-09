import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { initiateVippsRefund } from '@/lib/vipps/refund'
import { logError } from '@/lib/logger'

interface EggOrderAddition {
  id: string
  breed_id: string
  inventory_id: string
  quantity: number
}

interface EggPaymentRow {
  id: string
  payment_type: 'deposit' | 'remainder'
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

const STATUS_LOCK = new Set(['preparing', 'shipped', 'delivered', 'cancelled', 'forfeited'])

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

async function setEggOrderStatus(orderId: string, nextStatus: string, reason: string | undefined) {
  if (!nextStatus || typeof nextStatus !== 'string') {
    return NextResponse.json({ error: 'Missing status value' }, { status: 400 })
  }

  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select('id, admin_notes')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const updatePayload: Record<string, unknown> = { status: nextStatus }
  if (nextStatus === 'delivered') {
    updatePayload.marked_delivered_at = new Date().toISOString()
  }

  const { error: updateError } = await supabaseAdmin
    .from('egg_orders')
    .update(updatePayload)
    .eq('id', orderId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to set status' }, { status: 500 })
  }

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin: status set to ${nextStatus}${reason ? ` - ${reason}` : ''}`
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
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    logError('admin-egg-actions', error)
    return NextResponse.json({ error: 'Failed to update egg order' }, { status: 500 })
  }
}
