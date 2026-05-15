import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

const VALID_BOX_SIZES = [8, 9, 10, 12] as const

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, customer_name, status, box_size, delivery_type, fresh_delivery, total_amount, deposit_amount, remainder_amount, created_at, payments(*)')
      .order('created_at', { ascending: false })

    if (error) {
      logError('admin-pork-demand-summary-fetch', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const allOrders = orders || []

    // By box size
    const byBoxSize: Record<string, number> = { '8kg': 0, '9kg': 0, '10kg': 0, '12kg': 0 }
    let totalKg = 0
    for (const order of allOrders) {
      const size = Number(order.box_size || 0)
      if (VALID_BOX_SIZES.includes(size as any)) {
        byBoxSize[`${size}kg`] = (byBoxSize[`${size}kg`] || 0) + 1
        totalKg += size
      }
    }

    // By delivery type
    const byDeliveryType: Record<string, number> = {
      pickup_farm: 0,
      pickup_e6: 0,
      delivery_trondheim: 0,
    }
    for (const order of allOrders) {
      const dt = String(order.delivery_type || '')
      if (dt in byDeliveryType) {
        byDeliveryType[dt] += 1
      }
    }

    // By status
    const byStatus: Record<string, number> = {
      pending: 0,
      deposit_paid: 0,
      paid: 0,
      ready_for_pickup: 0,
      delivered: 0,
      cancelled: 0,
    }
    for (const order of allOrders) {
      const s = String(order.status || '')
      if (s in byStatus) {
        byStatus[s] += 1
      }
    }

    // Fresh vs frozen
    const freshVsFrozen = { fresh: 0, frozen: 0 }
    for (const order of allOrders) {
      if (order.fresh_delivery) {
        freshVsFrozen.fresh += 1
      } else {
        freshVsFrozen.frozen += 1
      }
    }

    // Financial — pork amounts are stored in NOK (not øre)
    const REVENUE_STATUSES = new Set(['paid', 'ready_for_pickup', 'delivered', 'completed'])
    let totalRevenueNok = 0
    let outstandingRemainderNok = 0
    let depositCollectedNok = 0

    for (const order of allOrders) {
      const payments = (order.payments as any[] | null) || []

      const depositCompleted = payments
        .filter((p: any) => p.payment_type === 'deposit' && p.status === 'completed')
        .reduce((sum: number, p: any) => sum + Number(p.amount_nok || 0), 0)

      depositCollectedNok += depositCompleted

      if (REVENUE_STATUSES.has(String(order.status || ''))) {
        totalRevenueNok += Number(order.total_amount || 0)
      }

      if (order.status === 'deposit_paid') {
        const remainderPaidNok = payments
          .filter((p: any) => p.payment_type === 'remainder' && p.status === 'completed')
          .reduce((sum: number, p: any) => sum + Number(p.amount_nok || 0), 0)
        const amountDue = Math.max(0, Number(order.remainder_amount || 0) - remainderPaidNok)
        outstandingRemainderNok += amountDue
      }
    }

    // Recent orders (last 10)
    const recentOrders = allOrders.slice(0, 10).map((order) => ({
      order_number: order.order_number,
      customer_name: order.customer_name,
      status: order.status,
      box_size: order.box_size,
      delivery_type: order.delivery_type,
      created_at: order.created_at,
    }))

    return NextResponse.json({
      byBoxSize: { ...byBoxSize, totalKg },
      byDeliveryType,
      byStatus,
      freshVsFrozen,
      financial: {
        totalRevenueNok: Math.round(totalRevenueNok),
        outstandingRemainderNok: Math.round(outstandingRemainderNok),
        depositCollectedNok: Math.round(depositCollectedNok),
      },
      recentOrders,
    })
  } catch (error) {
    logError('admin-pork-demand-summary-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
