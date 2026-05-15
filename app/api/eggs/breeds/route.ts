import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('egg_breeds')
      .select('*')
      .eq('active', true)
      .order('display_order')

    if (error) {
      logError('eggs-breeds-get', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    logError('eggs-breeds-get', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
