import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { data, error } = await supabaseServer
      .from('egg_breeds')
      .select('*')
      .eq('slug', params.slug)
      .eq('active', true)
      .single()

    if (error) {
      logError('eggs-breeds-slug-get', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Breed not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    logError('eggs-breeds-slug-get', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
