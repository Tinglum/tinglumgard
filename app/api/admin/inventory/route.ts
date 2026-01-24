import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  const { season, kgRemaining } = await request.json();

  const { data, error } = await supabaseAdmin
    .from('inventory')
    .update({ kg_remaining: kgRemaining })
    .eq('season', season)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
