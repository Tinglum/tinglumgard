import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select('*, egg_breeds(*), egg_payments(*), egg_order_additions(*)')
    .eq('id', params.id)
    .maybeSingle()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (session.isAdmin) {
    return NextResponse.json(order)
  }

  const matchesUserId = session.userId && order.user_id === session.userId
  const matchesEmail = session.email && order.customer_email === session.email
  const matchesPhone = session.phoneNumber && order.customer_phone === session.phoneNumber

  if (!matchesUserId && !matchesEmail && !matchesPhone) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json(order)
}
