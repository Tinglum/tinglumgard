import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { dispatchEmail } from '@/lib/email/dispatch'
import { logError } from '@/lib/logger'
import { VIPPS_PENDING_EMAIL } from '@/lib/constants/app'

type EggPaymentType = 'deposit' | 'addition_deposit' | 'remainder'
type EggPaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

type EggPaymentRow = {
  id: string
  payment_type: EggPaymentType
  status: EggPaymentStatus | string
  amount_nok: number
  paid_at: string | null
  created_at: string
}

type EggOrderRow = {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  shipping_name?: string | null
  shipping_email?: string | null
  shipping_phone?: string | null
  shipping_address?: string | null
  shipping_postal_code?: string | null
  shipping_city?: string | null
  shipping_country?: string | null
  quantity: number
  price_per_egg: number
  subtotal: number
  delivery_fee: number
  total_amount: number
  deposit_amount: number
  remainder_amount: number
  delivery_method: string
  year: number
  week_number: number
  delivery_monday: string
  remainder_due_date: string | null
  status: string
  notes: string | null
  admin_notes: string | null
  locked_at: string | null
  marked_delivered_at: string | null
  created_at: string
  updated_at?: string
  egg_breeds?: { id: string; name: string; slug?: string } | null
  egg_inventory?: { id: string; status?: string | null } | null
  egg_payments?: EggPaymentRow[] | null
  egg_order_additions?: Array<{ subtotal: number }> | null
}

type PaymentState =
  | 'deposit_pending'
  | 'remainder_due'
  | 'fully_paid'
  | 'refunded'
  | 'failed'

const TERMINAL_STATUSES = new Set(['cancelled', 'forfeited', 'delivered'])

function getCompletedRemainderOre(order: EggOrderRow): number {
  return (
    (order.egg_payments || []).reduce((sum, payment) => {
      if (payment.payment_type !== 'remainder' || payment.status !== 'completed') return sum
      return sum + (payment.amount_nok || 0) * 100
    }, 0) || 0
  )
}

function hasCompletedDeposit(order: EggOrderRow): boolean {
  return (order.egg_payments || []).some(
    (payment) => payment.payment_type === 'deposit' && payment.status === 'completed'
  )
}

function hasRefundedPayment(order: EggOrderRow): boolean {
  return (order.egg_payments || []).some((payment) => payment.status === 'refunded')
}

function hasFailedPayment(order: EggOrderRow): boolean {
  return (order.egg_payments || []).some((payment) => payment.status === 'failed')
}

function getAmountDueOre(order: EggOrderRow): number {
  const remainderPaidOre = getCompletedRemainderOre(order)
  return Math.max(0, (order.remainder_amount || 0) - remainderPaidOre)
}

function getPaymentState(order: EggOrderRow): PaymentState {
  if (hasRefundedPayment(order)) return 'refunded'
  if (!hasCompletedDeposit(order)) {
    return hasFailedPayment(order) ? 'failed' : 'deposit_pending'
  }

  const amountDue = getAmountDueOre(order)
  if (amountDue <= 0) return 'fully_paid'
  return hasFailedPayment(order) ? 'failed' : 'remainder_due'
}

function isAtRisk(order: EggOrderRow): boolean {
  if (TERMINAL_STATUSES.has(order.status)) return false
  const amountDue = getAmountDueOre(order)
  if (amountDue <= 0) return false
  if (!order.remainder_due_date) return false

  const dueDate = new Date(order.remainder_due_date)
  const today = new Date(new Date().toISOString().split('T')[0])
  const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= 2
}

function isShippingMissing(order: EggOrderRow): boolean {
  if (order.delivery_method !== 'posten') return false
  if (['shipped', 'delivered', 'cancelled', 'forfeited'].includes(order.status)) return false
  const hasShippingName = Boolean(String(order.shipping_name || order.customer_name || '').trim())
  const hasShippingPhone = Boolean(String(order.shipping_phone || order.customer_phone || '').trim())
  const hasShippingAddress = Boolean(String(order.shipping_address || '').trim())
  const hasShippingPostalCode = Boolean(String(order.shipping_postal_code || '').trim())
  const hasShippingCity = Boolean(String(order.shipping_city || '').trim())
  return !(hasShippingName && hasShippingPhone && hasShippingAddress && hasShippingPostalCode && hasShippingCity)
}

function csvSafe(value: unknown): string {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function buildCsv(orders: EggOrderRow[]): string {
  const header = [
    'Order Number',
    'Status',
    'Payment State',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Breed',
    'Quantity',
    'Year',
    'Week',
    'Delivery Date',
    'Delivery Method',
    'Subtotal Ore',
    'Delivery Fee Ore',
    'Total Ore',
    'Deposit Ore',
    'Remainder Ore',
    'Remainder Due Ore',
    'Created At',
  ]

  const lines = orders.map((order) => {
    const paymentState = getPaymentState(order)
    const amountDue = getAmountDueOre(order)
    return [
      order.order_number,
      order.status,
      paymentState,
      order.customer_name,
      order.customer_email,
      order.customer_phone || '',
      order.egg_breeds?.name || '',
      order.quantity,
      order.year,
      order.week_number,
      order.delivery_monday || '',
      order.delivery_method,
      order.subtotal,
      order.delivery_fee,
      order.total_amount,
      order.deposit_amount,
      order.remainder_amount,
      amountDue,
      order.created_at,
    ]
      .map((value) => csvSafe(value))
      .join(',')
  })

  return [header.join(','), ...lines].join('\n')
}

function sortOrders(orders: EggOrderRow[], sortBy: string): EggOrderRow[] {
  const sorted = [...orders]
  sorted.sort((a, b) => {
    if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    if (sortBy === 'customer_asc') {
      return (a.customer_name || '').localeCompare(b.customer_name || '', 'nb')
    }
    if (sortBy === 'customer_desc') {
      return (b.customer_name || '').localeCompare(a.customer_name || '', 'nb')
    }
    if (sortBy === 'delivery_asc') {
      return new Date(a.delivery_monday).getTime() - new Date(b.delivery_monday).getTime()
    }
    if (sortBy === 'delivery_desc') {
      return new Date(b.delivery_monday).getTime() - new Date(a.delivery_monday).getTime()
    }
    if (sortBy === 'payment_asc' || sortBy === 'payment_desc') {
      const paymentOrder: Record<string, number> = { deposit_pending: 0, remainder_due: 1, fully_paid: 2 }
      const aState = getPaymentSortKey(a)
      const bState = getPaymentSortKey(b)
      const aVal = paymentOrder[aState] ?? 3
      const bVal = paymentOrder[bState] ?? 3
      return sortBy === 'payment_asc' ? aVal - bVal : bVal - aVal
    }
    if (sortBy === 'status_asc') {
      return (a.status || '').localeCompare(b.status || '')
    }
    if (sortBy === 'status_desc') {
      return (b.status || '').localeCompare(a.status || '')
    }
    if (sortBy === 'amount_asc') {
      return (a.total_amount || 0) - (b.total_amount || 0)
    }
    if (sortBy === 'amount_desc') {
      return (b.total_amount || 0) - (a.total_amount || 0)
    }
    if (sortBy === 'week_asc') {
      return a.year === b.year ? a.week_number - b.week_number : a.year - b.year
    }
    if (sortBy === 'week_desc') {
      return a.year === b.year ? b.week_number - a.week_number : b.year - a.year
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  return sorted
}

function getPaymentSortKey(order: EggOrderRow): string {
  const payments = (order as any).egg_payments || []
  const hasDeposit = payments.some((p: any) => p.payment_type === 'deposit' && p.status === 'completed')
  if (!hasDeposit) return 'deposit_pending'
  const remainderPaid = payments
    .filter((p: any) => p.payment_type === 'remainder' && p.status === 'completed')
    .reduce((sum: number, p: any) => sum + (p.amount_nok || 0) * 100, 0)
  if (remainderPaid >= (order.remainder_amount || 0) && (order.remainder_amount || 0) > 0) return 'fully_paid'
  return 'remainder_due'
}

async function appendAdminNote(orderId: string, existingNotes: string | null, note: string) {
  const nextNotes = [existingNotes, note].filter(Boolean).join('\n')
  await supabaseAdmin.from('egg_orders').update({ admin_notes: nextNotes }).eq('id', orderId)
}

async function updateDeliveryForOrder(
  orderId: string,
  deliveryMethod: string,
  deliveryFee: number,
  reason?: string
) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('egg_orders')
    .select('id, admin_notes, subtotal, deposit_amount, status')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new Error('Order not found')
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
  if (['deposit_paid', 'fully_paid', 'pending'].includes(order.status)) {
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
    throw new Error('Failed to update delivery')
  }

  await appendAdminNote(
    orderId,
    order.admin_notes,
    `Admin bulk: delivery updated to ${deliveryMethod} (${deliveryFee} ore)${
      reason ? ` - ${reason}` : ''
    }`
  )
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const status = searchParams.get('status') || 'all'
    const delivery = searchParams.get('delivery') || 'all'
    const payment = searchParams.get('payment') || 'all'
    const week = searchParams.get('week') || 'all'
    const sortBy = searchParams.get('sort') || 'newest'
    const atRiskOnly = searchParams.get('atRisk') === 'true'
    const format = searchParams.get('format') || 'json'

    let query = supabaseAdmin
      .from('egg_orders')
      .select(
        '*, egg_breeds(*), egg_inventory(*), egg_payments(*), egg_order_additions(*, egg_breeds(*), egg_inventory(*))'
      )

    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,customer_phone.ilike.%${search}%`
      )
    }

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (delivery !== 'all') {
      query = query.eq('delivery_method', delivery)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) {
      throw error
    }

    const allOrders: EggOrderRow[] = (data || []) as EggOrderRow[]

    let filtered = allOrders

    if (week !== 'all') {
      filtered = filtered.filter((order) => `${order.year}-${order.week_number}` === week)
    }

    if (payment !== 'all') {
      filtered = filtered.filter((order) => getPaymentState(order) === payment)
    }

    if (atRiskOnly) {
      filtered = filtered.filter((order) => isAtRisk(order))
    }

    filtered = sortOrders(filtered, sortBy)

    const availableWeeks = Array.from(
      new Set(allOrders.map((order) => `${order.year}-${order.week_number}`))
    )
      .map((value) => {
        const [yearText, weekText] = value.split('-')
        const yearValue = Number(yearText)
        const weekValue = Number(weekText)
        return {
          value,
          year: yearValue,
          week: weekValue,
          label: `Uke ${weekValue} (${yearValue})`,
        }
      })
      .sort((a, b) => (a.year === b.year ? a.week - b.week : a.year - b.year))

    const summary = {
      totalOrders: allOrders.length,
      filteredOrders: filtered.length,
      pendingDeposit: allOrders.filter((order) => getPaymentState(order) === 'deposit_pending').length,
      remainderDue: allOrders.filter((order) => getPaymentState(order) === 'remainder_due').length,
      fullyPaid: allOrders.filter((order) => getPaymentState(order) === 'fully_paid').length,
      refunded: allOrders.filter((order) => getPaymentState(order) === 'refunded').length,
      failedPayments: allOrders.filter((order) => getPaymentState(order) === 'failed').length,
      atRisk: allOrders.filter((order) => isAtRisk(order)).length,
      shippingMissing: allOrders.filter((order) => isShippingMissing(order)).length,
      revenueOre: allOrders
        .filter((order) => getPaymentState(order) === 'fully_paid')
        .reduce((sum, order) => sum + (order.total_amount || 0), 0),
      outstandingOre: allOrders.reduce((sum, order) => sum + getAmountDueOre(order), 0),
    }

    if (format === 'csv') {
      const csv = buildCsv(filtered)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="egg-orders-${new Date()
            .toISOString()
            .split('T')[0]}.csv"`,
        },
      })
    }

    return NextResponse.json({
      orders: filtered,
      summary,
      availableWeeks,
    })
  } catch (error: any) {
    logError('admin-eggs-orders-get', error)
    return NextResponse.json({ error: 'Failed to list egg orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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

      const updatePayload: Record<string, unknown> = { status: nextStatus }
      if (nextStatus === 'delivered') {
        updatePayload.marked_delivered_at = new Date().toISOString()
      }

      const { error } = await supabaseAdmin
        .from('egg_orders')
        .update(updatePayload)
        .in('id', orderIds)

      if (error) {
        throw error
      }

      return NextResponse.json({ success: true, affected: orderIds.length })
    }

    if (action === 'append_admin_note') {
      const noteText = String(body?.data?.note || '').trim()
      if (!noteText) {
        return NextResponse.json({ error: 'Missing note text' }, { status: 400 })
      }

      const { data: existingRows, error: fetchError } = await supabaseAdmin
        .from('egg_orders')
        .select('id, admin_notes')
        .in('id', orderIds)

      if (fetchError) {
        throw fetchError
      }

      for (const row of existingRows || []) {
        await appendAdminNote(
          row.id,
          row.admin_notes,
          `Admin bulk note (${new Date().toISOString()}): ${noteText}`
        )
      }

      return NextResponse.json({ success: true, affected: (existingRows || []).length })
    }

    if (action === 'set_delivery') {
      const deliveryMethod = String(body?.data?.deliveryMethod || '').trim()
      const deliveryFee = Number(body?.data?.deliveryFee)
      const reason = String(body?.data?.reason || '').trim() || undefined

      if (!deliveryMethod || !Number.isFinite(deliveryFee)) {
        return NextResponse.json({ error: 'Invalid delivery data' }, { status: 400 })
      }

      const failures: Array<{ orderId: string; error: string }> = []
      let updated = 0
      for (const orderId of orderIds) {
        try {
          await updateDeliveryForOrder(orderId, deliveryMethod, deliveryFee, reason)
          updated += 1
        } catch (error: any) {
          failures.push({ orderId, error: error?.message || 'Failed to update delivery' })
        }
      }

      return NextResponse.json({
        success: failures.length === 0,
        affected: updated,
        failures,
      })
    }

    if (action === 'lock_orders' || action === 'unlock_orders') {
      const lockedAt = action === 'lock_orders' ? new Date().toISOString() : null
      const { error } = await supabaseAdmin
        .from('egg_orders')
        .update({ locked_at: lockedAt })
        .in('id', orderIds)

      if (error) throw error

      return NextResponse.json({ success: true, affected: orderIds.length })
    }

    if (action === 'delete_orders') {
      const DELETABLE_STATUSES = new Set(['pending', 'cancelled', 'forfeited'])
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const uuids = orderIds.filter((id) => UUID_RE.test(id))
      const orderNumbers = orderIds.filter((id) => !UUID_RE.test(id))

      // Resolve order numbers to rows
      let query = supabaseAdmin
        .from('egg_orders')
        .select('id, order_number, status, inventory_id, quantity')
      if (uuids.length && orderNumbers.length) {
        query = query.or(`id.in.(${uuids.join(',')}),order_number.in.(${orderNumbers.join(',')})`)
      } else if (uuids.length) {
        query = query.in('id', uuids)
      } else {
        query = query.in('order_number', orderNumbers)
      }

      const { data: toDelete, error: fetchError } = await query

      if (fetchError) throw fetchError

      const blocked = (toDelete || []).filter((o) => !DELETABLE_STATUSES.has(o.status))
      if (blocked.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot delete orders that are not in pending/cancelled/forfeited status',
            blocked: blocked.map((o) => ({ id: o.id, order_number: o.order_number, status: o.status })),
          },
          { status: 400 }
        )
      }

      const safeIds = (toDelete || []).map((o) => o.id)
      if (safeIds.length === 0) {
        return NextResponse.json({ success: true, affected: 0 })
      }

      // Release inventory for any pending orders being deleted
      const pendingOrders = (toDelete || []).filter((o) => o.status === 'pending')
      for (const order of pendingOrders) {
        const { data: inv } = await supabaseAdmin
          .from('egg_inventory')
          .select('eggs_allocated, eggs_available, status')
          .eq('id', order.inventory_id)
          .maybeSingle()

        if (inv) {
          const nextAllocated = Math.max(0, (inv.eggs_allocated || 0) - order.quantity)
          const remaining = (inv.eggs_available || 0) - nextAllocated
          const nextStatus = remaining <= 0 ? 'sold_out' : inv.status === 'sold_out' ? 'open' : inv.status
          await supabaseAdmin
            .from('egg_inventory')
            .update({ eggs_allocated: nextAllocated, status: nextStatus })
            .eq('id', order.inventory_id)
        }

        // Also handle additions for pending orders
        const { data: additions } = await supabaseAdmin
          .from('egg_order_additions')
          .select('inventory_id, quantity')
          .eq('egg_order_id', order.id)

        for (const addition of additions || []) {
          const { data: addInv } = await supabaseAdmin
            .from('egg_inventory')
            .select('eggs_allocated, eggs_available, status')
            .eq('id', addition.inventory_id)
            .maybeSingle()

          if (addInv) {
            const nextAllocated = Math.max(0, (addInv.eggs_allocated || 0) - addition.quantity)
            const remaining = (addInv.eggs_available || 0) - nextAllocated
            const nextStatus =
              remaining <= 0 ? 'sold_out' : addInv.status === 'sold_out' ? 'open' : addInv.status
            await supabaseAdmin
              .from('egg_inventory')
              .update({ eggs_allocated: nextAllocated, status: nextStatus })
              .eq('id', addition.inventory_id)
          }
        }
      }

      // Delete child records first, then the orders
      await supabaseAdmin.from('egg_order_additions').delete().in('egg_order_id', safeIds)
      await supabaseAdmin.from('egg_payments').delete().in('egg_order_id', safeIds)

      const { error: deleteError } = await supabaseAdmin
        .from('egg_orders')
        .delete()
        .in('id', safeIds)

      if (deleteError) throw deleteError

      return NextResponse.json({ success: true, affected: safeIds.length })
    }

    if (action === 'export_production') {
      const { data: orders, error } = await supabaseAdmin
        .from('egg_orders')
        .select('*, egg_breeds(*), egg_inventory(*), egg_payments(*), egg_order_additions(*, egg_breeds(*), egg_inventory(*))')
        .in('id', orderIds)
        .order('delivery_monday', { ascending: true })

      if (error) throw error

      const allOrders = (orders || []) as EggOrderRow[]

      // Per-breed/week breakdown
      type BreedWeekKey = string
      type BreedWeekSummary = { breed: string; year: number; week: number; delivery_monday: string; orders: number; eggs: number; delivery_method_split: Record<string, number> }
      const bwMap = new Map<BreedWeekKey, BreedWeekSummary>()

      for (const order of allOrders) {
        const breed = order.egg_breeds?.name || 'Unknown'
        const key: BreedWeekKey = `${breed}|${order.year}|${order.week_number}`
        const existing = bwMap.get(key) ?? { breed, year: order.year, week: order.week_number, delivery_monday: order.delivery_monday, orders: 0, eggs: 0, delivery_method_split: {} }
        existing.orders += 1
        existing.eggs += order.quantity || 0
        existing.delivery_method_split[order.delivery_method] = (existing.delivery_method_split[order.delivery_method] || 0) + 1

        for (const addition of order.egg_order_additions || []) {
          const addBreed = (addition as any).egg_breeds?.name || breed
          const addKey: BreedWeekKey = `${addBreed}|${order.year}|${order.week_number}`
          const addExisting = bwMap.get(addKey) ?? { breed: addBreed, year: order.year, week: order.week_number, delivery_monday: order.delivery_monday, orders: 0, eggs: 0, delivery_method_split: {} }
          addExisting.eggs += (addition as any).quantity || 0
          bwMap.set(addKey, addExisting)
        }

        bwMap.set(key, existing)
      }

      const breedWeekSummary = Array.from(bwMap.values()).sort((a, b) =>
        a.year === b.year ? a.week - b.week : a.year - b.year
      )

      // Per-customer lines
      const customerLines = allOrders.map((order) => ({
        order_number: order.order_number,
        customer_name: order.customer_name,
        breed: order.egg_breeds?.name || '',
        quantity: order.quantity,
        year: order.year,
        week_number: order.week_number,
        delivery_monday: order.delivery_monday,
        delivery_method: order.delivery_method,
        payment_state: getPaymentState(order),
        total_amount: order.total_amount,
        remainder_due: getAmountDueOre(order),
      }))

      const totals = {
        orders: allOrders.length,
        total_eggs: breedWeekSummary.reduce((s, b) => s + b.eggs, 0),
        pickup_count: customerLines.filter((l) => l.delivery_method === 'pickup').length,
        posten_count: customerLines.filter((l) => l.delivery_method === 'posten').length,
        total_revenue_ore: allOrders.reduce((s, o) => s + (o.total_amount || 0), 0),
        outstanding_remainder_ore: customerLines.reduce((s, l) => s + l.remainder_due, 0),
      }

      return NextResponse.json({ success: true, breed_week_summary: breedWeekSummary, customer_lines: customerLines, totals })
    }

    if (action === 'send_email') {
      const subject = String(body?.data?.subject || '').trim()
      const message = String(body?.data?.message || '').trim()
      if (!subject || !message) {
        return NextResponse.json({ error: 'Missing subject or message' }, { status: 400 })
      }

      const { data: emailOrders } = await supabaseAdmin
        .from('egg_orders')
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
            sourcePath: '/api/admin/eggs/orders',
            eggOrderId: order.id,
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
    logError('admin-eggs-orders-bulk-action', error)
    return NextResponse.json({ error: 'Failed to execute bulk action' }, { status: 500 })
  }
}
