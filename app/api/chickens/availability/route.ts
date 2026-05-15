import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { buildAvailabilityCalendar } from '@/lib/chickens/api'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Use service role here so public availability works even with strict RLS on chicken_hatches.
    const { data: breeds, error: breedsError } = await supabaseAdmin
      .from('chicken_breeds')
      .select('*')
      .eq('active', true)
      .order('display_order')

    if (breedsError) {
      logError('chickens-availability-breeds', breedsError)
      return NextResponse.json({ error: breedsError.message }, { status: 500 })
    }

    const { data: hatches, error: hatchesError } = await supabaseAdmin
      .from('chicken_hatches')
      .select('*')
      .eq('active', true)

    if (hatchesError) {
      logError('chickens-availability-hatches', hatchesError)
      return NextResponse.json({ error: hatchesError.message }, { status: 500 })
    }

    const calendar = buildAvailabilityCalendar(breeds || [], hatches || [], 16)

    return NextResponse.json(calendar)
  } catch (error: any) {
    logError('chickens-availability-get', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
