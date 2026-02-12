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
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (error) {
      logError('mangalitsa-presets-route', error);
      return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
    }

    // Sort contents within each preset
    const sortedPresets = (presets || []).map((preset: any) => ({
      ...preset,
      contents: (preset.contents || []).sort((a: any, b: any) => a.display_order - b.display_order),
    }));

    return NextResponse.json({ presets: sortedPresets });
  } catch (error) {
    logError('mangalitsa-presets-route', error);
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }
}
