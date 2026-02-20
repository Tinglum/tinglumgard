import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('chicken_hatches')
      .select('*, chicken_breeds(name, slug, accent_color, start_price_nok, weekly_increase_nok, adult_price_nok, mortality_rate_early_pct, mortality_rate_late_pct)')
      .order('hatch_date', { ascending: false })

    if (error) {
      logError('admin-chicken-hatches-get', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logError('admin-chicken-hatches-get-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()

    if (!body.breed_id || !body.hatch_date || !body.initial_count) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('chicken_hatches')
      .insert({
        breed_id: body.breed_id,
        hatch_date: body.hatch_date,
        initial_count: body.initial_count,
        estimated_hens: body.estimated_hens || Math.round(body.initial_count * 0.5),
        estimated_roosters: body.estimated_roosters || Math.round(body.initial_count * 0.5),
        available_hens: body.available_hens ?? body.estimated_hens ?? Math.round(body.initial_count * 0.5),
        available_roosters: body.available_roosters ?? body.estimated_roosters ?? Math.round(body.initial_count * 0.5),
        mortality_override: body.mortality_override || null,
        notes: body.notes || '',
        active: body.active !== false,
      })
      .select('*, chicken_breeds(name, slug, accent_color)')
      .single()

    if (error) {
      logError('admin-chicken-hatches-create', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    logError('admin-chicken-hatches-create-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
