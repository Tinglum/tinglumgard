import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'

function normalizeDateOnly(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const year = Number(request.nextUrl.searchParams.get('year'))
  const weekNumber = Number(request.nextUrl.searchParams.get('week'))

  if (!Number.isFinite(year) || !Number.isFinite(weekNumber)) {
    return NextResponse.json({ error: 'Missing year or week' }, { status: 400 })
  }

  const queries = []
  if (session.userId) {
    queries.push(
      supabaseAdmin
        .from('egg_orders')
        .select('id, order_number, customer_name, delivery_method, year, week_number, delivery_monday, quantity, status, created_at, egg_order_additions(quantity)')
        .eq('user_id', session.userId)
        .eq('year', year)
        .eq('week_number', weekNumber)
    )
  }
  if (session.email) {
    queries.push(
      supabaseAdmin
        .from('egg_orders')
        .select('id, order_number, customer_name, delivery_method, year, week_number, delivery_monday, quantity, status, created_at, egg_order_additions(quantity)')
        .eq('customer_email', session.email)
        .eq('year', year)
        .eq('week_number', weekNumber)
    )
  }
  if (session.phoneNumber) {
    queries.push(
      supabaseAdmin
        .from('egg_orders')
        .select('id, order_number, customer_name, delivery_method, year, week_number, delivery_monday, quantity, status, created_at, egg_order_additions(quantity)')
        .eq('customer_phone', session.phoneNumber)
        .eq('year', year)
        .eq('week_number', weekNumber)
    )
  }

  if (queries.length === 0) {
    return NextResponse.json([])
  }

  const results = await Promise.all(queries)
  for (const result of results) {
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }
  }

  const today = normalizeDateOnly(new Date().toISOString().split('T')[0])
  const byId = new Map<string, any>()

  for (const result of results) {
    for (const row of result.data || []) {
      if (!row?.id) continue
      if (!['deposit_paid', 'fully_paid', 'preparing'].includes(String(row.status || ''))) continue
      if (normalizeDateOnly(String(row.delivery_monday || '1970-01-01')) < today) continue
      byId.set(row.id, row)
    }
  }

  const payload = Array.from(byId.values())
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .map((row) => {
      const additions = Array.isArray(row.egg_order_additions) ? row.egg_order_additions : []
      const additionsQuantity = additions.reduce((sum: number, addition: any) => sum + Number(addition?.quantity || 0), 0)
      return {
        id: String(row.id),
        orderNumber: String(row.order_number || ''),
        customerName: row.customer_name ? String(row.customer_name) : null,
        deliveryMethod: row.delivery_method ? String(row.delivery_method) : null,
        year: Number(row.year || year),
        weekNumber: Number(row.week_number || weekNumber),
        deliveryMonday: String(row.delivery_monday || ''),
        baseQuantity: Number(row.quantity || 0),
        additionsQuantity,
        totalQuantity: Number(row.quantity || 0) + additionsQuantity,
        status: String(row.status || ''),
      }
    })

  return NextResponse.json(payload)
}
