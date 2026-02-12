import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export async function GET() {
  try {
    const { data: presets, error } = await supabaseAdmin
      .from('mangalitsa_box_presets')
      .select(`
        *,
        contents:mangalitsa_preset_contents(*)
      `)
      .order('display_order', { ascending: true });

    if (error) {
      logError('admin-mangalitsa-presets', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sortedPresets = (presets || []).map((preset: any) => ({
      ...preset,
      contents: (preset.contents || []).sort((a: any, b: any) => a.display_order - b.display_order),
    }));

    return NextResponse.json({ presets: sortedPresets });
  } catch (error) {
    logError('admin-mangalitsa-presets', error);
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }
}
