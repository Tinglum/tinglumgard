import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'

type EggPaymentRow = {
  payment_type: 'deposit' | 'remainder'
  status: string
  amount_nok: number
}

type EggOrderRow = {
  id: string
  quantity: number
  price_per_egg: number
  subtotal: number
  delivery_fee: number
  total_amount: number
  deposit_amount: number
  remainder_amount: number
  status: string
  inventory_id: string
  admin_notes: string | null
  egg_payments?: EggPaymentRow[] | null
  egg_order_additions?: Array<{ subtotal: number }> | null
}

const DELIVERY_METHODS = new Set(['posten', 'e6_pickup', 'farm_pickup'])
const MANUAL_STATUS_LOCK = new Set(['preparing', 'shipped', 'delivered', 'cancelled', 'forfeited'])

function toNonNegativeInt(value: unknown): number | null {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return null
  const rounded = Math.round(numberValue)
  if (rounded < 0) return null
  return rounded
}

function deriveStatusFromPayments(
  currentStatus: string,
  payments: EggPaymentRow[] = [],
  remainderTargetOre: number
): string {
  if (MANUAL_STATUS_LOCK.has(currentStatus)) {
    return currentStatus
  }

  const hasDepositCompleted = payments.some(
    (payment) => payment.payment_type === 'deposit' && payment.status === 'completed'
  )

  if (!hasDepositCompleted) {
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

async function fetchOrderWithRelations(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from('egg_orders')
    .select(
      '*, egg_breeds(*), egg_inventory(*), egg_payments(*), egg_order_additions(*, egg_breeds(*), egg_inventory(*))'
    )
    .eq('id', orderId)
    .maybeSingle()

  return { data, error }
}

async function adjustBaseInventoryAllocation(inventoryId: string, delta: number) {
  if (delta === 0) return

  const { data: inventory, error: inventoryError } = await supabaseAdmin
    .from('egg_inventory')
    .select('id, eggs_available, eggs_allocated, status')
    .eq('id', inventoryId)
    .single()

  if (inventoryError || !inventory) {
    throw new Error('Failed to load inventory')
  }

  const available = (inventory.eggs_available || 0) - (inventory.eggs_allocated || 0)
  if (delta > 0 && available < delta) {
    throw new Error('Not enough available inventory for quantity increase')
  }

  const nextAllocated = Math.max(0, (inventory.eggs_allocated || 0) + delta)
  const remainingAfter = (inventory.eggs_available || 0) - nextAllocated
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
    throw new Error('Failed to update inventory allocation')
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { data, error } = await fetchOrderWithRelations(params.id)
    if (error || !data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Failed to fetch admin egg order:', error)
    return NextResponse.json({ error: 'Failed to fetch egg order' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { data: existingOrderRaw, error: fetchError } = await fetchOrderWithRelations(params.id)

    if (fetchError || !existingOrderRaw) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const existingOrder = existingOrderRaw as EggOrderRow & Record<string, any>
    const updates: Record<string, unknown> = {}

    const simpleTextMapping: Array<[string, string]> = [
      ['customerName', 'customer_name'],
      ['customerEmail', 'customer_email'],
      ['customerPhone', 'customer_phone'],
      ['shippingName', 'shipping_name'],
      ['shippingEmail', 'shipping_email'],
      ['shippingPhone', 'shipping_phone'],
      ['shippingAddress', 'shipping_address'],
      ['shippingPostalCode', 'shipping_postal_code'],
      ['shippingCity', 'shipping_city'],
      ['shippingCountry', 'shipping_country'],
      ['notes', 'notes'],
      ['remainderDueDate', 'remainder_due_date'],
    ]

    for (const [inputKey, dbKey] of simpleTextMapping) {
      if (body[inputKey] !== undefined) {
        updates[dbKey] = body[inputKey]
      }
    }

    if (body.adminNotes !== undefined) {
      updates.admin_notes = String(body.adminNotes || '')
    }

    if (body.appendAdminNote !== undefined) {
      const appendText = String(body.appendAdminNote || '').trim()
      if (appendText) {
        const notePrefix = `Admin (${new Date().toISOString()}): `
        const existingNotes = (updates.admin_notes as string | undefined) ?? existingOrder.admin_notes ?? ''
        updates.admin_notes = [existingNotes, `${notePrefix}${appendText}`].filter(Boolean).join('\n')
      }
    }

    if (body.lockOrder !== undefined) {
      updates.locked_at = body.lockOrder ? new Date().toISOString() : null
    }

    if (body.markDelivered) {
      updates.marked_delivered_at = new Date().toISOString()
      updates.marked_delivered_by = session.userId
      updates.status = 'delivered'
    }

    let effectiveQuantity = existingOrder.quantity
    if (body.quantity !== undefined) {
      const nextQuantity = toNonNegativeInt(body.quantity)
      if (!nextQuantity || nextQuantity <= 0) {
        return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 })
      }

      if (nextQuantity !== existingOrder.quantity) {
        const delta = nextQuantity - existingOrder.quantity
        await adjustBaseInventoryAllocation(existingOrder.inventory_id, delta)
        effectiveQuantity = nextQuantity
        updates.quantity = nextQuantity
      }
    }

    let effectivePricePerEgg = existingOrder.price_per_egg
    if (body.pricePerEgg !== undefined) {
      const nextPrice = toNonNegativeInt(body.pricePerEgg)
      if (!nextPrice || nextPrice <= 0) {
        return NextResponse.json({ error: 'Price per egg must be positive' }, { status: 400 })
      }
      effectivePricePerEgg = nextPrice
      updates.price_per_egg = nextPrice
    }

    let effectiveDeliveryMethod = existingOrder.delivery_method
    if (body.deliveryMethod !== undefined) {
      const nextDeliveryMethod = String(body.deliveryMethod || '').trim()
      if (!DELIVERY_METHODS.has(nextDeliveryMethod)) {
        return NextResponse.json({ error: 'Invalid delivery method' }, { status: 400 })
      }
      effectiveDeliveryMethod = nextDeliveryMethod
      updates.delivery_method = nextDeliveryMethod
    }

    let effectiveDeliveryFee = existingOrder.delivery_fee
    if (body.deliveryFee !== undefined) {
      const nextDeliveryFee = toNonNegativeInt(body.deliveryFee)
      if (nextDeliveryFee === null) {
        return NextResponse.json({ error: 'Invalid delivery fee' }, { status: 400 })
      }
      effectiveDeliveryFee = nextDeliveryFee
      updates.delivery_fee = nextDeliveryFee
    } else if (body.deliveryMethod !== undefined) {
      if (effectiveDeliveryMethod === 'posten') effectiveDeliveryFee = 30000
      if (effectiveDeliveryMethod === 'e6_pickup') effectiveDeliveryFee = 20000
      if (effectiveDeliveryMethod === 'farm_pickup') effectiveDeliveryFee = 0
      updates.delivery_fee = effectiveDeliveryFee
    }

    const additionsTotal =
      (existingOrder.egg_order_additions || []).reduce((sum, addition) => sum + (addition.subtotal || 0), 0) || 0

    const nextSubtotal = effectiveQuantity * effectivePricePerEgg
    const computedTotal = nextSubtotal + effectiveDeliveryFee + additionsTotal
    const explicitTotalAmount = body.totalAmount !== undefined ? toNonNegativeInt(body.totalAmount) : null
    const nextTotalAmount = explicitTotalAmount === null ? computedTotal : explicitTotalAmount

    const explicitDepositAmount =
      body.depositAmount !== undefined ? toNonNegativeInt(body.depositAmount) : existingOrder.deposit_amount
    if (explicitDepositAmount === null) {
      return NextResponse.json({ error: 'Invalid deposit amount' }, { status: 400 })
    }

    const computedRemainder = Math.max(0, nextTotalAmount - explicitDepositAmount)
    const explicitRemainderAmount =
      body.remainderAmount !== undefined ? toNonNegativeInt(body.remainderAmount) : computedRemainder
    if (explicitRemainderAmount === null) {
      return NextResponse.json({ error: 'Invalid remainder amount' }, { status: 400 })
    }

    updates.subtotal = nextSubtotal
    updates.total_amount = nextTotalAmount
    updates.deposit_amount = explicitDepositAmount
    updates.remainder_amount = explicitRemainderAmount

    if (body.status !== undefined) {
      updates.status = String(body.status)
    } else if (!body.markDelivered && (body.syncStatus === true || Object.keys(updates).length > 0)) {
      updates.status = deriveStatusFromPayments(
        existingOrder.status,
        existingOrder.egg_payments || [],
        explicitRemainderAmount
      )
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, order: existingOrderRaw })
    }

    const { error: updateError } = await supabaseAdmin
      .from('egg_orders')
      .update(updates)
      .eq('id', params.id)

    if (updateError) {
      throw updateError
    }

    const { data: updatedOrder, error: refetchError } = await fetchOrderWithRelations(params.id)
    if (refetchError || !updatedOrder) {
      return NextResponse.json({ error: 'Order updated but refetch failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error: any) {
    console.error('Failed to patch admin egg order:', error)
    return NextResponse.json({ error: error?.message || 'Failed to update egg order' }, { status: 500 })
  }
}
