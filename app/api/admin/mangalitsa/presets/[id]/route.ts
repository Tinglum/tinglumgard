import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

const ALLOWED_PRESET_FIELDS = new Set([
  'name_no', 'name_en',
  'description_no', 'description_en',
  'short_pitch_no', 'short_pitch_en',
  'price_nok',
  'target_audience_no', 'target_audience_en',
  'scarcity_message_no', 'scarcity_message_en',
  'active', 'is_premium', 'display_order',
]);

function normalizeNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const payload = await request.json();
    const { contents, ...rawUpdates } = payload;

    // Whitelist preset fields
    const presetUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawUpdates)) {
      if (ALLOWED_PRESET_FIELDS.has(key)) {
        presetUpdates[key] = value;
      }
    }

    // Update preset fields if any
    if (Object.keys(presetUpdates).length > 0) {
      const { error } = await supabaseAdmin
        .from('mangalitsa_box_presets')
        .update({
          ...presetUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id);

      if (error) {
        logError('admin-mangalitsa-preset-update', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Update contents if provided
    if (Array.isArray(contents)) {
      const usesRelationalCuts = contents.every((content: any) => content.cut_id);

      if (usesRelationalCuts) {
        const { error: deleteRelationalError } = await supabaseAdmin
          .from('mangalitsa_preset_cuts')
          .delete()
          .eq('preset_id', params.id);

        if (deleteRelationalError) {
          logError('admin-mangalitsa-preset-cuts-delete', deleteRelationalError);
          return NextResponse.json({ error: deleteRelationalError.message }, { status: 500 });
        }

        if (contents.length > 0) {
          const rows = contents.map((content: any, index: number) => ({
            preset_id: params.id,
            cut_id: content.cut_id,
            target_weight_kg: content.target_weight_kg ?? null,
            quantity: normalizeNumber(content.quantity, 1),
            quantity_unit_no: content.quantity_unit_no ?? null,
            quantity_unit_en: content.quantity_unit_en ?? null,
            is_hero: Boolean(content.is_hero),
            display_order: content.display_order ?? index + 1,
          }));

          const { error: insertRelationalError } = await supabaseAdmin
            .from('mangalitsa_preset_cuts')
            .insert(rows);

          if (insertRelationalError) {
            logError('admin-mangalitsa-preset-cuts-insert', insertRelationalError);
            return NextResponse.json({ error: insertRelationalError.message }, { status: 500 });
          }
        }
      } else {
        // Legacy fallback support
        const { error: deleteLegacyError } = await supabaseAdmin
          .from('mangalitsa_preset_contents')
          .delete()
          .eq('preset_id', params.id);

        if (deleteLegacyError) {
          logError('admin-mangalitsa-contents-delete', deleteLegacyError);
          return NextResponse.json({ error: deleteLegacyError.message }, { status: 500 });
        }

        if (contents.length > 0) {
          const rows = contents.map((content: any, index: number) => ({
            preset_id: params.id,
            content_name_no: content.content_name_no,
            content_name_en: content.content_name_en,
            target_weight_kg: content.target_weight_kg ?? null,
            is_hero: Boolean(content.is_hero),
            display_order: content.display_order ?? index + 1,
          }));

          const { error: insertLegacyError } = await supabaseAdmin
            .from('mangalitsa_preset_contents')
            .insert(rows);

          if (insertLegacyError) {
            logError('admin-mangalitsa-contents-insert', insertLegacyError);
            return NextResponse.json({ error: insertLegacyError.message }, { status: 500 });
          }
        }
      }
    }

    // Fetch updated preset with contents
    const { data: preset, error: fetchError } = await supabaseAdmin
      .from('mangalitsa_box_presets')
      .select(`
        *,
        preset_cuts:mangalitsa_preset_cuts(
          id,
          cut_id,
          target_weight_kg,
          quantity,
          quantity_unit_no,
          quantity_unit_en,
          display_order,
          is_hero,
          cut:cuts_catalog(
            id,
            slug,
            name_no,
            name_en,
            chef_name_no,
            chef_name_en,
            part:pig_parts(
              key,
              name_no,
              name_en
            )
          )
        ),
        legacy_contents:mangalitsa_preset_contents(*)
      `)
      .eq('id', params.id)
      .single();

    if (fetchError) {
      logError('admin-mangalitsa-preset-fetch', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ preset });
  } catch (error) {
    logError('admin-mangalitsa-preset-update', error);
    return NextResponse.json({ error: 'Failed to update preset' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('mangalitsa_box_presets')
      .delete()
      .eq('id', params.id);

    if (error) {
      logError('admin-mangalitsa-preset-delete', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('admin-mangalitsa-preset-delete', error);
    return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 });
  }
}
