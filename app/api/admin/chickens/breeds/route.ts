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
      .from('chicken_breeds')
      .select('*')
      .order('display_order')

    if (error) {
      logError('admin-chicken-breeds-get', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logError('admin-chicken-breeds-get-unexpected', error)
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

    const { data, error } = await supabaseAdmin
      .from('chicken_breeds')
      .insert({
        name: body.name,
        slug: body.slug,
        accent_color: body.accent_color || '#6B7280',
        description_no: body.description_no || '',
        description_en: body.description_en || '',
        image_url: body.image_url || '',
        start_price_nok: body.start_price_nok || 0,
        weekly_increase_nok: body.weekly_increase_nok || 0,
        adult_price_nok: body.adult_price_nok || 0,
        rooster_price_nok: body.rooster_price_nok || 250,
        sell_roosters: body.sell_roosters || false,
        mortality_rate_early_pct: body.mortality_rate_early_pct || 5.0,
        mortality_rate_late_pct: body.mortality_rate_late_pct || 2.0,
        active: body.active !== false,
        display_order: body.display_order || 0,
      })
      .select()
      .single()

    if (error) {
      logError('admin-chicken-breeds-create', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    logError('admin-chicken-breeds-create-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
