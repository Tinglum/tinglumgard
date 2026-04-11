import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const breedId = searchParams.get('breed_id')
    const yearParam = searchParams.get('year')
    const weekParam = searchParams.get('week')

    let query = supabaseServer
      .from('egg_inventory')
      .select('*, egg_breeds(*)')
      .in('status', ['open', 'sold_out'])
      .gte('delivery_monday', new Date().toISOString().split('T')[0])
      .order('delivery_monday')

    if (breedId) {
      query = query.eq('breed_id', breedId)
    }
    if (yearParam) {
      query = query.eq('year', Number(yearParam))
    }
    if (weekParam) {
      query = query.eq('week_number', Number(weekParam))
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching inventory:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const now = new Date()
    const applyCutoff = !yearParam && !weekParam
    const filtered = applyCutoff
      ? (data || []).filter((row: any) => {
          const deliveryMondayLocal = new Date(`${row.delivery_monday}T00:00:00`)
          const cutoff = new Date(deliveryMondayLocal)
          cutoff.setHours(cutoff.getHours() - 8)
          return now < cutoff
        })
      : (data || [])

    return NextResponse.json(filtered)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
