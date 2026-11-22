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

    const { data: configRows } = await supabaseAdmin
      .from('app_config')
      .select('key, value')
      .in('key', ['chicken_spring_open_date', 'chicken_spring_cohort_hatch_from'])

    const configMap = new Map((configRows || []).map((row) => [row.key, row.value]))
    const springOpenDate =
      typeof configMap.get('chicken_spring_open_date') === 'string'
        ? String(configMap.get('chicken_spring_open_date')).trim()
        : null
    const springCohortHatchFrom =
      typeof configMap.get('chicken_spring_cohort_hatch_from') === 'string'
        ? String(configMap.get('chicken_spring_cohort_hatch_from')).trim()
        : null

    const calendar = buildAvailabilityCalendar(breeds || [], hatches || [], 36, {
      springOpenDate,
      springCohortHatchFrom,
    })

    return NextResponse.json(calendar)
  } catch (error: any) {
    logError('chickens-availability-get', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
