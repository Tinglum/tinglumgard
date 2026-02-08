import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const queries = []
    if (session.userId) {
      queries.push(
        supabaseAdmin
          .from('egg_orders')
          .select('*, egg_breeds(*), egg_payments(*), egg_order_additions(*)')
          .eq('user_id', session.userId)
      )
    }
    if (session.email) {
      queries.push(
        supabaseAdmin
          .from('egg_orders')
          .select('*, egg_breeds(*), egg_payments(*), egg_order_additions(*)')
          .eq('customer_email', session.email)
      )
    }
    if (session.phoneNumber) {
      queries.push(
        supabaseAdmin
          .from('egg_orders')
          .select('*, egg_breeds(*), egg_payments(*), egg_order_additions(*)')
          .eq('customer_phone', session.phoneNumber)
      )
    }

    if (queries.length === 0) {
      return NextResponse.json([])
    }

    const results = await Promise.all(queries)
    for (const result of results) {
      if (result.error) {
        console.error('Error fetching egg orders:', result.error)
        return NextResponse.json({ error: result.error.message }, { status: 500 })
      }
    }

    const combined = new Map<string, any>()
    for (const result of results) {
      for (const order of result.data || []) {
        combined.set(order.id, order)
      }
    }

    const data = Array.from(combined.values()).sort((a, b) => {
      if (!a.created_at || !b.created_at) return 0
      return b.created_at.localeCompare(a.created_at)
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
