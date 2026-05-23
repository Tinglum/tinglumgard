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
      .from('chicken_batch_events')
      .select('*')
      .eq('batch_id', params.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      logError('admin-batch-events-get', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logError('admin-batch-events-get-unexpected', error)
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

    if (!body.event_type || !body.description) {
      return NextResponse.json({ error: 'event_type and description are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('chicken_batch_events')
      .insert({
        batch_id: params.id,
        event_type: body.event_type,
        description: body.description,
        metadata: body.metadata || {},
      })
      .select()
      .single()

    if (error) {
      logError('admin-batch-events-create', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    logError('admin-batch-events-create-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
