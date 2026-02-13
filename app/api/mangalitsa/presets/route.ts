import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

type Lang = 'no' | 'en';

function formatQuantity(value: number, lang: Lang): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return lang === 'no' ? String(value).replace('.', ',') : String(value);
}

function buildContentName(
  lang: Lang,
  cut: { name_no?: string | null; name_en?: string | null; chef_name_no?: string | null; chef_name_en?: string | null },
  quantity?: number | null,
  quantityUnitNo?: string | null,
  quantityUnitEn?: string | null
): string {
  const baseNameRaw = lang === 'no' ? cut.name_no : cut.name_en;
  const chefNameRaw = lang === 'no' ? cut.chef_name_no : cut.chef_name_en;
  const baseName = (baseNameRaw || '').trim();
  const chefName = (chefNameRaw || '').trim();

  if (!baseName) return '';

  const fullBase = chefName ? `${baseName} (${chefName})` : baseName;

  if (!quantity || quantity <= 0) {
    return fullBase;
  }

  const unit = lang === 'no' ? quantityUnitNo : quantityUnitEn;
  if (unit && unit.trim().length > 0) {
    return `${fullBase}, ${formatQuantity(quantity, lang)} ${unit.trim()}`;
  }

  return fullBase;
}

function normalizePreset(preset: any) {
  const relationalContents = Array.isArray(preset.preset_cuts) ? preset.preset_cuts : [];
  const legacyContents = Array.isArray(preset.legacy_contents) ? preset.legacy_contents : [];

  const contents = (relationalContents.length > 0 ? relationalContents : legacyContents)
    .map((item: any, idx: number) => {
      if (relationalContents.length > 0) {
        const cut = item.cut || {};
        const part = cut.part || {};
        const quantity = item.quantity ?? null;
        const quantityUnitNo = item.quantity_unit_no ?? null;
        const quantityUnitEn = item.quantity_unit_en ?? null;

        return {
          id: item.id,
          cut_id: cut.id ?? null,
          cut_slug: cut.slug ?? null,
          part_key: part.key ?? null,
          part_name_no: part.name_no ?? null,
          part_name_en: part.name_en ?? null,
          cut_description_no: cut.description_no ?? null,
          cut_description_en: cut.description_en ?? null,
          content_name_no: buildContentName('no', cut, quantity, quantityUnitNo, quantityUnitEn),
          content_name_en: buildContentName('en', cut, quantity, quantityUnitNo, quantityUnitEn),
          target_weight_kg: item.target_weight_kg ?? null,
          quantity,
          quantity_unit_no: quantityUnitNo,
          quantity_unit_en: quantityUnitEn,
          display_order: item.display_order ?? idx + 1,
          is_hero: Boolean(item.is_hero),
        };
      }

      return {
        id: item.id,
        cut_id: null,
        cut_slug: null,
        part_key: null,
        part_name_no: null,
        part_name_en: null,
        cut_description_no: null,
        cut_description_en: null,
        content_name_no: item.content_name_no,
        content_name_en: item.content_name_en,
        target_weight_kg: item.target_weight_kg ?? null,
        quantity: null,
        quantity_unit_no: null,
        quantity_unit_en: null,
        display_order: item.display_order ?? idx + 1,
        is_hero: Boolean(item.is_hero),
      };
    })
    .sort((a: any, b: any) => a.display_order - b.display_order);

  return {
    ...preset,
    contents,
  };
}

export async function GET() {
  try {
    const { data: relationalPresets, error: relationalError } = await supabaseAdmin
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
            description_no,
            description_en,
            part:pig_parts(
              key,
              name_no,
              name_en
            )
          )
        ),
        legacy_contents:mangalitsa_preset_contents(*)
      `)
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (relationalError) {
      // Keep DB fallback for environments that still run legacy schema.
      const { data: legacyPresets, error: legacyError } = await supabaseAdmin
        .from('mangalitsa_box_presets')
        .select(`
          *,
          legacy_contents:mangalitsa_preset_contents(*)
        `)
        .eq('active', true)
        .order('display_order', { ascending: true });

      if (legacyError) {
        logError('mangalitsa-presets-route', relationalError);
        logError('mangalitsa-presets-route-legacy', legacyError);
        return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
      }

      const normalizedLegacy = (legacyPresets || []).map(normalizePreset);
      return NextResponse.json(
        { presets: normalizedLegacy },
        {
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
          },
        }
      );
    }

    const normalizedPresets = (relationalPresets || []).map(normalizePreset);

    return NextResponse.json(
      { presets: normalizedPresets },
      {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    logError('mangalitsa-presets-route', error);
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }
}
