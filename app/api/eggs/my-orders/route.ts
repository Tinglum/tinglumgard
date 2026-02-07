import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const filters = [
      session.userId ? `user_id.eq.${session.userId}` : null,
      session.email ? `customer_email.eq.${session.email}` : null,
      session.phoneNumber ? `customer_phone.eq.${session.phoneNumber}` : null,
    ].filter(Boolean) as string[]

    if (filters.length === 0) {
      return NextResponse.json([])
    }

    const { data, error } = await supabaseAdmin
      .from('egg_orders')
      .select('*, egg_breeds(*), egg_payments(*)')
      .or(filters.join(','))
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching egg orders:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
