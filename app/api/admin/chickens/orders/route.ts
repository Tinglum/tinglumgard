import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { dispatchEmail } from '@/lib/email/dispatch'
import { logError } from '@/lib/logger'
import { VIPPS_PENDING_EMAIL } from '@/lib/constants/app'

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

function csvSafe(value: unknown): string {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function getChickenPaymentState(order: Record<string, any>): string {
  const payments: Array<any> = Array.isArray(order.chicken_payments) ? order.chicken_payments : []
  const hasCompletedDeposit = payments.some(
    (p) => p?.payment_type === 'deposit' && p?.status === 'completed'
  )
  if (!hasCompletedDeposit) return 'deposit_pending'
  const remainderPaidNok = payments.reduce((sum, p) => {
    if (p?.payment_type !== 'remainder' || p?.status !== 'completed') return sum
    return sum + Math.round(Number(p?.amount_nok || 0))
  }, 0)
  const remainderDueNok = Math.max(0, Math.round(Number(order.remainder_amount_nok || 0)))
  if (remainderDueNok <= 0 || remainderPaidNok >= remainderDueNok) return 'fully_paid'
  return 'remainder_due'
}

function buildChickenCsv(orders: Array<Record<string, any>>): string {
  const header = [
    'Order Number',
    'Status',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Breed',
    'Hens',
    'Roosters',
    'Age Weeks',
    'Pickup Week',
    'Pickup Date',
    'Delivery Method',
    'Subtotal NOK',
    'Deposit NOK',
    'Remainder NOK',
    'Payment State',
    'Created At',
  ]

  const lines = orders.map((order) => {
    const normalized = normalizeChickenOrderFinancials(order)
    const paymentState = getChickenPaymentState(order)
    return [
      order.order_number,
      order.status,
      order.customer_name,
      order.customer_email,
      order.customer_phone || '',
      order.chicken_breeds?.name || '',
      order.quantity_hens ?? 0,
      order.quantity_roosters ?? 0,
      order.age_weeks_at_pickup ?? '',
      order.pickup_week ?? '',
      order.pickup_monday || '',
      order.delivery_method || '',
      normalized.subtotal_nok ?? 0,
      order.deposit_amount_nok ?? 0,
      order.remainder_amount_nok ?? 0,
      paymentState,
      order.created_at,
    ]
      .map((value) => csvSafe(value))
      .join(',')
  })

  return [header.join(','), ...lines].join('\n')
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim() || ''
  const statusFilter = searchParams.get('status') || 'all'
  const format = searchParams.get('format') || 'json'
  const page = Math.max(0, Number(searchParams.get('page') || '0'))
  const pageSize = format === 'csv' ? 10000 : 50

  try {
    let query = supabaseAdmin
      .from('chicken_orders')
      .select('*, chicken_breeds(name, slug, accent_color), chicken_hatches(hatch_date, initial_count), chicken_payments(*), chicken_order_additions(*, chicken_breeds(name, slug, accent_color), chicken_hatches(hatch_date))', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`
      )
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (format !== 'csv') {
      query = query.range(page * pageSize, page * pageSize + pageSize - 1)
    }

    const { data, error, count } = await query

    if (error) {
      logError('admin-chicken-orders-get', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const normalizedOrders = ((data as Array<Record<string, any>> | null) || []).map((order) =>
      normalizeChickenOrderFinancials(order)
    )

    if (format === 'csv') {
      const csv = buildChickenCsv((data as Array<Record<string, any>> | null) || [])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="chicken-orders-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    return NextResponse.json({ orders: normalizedOrders, total: count ?? 0, page, pageSize })
  } catch (error) {
    logError('admin-chicken-orders-get-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const action = body?.action as string
    const orderIds: string[] = Array.isArray(body?.orderIds)
      ? Array.from(new Set(body.orderIds.filter((id: unknown): id is string => typeof id === 'string')))
      : []

    if (!orderIds.length) {
      return NextResponse.json({ error: 'No order ids provided' }, { status: 400 })
    }

    if (action === 'set_status') {
      const nextStatus = body?.data?.status as string | undefined
      if (!nextStatus) {
        return NextResponse.json({ error: 'Missing status' }, { status: 400 })
      }

      const { error } = await supabaseAdmin
        .from('chicken_orders')
        .update({ status: nextStatus })
        .in('id', orderIds)

      if (error) throw error

      return NextResponse.json({ success: true, affected: orderIds.length })
    }

    if (action === 'append_admin_note') {
      const noteText = String(body?.data?.note || '').trim()
      if (!noteText) {
        return NextResponse.json({ error: 'Missing note text' }, { status: 400 })
      }

      const { data: existingRows, error: fetchError } = await supabaseAdmin
        .from('chicken_orders')
        .select('id, admin_notes')
        .in('id', orderIds)

      if (fetchError) throw fetchError

      for (const row of existingRows || []) {
        const timestamp = new Date().toISOString()
        const nextNotes = [row.admin_notes, `Admin bulk note (${timestamp}): ${noteText}`]
          .filter(Boolean)
          .join('\n')
        await supabaseAdmin
          .from('chicken_orders')
          .update({ admin_notes: nextNotes })
          .eq('id', row.id)
      }

      return NextResponse.json({ success: true, affected: (existingRows || []).length })
    }

    if (action === 'lock_orders' || action === 'unlock_orders') {
      const lockedAt = action === 'lock_orders' ? new Date().toISOString() : null
      const { error } = await supabaseAdmin
        .from('chicken_orders')
        .update({ locked_at: lockedAt })
        .in('id', orderIds)

      if (error) throw error

      return NextResponse.json({ success: true, affected: orderIds.length })
    }

    if (action === 'export_production') {
      const { data: orders, error } = await supabaseAdmin
        .from('chicken_orders')
        .select('*, chicken_breeds(name, slug), chicken_hatches(hatch_date), chicken_payments(*), chicken_order_additions(*, chicken_breeds(name, slug), chicken_hatches(hatch_date))')
        .in('id', orderIds)
        .order('pickup_monday', { ascending: true })

      if (error) throw error

      const allOrders = (orders || []) as Array<Record<string, any>>

      // Per-hatch summary
      type HatchSummary = { hatchDate: string; breedName: string; hens: number; roosters: number; customers: number }
      const hatchMap = new Map<string, HatchSummary>()

      for (const order of allOrders) {
        const hatchId: string = order.hatch_id || 'unknown'
        const hatchDate: string = order.chicken_hatches?.hatch_date || ''
        const breedName: string = order.chicken_breeds?.name || 'Unknown'
        const existing = hatchMap.get(hatchId) ?? { hatchDate, breedName, hens: 0, roosters: 0, customers: 0 }
        existing.hens += Number(order.quantity_hens || 0)
        existing.roosters += Number(order.quantity_roosters || 0)
        existing.customers += 1
        hatchMap.set(hatchId, existing)

        for (const addition of order.chicken_order_additions || []) {
          const addBreedName: string = addition.chicken_breeds?.name || breedName
          const addHatchId: string = addition.hatch_id || hatchId
          const addHatchDate: string = addition.chicken_hatches?.hatch_date || hatchDate
          const addExisting = hatchMap.get(addHatchId) ?? { hatchDate: addHatchDate, breedName: addBreedName, hens: 0, roosters: 0, customers: 0 }
          addExisting.hens += Number(addition.quantity_hens || 0)
          addExisting.roosters += Number(addition.quantity_roosters || 0)
          hatchMap.set(addHatchId, addExisting)
        }
      }

      const hatchSummary = Array.from(hatchMap.entries()).map(([hatchId, summary]) => ({
        hatch_id: hatchId,
        ...summary,
        total_birds: summary.hens + summary.roosters,
      }))

      // Per-customer lines
      const customerLines = allOrders.map((order) => {
        const normalized = normalizeChickenOrderFinancials(order)
        const paymentState = getChickenPaymentState(order)
        const additions = (order.chicken_order_additions || []).map((a: Record<string, any>) => ({
          breed: a.chicken_breeds?.name || '',
          hens: a.quantity_hens || 0,
          roosters: a.quantity_roosters || 0,
          subtotal_nok: Number(a.subtotal_nok || 0),
        }))
        return {
          order_number: order.order_number,
          customer_name: order.customer_name,
          breed: order.chicken_breeds?.name || '',
          hens: order.quantity_hens || 0,
          roosters: order.quantity_roosters || 0,
          pickup_monday: order.pickup_monday || '',
          delivery_method: order.delivery_method || '',
          total_amount_nok: Number(order.total_amount_nok || 0),
          deposit_nok: Number(order.deposit_amount_nok || 0),
          remainder_nok: Number(order.remainder_amount_nok || 0),
          payment_state: paymentState,
          admin_notes: order.admin_notes || '',
          additions,
        }
      })

      const totals = {
        orders: allOrders.length,
        total_hens: hatchSummary.reduce((s, h) => s + h.hens, 0),
        total_roosters: hatchSummary.reduce((s, h) => s + h.roosters, 0),
        total_birds: hatchSummary.reduce((s, h) => s + h.total_birds, 0),
        total_revenue_nok: customerLines.reduce((s, l) => s + l.total_amount_nok, 0),
        outstanding_remainder_nok: customerLines
          .filter((l) => l.payment_state === 'remainder_due')
          .reduce((s, l) => s + l.remainder_nok, 0),
      }

      return NextResponse.json({ success: true, hatch_summary: hatchSummary, customer_lines: customerLines, totals })
    }

    if (action === 'send_email') {
      const subject = String(body?.data?.subject || '').trim()
      const message = String(body?.data?.message || '').trim()
      if (!subject || !message) {
        return NextResponse.json({ error: 'Missing subject or message' }, { status: 400 })
      }

      const { data: emailOrders } = await supabaseAdmin
        .from('chicken_orders')
        .select('id, customer_name, customer_email, order_number')
        .in('id', orderIds)

      const results: Array<{ order_number: string; success: boolean }> = []
      for (const order of emailOrders || []) {
        if (!order.customer_email || order.customer_email === VIPPS_PENDING_EMAIL) continue
        try {
          await dispatchEmail({
            to: order.customer_email,
            subject: subject.replace('{ORDER_NUMBER}', order.order_number),
            html: `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#333">
              <div style="max-width:600px;margin:0 auto;padding:20px">
                <h2 style="color:#2C1810">Tinglumgard</h2>
                <p>Hei ${order.customer_name},</p>
                ${message.replace('{ORDER_NUMBER}', order.order_number).replace('{CUSTOMER_NAME}', order.customer_name)}
                <p>Vennlig hilsen,<br>Tinglumgard</p>
              </div></body></html>`,
            classification: 'support',
            sourcePath: '/api/admin/chickens/orders',
            chickenOrderId: order.id,
          })
          results.push({ order_number: order.order_number, success: true })
        } catch (e) {
          results.push({ order_number: order.order_number, success: false })
        }
      }

      return NextResponse.json({
        success: true,
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    logError('admin-chicken-orders-bulk-action', error)
    return NextResponse.json({ error: 'Failed to execute bulk action' }, { status: 500 })
  }
}
