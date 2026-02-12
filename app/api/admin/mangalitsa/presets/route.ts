import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

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

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const payload = await request.json();

    const {
      contents,
      ...presetFields
    } = payload as Record<string, any>;

    const { data: createdPreset, error: presetError } = await supabaseAdmin
      .from('mangalitsa_box_presets')
      .insert({
        ...presetFields,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (presetError || !createdPreset) {
      logError('admin-mangalitsa-presets-post', presetError);
      return NextResponse.json({ error: presetError?.message || 'Failed to create preset' }, { status: 500 });
    }

    if (Array.isArray(contents) && contents.length > 0) {
      const rows = contents.map((content: any, index: number) => ({
        preset_id: createdPreset.id,
        content_name_no: content.content_name_no,
        content_name_en: content.content_name_en,
        target_weight_kg: content.target_weight_kg ?? null,
        display_order: content.display_order ?? index + 1,
        is_hero: Boolean(content.is_hero),
      }));

      const { error: contentError } = await supabaseAdmin
        .from('mangalitsa_preset_contents')
        .insert(rows);

      if (contentError) {
        logError('admin-mangalitsa-presets-post-contents', contentError);
        return NextResponse.json({ error: contentError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ preset: createdPreset }, { status: 201 });
  } catch (error) {
    logError('admin-mangalitsa-presets-post', error);
    return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 });
  }
}
