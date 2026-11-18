import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { data: verification } = await supabaseServer.from('app_config').select('value').eq('key', 'pig_stock_count_verified').maybeSingle();
  const { data: presets, error: presetError } = await supabaseServer.from('mangalitsa_box_presets').select('id').eq('active',true);
  if (presetError) return NextResponse.json({error:'Failed to check box availability'},{status:503});
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
    countsVerified: verification?.value === true,
    availablePresets: (presets || []).map(preset=>preset.id),
    season: data.season,
    kgRemaining: data.kg_remaining,
    boxesRemaining,
    isLowStock,
    isSoldOut,
    active: data.active,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
