import { NextResponse } from 'next/server'
import { getDayBeforeOfferAvailabilityForInventoryRows } from '@/lib/eggs/day-before-offer-availability'
import { supabaseServer } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const breedId = searchParams.get('breed_id')
    const yearParam = searchParams.get('year')
    const weekParam = searchParams.get('week')
    const stockMode = searchParams.get('stock_mode')

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
      logError('eggs-inventory-get', error)
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

    if (stockMode === 'day_before_actual' && filtered.length > 0) {
      const availabilityByInventoryId = await getDayBeforeOfferAvailabilityForInventoryRows(
        filtered.map((row: any) => ({
          id: row.id,
          breed_id: row.breed_id,
          eggs_allocated: row.eggs_allocated,
          eggs_available: row.eggs_available,
          delivery_monday: row.delivery_monday,
        })),
        { now }
      )

      return NextResponse.json(
        filtered.map((row: any) => {
          const availability = availabilityByInventoryId.get(String(row.id))
          return {
            ...row,
            effective_remaining: availability ? availability.remaining : 0,
            availability_source: availability ? availability.source : 'actual_collected',
            actual_collected: availability ? availability.actualCollected : 0,
            availability_cutoff_at: availability?.cutoffAt || null,
            availability_cutoff_date: availability?.cutoffDate || null,
            availability_cutoff_hour: availability?.cutoffHour ?? null,
            availability_cutoff_minute: availability?.cutoffMinute ?? null,
            collection_window_start: availability?.collectionStart || null,
            collection_window_end: availability?.collectionEnd || null,
          }
        })
      )
    }

    return NextResponse.json(filtered)
  } catch (error: any) {
    logError('eggs-inventory-get', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
