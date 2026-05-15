import { logError } from '@/lib/logger'
import { supabaseAdmin } from '@/lib/supabase/server'
import { markWaitlistPurchase } from '@/lib/eggs/waitlist'
import { VIPPS_PENDING_EMAIL } from '@/lib/constants'

type EggOrderAdditionRow = {
  inventory_id: string | null
  quantity: number | null
}

type EggOrderReservationRow = {
  id: string
  inventory_id: string | null
  quantity: number | null
  inventory_reserved_at: string | null
  customer_email: string | null
  customer_phone: string | null
  egg_order_additions?: EggOrderAdditionRow[] | null
}

type InventoryAdjustment = {
  inventoryId: string
  quantity: number
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

async function fetchOrderForReservation(orderId: string): Promise<EggOrderReservationRow> {
  const { data, error } = await supabaseAdmin
    .from('egg_orders')
    .select(
      'id, inventory_id, quantity, inventory_reserved_at, customer_email, customer_phone, egg_order_additions(inventory_id, quantity)'
    )
    .eq('id', orderId)
    .single()

  if (error || !data) {
    throw error || new Error('Order not found')
  }

  return data as EggOrderReservationRow
}

function collectReservationLines(order: EggOrderReservationRow): InventoryAdjustment[] {
  const grouped = new Map<string, number>()

  const pushLine = (inventoryId: string | null | undefined, quantity: number | null | undefined) => {
    if (!inventoryId) return
    const safeQuantity = Math.max(0, Math.round(Number(quantity || 0)))
    if (safeQuantity <= 0) return
    grouped.set(inventoryId, (grouped.get(inventoryId) || 0) + safeQuantity)
  }

  pushLine(order.inventory_id, order.quantity)

  for (const addition of order.egg_order_additions || []) {
    pushLine(addition.inventory_id, addition.quantity)
  }

  return Array.from(grouped.entries()).map(([inventoryId, quantity]) => ({
    inventoryId,
    quantity,
  }))
}

async function updateInventoryAllocationWithRetry(
  inventoryId: string,
  quantityDelta: number,
  context: string
): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: inventory, error } = await supabaseAdmin
      .from('egg_inventory')
      .select('id, eggs_available, eggs_allocated, status')
      .eq('id', inventoryId)
      .single()

    if (error || !inventory) {
      throw error || new Error(`Inventory ${inventoryId} not found`)
    }

    const currentAllocated = Number(inventory.eggs_allocated || 0)
    const nextAllocated = Math.max(0, currentAllocated + quantityDelta)
    const remaining = Number(inventory.eggs_available || 0) - currentAllocated

    if (quantityDelta > 0 && remaining < quantityDelta) {
      throw new Error(`Not enough eggs available for inventory ${inventoryId}`)
    }

    const remainingAfter = Number(inventory.eggs_available || 0) - nextAllocated
    const nextStatus =
      inventory.status === 'locked'
        ? 'locked'
        : remainingAfter <= 0
          ? 'sold_out'
          : 'open'

    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from('egg_inventory')
      .update({
        eggs_allocated: nextAllocated,
        status: nextStatus,
      })
      .eq('id', inventoryId)
      .eq('eggs_allocated', currentAllocated)
      .select('id')
      .maybeSingle()

    if (updateError) {
      throw updateError
    }

    if (updatedRow) {
      return
    }
  }

  throw new Error(`Concurrent inventory update conflict while processing ${context}`)
}

export async function validateEggOrderInventoryAvailability(orderId: string): Promise<void> {
  const order = await fetchOrderForReservation(orderId)

  if (order.inventory_reserved_at) {
    return
  }

  const lines = collectReservationLines(order)
  for (const line of lines) {
    const { data: inventory, error } = await supabaseAdmin
      .from('egg_inventory')
      .select('eggs_available, eggs_allocated')
      .eq('id', line.inventoryId)
      .single()

    if (error || !inventory) {
      throw error || new Error(`Inventory ${line.inventoryId} not found`)
    }

    const remaining = Number(inventory.eggs_available || 0) - Number(inventory.eggs_allocated || 0)
    if (remaining < line.quantity) {
      throw new Error('Selected eggs are no longer available')
    }
  }
}

async function claimReservation(orderId: string, claimedAt: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('egg_orders')
    .update({ inventory_reserved_at: claimedAt })
    .eq('id', orderId)
    .is('inventory_reserved_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

async function rollbackReservation(orderId: string, claimedAt: string, appliedLines: InventoryAdjustment[]) {
  for (const line of [...appliedLines].reverse()) {
    try {
      await updateInventoryAllocationWithRetry(line.inventoryId, -line.quantity, `rollback:${orderId}`)
    } catch (error) {
      logError('egg-order-reservation-rollback-failed', error, {
        orderId,
        inventoryId: line.inventoryId,
        quantity: line.quantity,
      })
    }
  }

  const { error } = await supabaseAdmin
    .from('egg_orders')
    .update({ inventory_reserved_at: null })
    .eq('id', orderId)
    .eq('inventory_reserved_at', claimedAt)

  if (error) {
    logError('egg-order-reservation-rollback-flag', error, { orderId })
  }
}

async function runNonBlockingPostDepositSideEffects(order: EggOrderReservationRow) {
  const normalizedEmail = normalizeEmail(order.customer_email)
  if (normalizedEmail && normalizedEmail !== VIPPS_PENDING_EMAIL) {
    const uniqueInventoryIds = Array.from(
      new Set(
        collectReservationLines(order)
          .map((line) => line.inventoryId)
          .filter(Boolean)
      )
    )

    for (const inventoryId of uniqueInventoryIds) {
      try {
        await markWaitlistPurchase({
          inventoryId,
          email: normalizedEmail,
          orderId: order.id,
        })
      } catch (error) {
        logError('egg-order-post-deposit-waitlist', error, {
          orderId: order.id,
          inventoryId,
        })
      }
    }

    try {
      await supabaseAdmin
        .from('customer_benefits')
        .upsert(
          {
            user_email: normalizedEmail,
            user_phone: normalizePhone(order.customer_phone),
            benefit_type: 'egg_customer_pork_discount',
            discount_percent: 10,
            granted_by_order_id: order.id,
            granted_by_order_type: 'egg',
          },
          { onConflict: 'user_email,benefit_type,granted_by_order_id' }
        )
        .throwOnError()
    } catch (error) {
      logError('egg-order-post-deposit-benefit', error, { orderId: order.id })
    }
  }
}

export async function finalizeConfirmedEggOrder(orderId: string): Promise<{ reservedNow: boolean }> {
  const order = await fetchOrderForReservation(orderId)

  let reservedNow = false
  const lines = collectReservationLines(order)

  if (!order.inventory_reserved_at && lines.length > 0) {
    const claimedAt = new Date().toISOString()
    const claimed = await claimReservation(orderId, claimedAt)

    if (claimed) {
      reservedNow = true
      const appliedLines: InventoryAdjustment[] = []
      try {
        for (const line of lines) {
          await updateInventoryAllocationWithRetry(line.inventoryId, line.quantity, `reserve:${orderId}`)
          appliedLines.push(line)
        }
      } catch (error) {
        await rollbackReservation(orderId, claimedAt, appliedLines)
        throw error
      }
    }
  }

  await runNonBlockingPostDepositSideEffects(order)

  return { reservedNow }
}
