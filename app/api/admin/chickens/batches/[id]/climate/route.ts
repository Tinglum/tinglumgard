import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('chicken_batch_climate_logs')
      .select('*')
      .eq('batch_id', params.id)
      .order('logged_at', { ascending: false })
      .limit(200)

    if (error) {
      logError('admin-batch-climate-get', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logError('admin-batch-climate-get-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()

    if (body.temperature == null && body.humidity == null) {
      return NextResponse.json({ error: 'At least one of temperature or humidity is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('chicken_batch_climate_logs')
      .insert({
        batch_id: params.id,
        logged_at: body.logged_at || new Date().toISOString(),
        temperature: body.temperature ?? null,
        humidity: body.humidity ?? null,
        notes: body.notes || '',
      })
      .select()
      .single()

    if (error) {
      logError('admin-batch-climate-create', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    logError('admin-batch-climate-create-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
