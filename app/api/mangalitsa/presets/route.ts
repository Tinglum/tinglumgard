import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Lang = 'no' | 'en';

type PresetRow = {
  id: string;
  slug: string;
  name_no: string;
  name_en: string;
  short_pitch_no: string;
  short_pitch_en: string;
  description_no: string;
  description_en: string;
  target_weight_kg: number;
  price_nok: number;
  display_order: number;
  active: boolean;
  scarcity_message_no?: string | null;
  scarcity_message_en?: string | null;
};

type PresetCutRow = {
  id: string;
  preset_id: string;
  cut_id: string;
  target_weight_kg?: number | null;
  quantity?: number | null;
  quantity_unit_no?: string | null;
  quantity_unit_en?: string | null;
  display_order?: number | null;
  is_hero?: boolean | null;
};

type CutRow = {
  id: string;
  slug: string;
  name_no: string;
  name_en: string;
  chef_name_no?: string | null;
  chef_name_en?: string | null;
  description_no?: string | null;
  description_en?: string | null;
  part_id?: string | null;
};

type PartRow = {
  id: string;
  key: string;
  name_no: string;
  name_en: string;
};

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

function normalizePreset(
  preset: PresetRow,
  presetCuts: PresetCutRow[],
  cutsById: Map<string, CutRow>,
  partsById: Map<string, PartRow>
) {
  const contents = presetCuts
    .filter((item) => item.preset_id === preset.id)
    .map((item, idx) => {
      const cut = cutsById.get(item.cut_id);
      const part = cut?.part_id ? partsById.get(cut.part_id) : null;
      const quantity = item.quantity ?? null;
      const quantityUnitNo = item.quantity_unit_no ?? null;
      const quantityUnitEn = item.quantity_unit_en ?? null;

      return {
        id: item.id,
        cut_id: cut?.id ?? item.cut_id ?? null,
        cut_slug: cut?.slug ?? null,
        part_key: part?.key ?? null,
        part_name_no: part?.name_no ?? null,
        part_name_en: part?.name_en ?? null,
        cut_description_no: cut?.description_no ?? null,
        cut_description_en: cut?.description_en ?? null,
        content_name_no: buildContentName('no', cut || {}, quantity, quantityUnitNo, quantityUnitEn),
        content_name_en: buildContentName('en', cut || {}, quantity, quantityUnitNo, quantityUnitEn),
        target_weight_kg: item.target_weight_kg ?? null,
        quantity,
        quantity_unit_no: quantityUnitNo,
        quantity_unit_en: quantityUnitEn,
        display_order: item.display_order ?? idx + 1,
        is_hero: Boolean(item.is_hero),
      };
    })
    .sort((a, b) => a.display_order - b.display_order);

  return {
    ...preset,
    contents,
  };
}

export async function GET() {
  try {
    const { data: presets, error: presetsError } = await supabaseAdmin
      .from('mangalitsa_box_presets')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (presetsError) {
      logError('mangalitsa-presets-route-presets', presetsError);
      return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
    }

    const presetRows = (presets || []) as PresetRow[];
    if (presetRows.length === 0) {
      return NextResponse.json(
        { presets: [] },
        {
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
          },
        }
      );
    }

    const presetIds = presetRows.map((preset) => preset.id);

    const { data: presetCuts, error: presetCutsError } = await supabaseAdmin
      .from('mangalitsa_preset_cuts')
      .select('id,preset_id,cut_id,target_weight_kg,quantity,quantity_unit_no,quantity_unit_en,display_order,is_hero')
      .in('preset_id', presetIds)
      .order('display_order', { ascending: true });

    if (presetCutsError) {
      logError('mangalitsa-presets-route-preset-cuts', presetCutsError);
      return NextResponse.json(
        { error: 'Missing relational cut tables. Run the latest Supabase migrations.' },
        { status: 500 }
      );
    }

    const presetCutRows = (presetCuts || []) as PresetCutRow[];
    const cutIds = Array.from(new Set(presetCutRows.map((row) => row.cut_id).filter(Boolean)));

    let cutRows: CutRow[] = [];
    if (cutIds.length > 0) {
      const { data: cuts, error: cutsError } = await supabaseAdmin
        .from('cuts_catalog')
        .select('id,slug,name_no,name_en,chef_name_no,chef_name_en,description_no,description_en,part_id')
        .in('id', cutIds);

      if (cutsError) {
        logError('mangalitsa-presets-route-cuts', cutsError);
        return NextResponse.json({ error: 'Failed to fetch cuts catalog' }, { status: 500 });
      }

      cutRows = (cuts || []) as CutRow[];
    }

    const partIds = Array.from(new Set(cutRows.map((cut) => cut.part_id).filter(Boolean))) as string[];
    let partRows: PartRow[] = [];
    if (partIds.length > 0) {
      const { data: parts, error: partsError } = await supabaseAdmin
        .from('pig_parts')
        .select('id,key,name_no,name_en')
        .in('id', partIds);

      if (partsError) {
        logError('mangalitsa-presets-route-parts', partsError);
        return NextResponse.json({ error: 'Failed to fetch pig parts' }, { status: 500 });
      }

      partRows = (parts || []) as PartRow[];
    }

    const cutsById = new Map(cutRows.map((row) => [row.id, row]));
    const partsById = new Map(partRows.map((row) => [row.id, row]));

    const normalizedPresets = presetRows.map((preset) =>
      normalizePreset(preset, presetCutRows, cutsById, partsById)
    );

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
