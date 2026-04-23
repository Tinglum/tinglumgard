import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'

function normalizeEmail(value?: string | null): string {
  return String(value || '').trim().toLowerCase()
}

function phoneDigits(value?: string | null): string {
  return String(value || '').replace(/\D/g, '')
}

function isEmailMatch(a?: string | null, b?: string | null): boolean {
  const left = normalizeEmail(a)
  const right = normalizeEmail(b)
  if (!left || !right) return false
  return left === right
}

function isPhoneMatch(a?: string | null, b?: string | null): boolean {
  const left = phoneDigits(a)
  const right = phoneDigits(b)
  if (!left || !right) return false
  if (left === right) return true
  if (left.length >= 8 && right.length >= 8) {
    return left.slice(-8) === right.slice(-8)
  }
  return false
}

function hasOrderAccess(session: any, order: any): boolean {
  if (session?.isAdmin) return true
  if (session?.userId && order?.user_id && session.userId === order.user_id) return true
  if (isEmailMatch(session?.email, order?.customer_email)) return true
  if (isPhoneMatch(session?.phoneNumber, order?.customer_phone)) return true
  return false
}

/**
 * Valid pickup days for egg orders: Sunday (delivery_monday - 1),
 * Monday (delivery_monday), and Tuesday (delivery_monday + 1).
 */
function isDateInEggPickupWindow(pickupDate: string, deliveryMonday: string): boolean {
  const chosen = new Date(`${pickupDate}T00:00:00Z`)
  const monday = new Date(`${deliveryMonday}T00:00:00Z`)
  if (Number.isNaN(chosen.getTime()) || Number.isNaN(monday.getTime())) return false

  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() - 1)

  const tuesday = new Date(monday)
  tuesday.setUTCDate(monday.getUTCDate() + 1)

  const chosenTime = chosen.getTime()
  return (
    chosenTime === sunday.getTime() ||
    chosenTime === monday.getTime() ||
    chosenTime === tuesday.getTime()
  )
}

// PATCH /api/eggs/orders/[id]/pickup-date
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const pickupDate = String(body.pickupDate || '').trim()
    const pickupTime = String(body.pickupTime || '').trim()

    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    const parsed = new Date(`${pickupDate}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }

    const validTimes = ['11:00', '17:00']
    if (!validTimes.includes(pickupTime)) {
      return NextResponse.json(
        { error: 'Invalid pickup time. Must be 11:00 or 17:00' },
        { status: 400 }
      )
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('egg_orders')
      .select('id, status, delivery_monday, delivery_method, user_id, customer_email, customer_phone')
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!hasOrderAccess(session, order)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (['cancelled', 'delivered', 'forfeited'].includes(order.status)) {
      return NextResponse.json({ error: 'Order is not eligible for changes' }, { status: 400 })
    }

    if (!['farm_pickup', 'e6_pickup'].includes(order.delivery_method)) {
      return NextResponse.json(
        { error: 'Pickup date selection is only available for farm and E6 pickup orders' },
        { status: 400 }
      )
    }

    if (!isDateInEggPickupWindow(pickupDate, order.delivery_monday)) {
      return NextResponse.json(
        { error: 'Pickup date must be Sunday, Monday, or Tuesday of the delivery week' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('egg_orders')
      .update({ pickup_date: pickupDate, pickup_time: pickupTime })
      .eq('id', params.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, pickupDate, pickupTime })
  } catch (error) {
    console.error('Error setting egg pickup date:', error)
    return NextResponse.json({ error: 'Failed to update pickup date' }, { status: 500 })
  }
}
