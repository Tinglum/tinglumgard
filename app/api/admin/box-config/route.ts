import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { data: boxConfigs, error } = await supabaseAdmin
      .from('box_configurations')
      .select('*')
      .order('box_size', { ascending: true });

    if (error) throw error;

    if (boxConfigs && boxConfigs.length > 0) {
      return NextResponse.json({ boxes: boxConfigs });
    }

    const { data: presets, error: presetsError } = await supabaseAdmin
      .from('mangalitsa_box_presets')
      .select('id, slug, name_no, name_en, target_weight_kg, price_nok, short_pitch_no, short_pitch_en, active')
      .order('display_order', { ascending: true });

    if (presetsError) throw presetsError;

    return NextResponse.json({
      boxes: (presets || []).map((preset) => ({
        id: preset.id,
        slug: preset.slug,
        box_size: preset.target_weight_kg,
        price: preset.price_nok,
        description: preset.short_pitch_no || preset.short_pitch_en || '',
        active: preset.active,
        is_mangalitsa_preset: true,
      })),
    });
  } catch (error) {
    console.error('Box config GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch box configurations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  return NextResponse.json(
    { error: 'Legacy box configuration endpoint is deprecated. Use /api/admin/mangalitsa/presets instead.' },
    { status: 410 }
  );
}
