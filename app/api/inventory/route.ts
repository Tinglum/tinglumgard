import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET() {
  const { data, error } = await supabaseServer
    .from('inventory')
    .select('*')
    .eq('active', true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }

  const boxesRemaining = Math.floor(data.kg_remaining / 10);
  const isLowStock = boxesRemaining < 15;
  const isSoldOut = data.kg_remaining < 8;

  return NextResponse.json({
    season: data.season,
    kgRemaining: data.kg_remaining,
    boxesRemaining,
    isLowStock,
    isSoldOut,
    active: data.active,
  });
}
