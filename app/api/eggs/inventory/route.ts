import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const breedId = searchParams.get('breed_id')

    let query = supabaseServer
      .from('egg_inventory')
      .select('*, egg_breeds(*)')
      .in('status', ['open', 'sold_out'])
      .gte('delivery_monday', new Date().toISOString().split('T')[0])
      .order('delivery_monday')

    if (breedId) {
      query = query.eq('breed_id', breedId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching inventory:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
