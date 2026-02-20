import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

const ALLOWED_FIELDS = [
  'name', 'slug', 'accent_color', 'description_no', 'description_en', 'image_url',
  'start_price_nok', 'weekly_increase_nok', 'adult_price_nok', 'rooster_price_nok',
  'sell_roosters', 'mortality_rate_early_pct', 'mortality_rate_late_pct',
  'active', 'display_order',
]

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const updates: Record<string, any> = {}

    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('chicken_breeds')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      logError('admin-chicken-breed-update', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logError('admin-chicken-breed-update-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { error } = await supabaseAdmin
      .from('chicken_breeds')
      .update({ active: false })
      .eq('id', params.id)

    if (error) {
      logError('admin-chicken-breed-delete', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('admin-chicken-breed-delete-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
