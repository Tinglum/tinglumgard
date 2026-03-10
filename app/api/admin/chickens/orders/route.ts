import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeChickenOrderFinancials<T extends Record<string, any>>(order: T): T {
  const additionsSubtotal = ((order.chicken_order_additions as Array<any> | undefined) || []).reduce(
    (sum, row) => sum + toNumber(row?.subtotal_nok),
    0
  )
  const baseByPricing =
    toNumber(order.quantity_hens) * toNumber(order.price_per_hen_nok) +
    toNumber(order.quantity_roosters) * toNumber(order.price_per_rooster_nok)
  const deliveryFee = toNumber(order.delivery_fee_nok)
  const totalAmount = toNumber(order.total_amount_nok)
  const expectedBaseFromTotal = Math.max(0, totalAmount - deliveryFee - additionsSubtotal)
  const shouldReconcile =
    totalAmount > 0 && Math.abs(baseByPricing + additionsSubtotal + deliveryFee - totalAmount) > 1
  const normalizedBase = shouldReconcile ? expectedBaseFromTotal : baseByPricing
  return {
    ...order,
    subtotal_nok: normalizedBase,
  }
}

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('chicken_orders')
      .select('*, chicken_breeds(name, slug, accent_color), chicken_hatches(hatch_date, initial_count), chicken_payments(*), chicken_order_additions(*, chicken_breeds(name, slug, accent_color))')
      .order('created_at', { ascending: false })

    if (error) {
      logError('admin-chicken-orders-get', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const normalizedOrders = ((data as Array<Record<string, any>> | null) || []).map((order) =>
      normalizeChickenOrderFinancials(order)
    )

    return NextResponse.json({ orders: normalizedOrders })
  } catch (error) {
    logError('admin-chicken-orders-get-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
