import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
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
  size_from_kg?: number | null;
  size_to_kg?: number | null;
  part_id?: string | null;
};

type PartRow = {
  id: string;
  key: string;
  name_no: string;
  name_en: string;
};

type LegacyPresetContentRow = {
  id: string;
  preset_id: string;
  content_name_no: string;
  content_name_en: string;
  target_weight_kg?: number | null;
  display_order?: number | null;
  is_hero?: boolean | null;
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
  if (!quantity || quantity <= 0) return fullBase;

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
        cut_size_from_kg: cut?.size_from_kg ?? null,
        cut_size_to_kg: cut?.size_to_kg ?? null,
        part_key: part?.key ?? null,
        part_name_no: part?.name_no ?? null,
        part_name_en: part?.name_en ?? null,
        content_name_no: buildContentName('no', cut || {}, quantity, quantityUnitNo, quantityUnitEn),
        content_name_en: buildContentName('en', cut || {}, quantity, quantityUnitNo, quantityUnitEn),
        target_weight_kg: item.target_weight_kg ?? null,
        quantity,
        quantity_unit_no: quantityUnitNo,
        quantity_unit_en: quantityUnitEn,
        display_order: item.display_order ?? idx + 1,
        is_hero: Boolean(item.is_hero),
        cut: cut
          ? {
              id: cut.id,
              slug: cut.slug,
              name_no: cut.name_no,
              name_en: cut.name_en,
              chef_name_no: cut.chef_name_no ?? null,
              chef_name_en: cut.chef_name_en ?? null,
              size_from_kg: cut.size_from_kg ?? null,
              size_to_kg: cut.size_to_kg ?? null,
              part: part
                ? {
                    id: part.id,
                    key: part.key,
                    name_no: part.name_no,
                    name_en: part.name_en,
                  }
                : null,
            }
          : null,
      };
    })
    .sort((a: any, b: any) => a.display_order - b.display_order);

  return {
    ...preset,
    contents,
  };
}

async function fetchPresetsForAdmin() {
  const { data: presets, error: presetsError } = await supabaseAdmin
    .from('mangalitsa_box_presets')
    .select('*')
    .order('display_order', { ascending: true });

  if (presetsError) {
    throw presetsError;
  }

  const presetRows = (presets || []) as PresetRow[];
  if (presetRows.length === 0) return [];

  const presetIds = presetRows.map((preset) => preset.id);

  const { data: presetCuts, error: presetCutsError } = await supabaseAdmin
    .from('mangalitsa_preset_cuts')
    .select('id,preset_id,cut_id,target_weight_kg,quantity,quantity_unit_no,quantity_unit_en,display_order,is_hero')
    .in('preset_id', presetIds)
    .order('display_order', { ascending: true });

  if (presetCutsError) {
    const { data: legacyContents, error: legacyError } = await supabaseAdmin
      .from('mangalitsa_preset_contents')
      .select('id,preset_id,content_name_no,content_name_en,target_weight_kg,display_order,is_hero')
      .in('preset_id', presetIds)
      .order('display_order', { ascending: true });

    if (legacyError) {
      throw presetCutsError;
    }

    const legacyRows = (legacyContents || []) as LegacyPresetContentRow[];
    return presetRows.map((preset) => ({
      ...preset,
      contents: legacyRows
        .filter((row) => row.preset_id === preset.id)
        .map((row, idx) => ({
          id: row.id,
          cut_id: null,
          cut_slug: null,
          cut_size_from_kg: null,
          cut_size_to_kg: null,
          part_key: null,
          part_name_no: null,
          part_name_en: null,
          content_name_no: row.content_name_no,
          content_name_en: row.content_name_en,
          target_weight_kg: row.target_weight_kg ?? null,
          quantity: null,
          quantity_unit_no: null,
          quantity_unit_en: null,
          display_order: row.display_order ?? idx + 1,
          is_hero: Boolean(row.is_hero),
          cut: null,
        }))
        .sort((a, b) => a.display_order - b.display_order),
    }));
  }

  const presetCutRows = (presetCuts || []) as PresetCutRow[];
  const cutIds = Array.from(new Set(presetCutRows.map((row) => row.cut_id).filter(Boolean)));

  let cutRows: CutRow[] = [];
  if (cutIds.length > 0) {
    const { data: cuts, error: cutsError } = await supabaseAdmin
      .from('cuts_catalog')
      .select('id,slug,name_no,name_en,chef_name_no,chef_name_en,description_no,description_en,size_from_kg,size_to_kg,part_id')
      .in('id', cutIds);

    if (cutsError) {
      const { data: legacyContents, error: legacyError } = await supabaseAdmin
        .from('mangalitsa_preset_contents')
        .select('id,preset_id,content_name_no,content_name_en,target_weight_kg,display_order,is_hero')
        .in('preset_id', presetIds)
        .order('display_order', { ascending: true });

      if (legacyError) {
        throw cutsError;
      }

      const legacyRows = (legacyContents || []) as LegacyPresetContentRow[];
      return presetRows.map((preset) => ({
        ...preset,
        contents: legacyRows
          .filter((row) => row.preset_id === preset.id)
          .map((row, idx) => ({
            id: row.id,
            cut_id: null,
            cut_slug: null,
            cut_size_from_kg: null,
            cut_size_to_kg: null,
            part_key: null,
            part_name_no: null,
            part_name_en: null,
            content_name_no: row.content_name_no,
            content_name_en: row.content_name_en,
            target_weight_kg: row.target_weight_kg ?? null,
            quantity: null,
            quantity_unit_no: null,
            quantity_unit_en: null,
            display_order: row.display_order ?? idx + 1,
            is_hero: Boolean(row.is_hero),
            cut: null,
          }))
          .sort((a, b) => a.display_order - b.display_order),
      }));
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
      throw partsError;
    }

    partRows = (parts || []) as PartRow[];
  }

  const cutsById = new Map(cutRows.map((row) => [row.id, row]));
  const partsById = new Map(partRows.map((row) => [row.id, row]));

  return presetRows.map((preset) => normalizePreset(preset, presetCutRows, cutsById, partsById));
}

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const presets = await fetchPresetsForAdmin();
    return NextResponse.json({ presets });
  } catch (error: any) {
    logError('admin-mangalitsa-presets', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch presets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const payload = await request.json();

    const { contents, ...presetFields } = payload as Record<string, any>;

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
      if (!contents.every((content: any) => content.cut_id)) {
        return NextResponse.json(
          { error: 'Each preset content row must include cut_id' },
          { status: 400 }
        );
      }

      const rows = contents.map((content: any, index: number) => ({
        preset_id: createdPreset.id,
        cut_id: content.cut_id,
        target_weight_kg: content.target_weight_kg ?? null,
        quantity: content.quantity ?? 1,
        quantity_unit_no: content.quantity_unit_no ?? null,
        quantity_unit_en: content.quantity_unit_en ?? null,
        display_order: content.display_order ?? index + 1,
        is_hero: Boolean(content.is_hero),
      }));

      const { error: contentError } = await supabaseAdmin
        .from('mangalitsa_preset_cuts')
        .insert(rows);

      if (contentError) {
        logError('admin-mangalitsa-presets-post-cuts', contentError);
        return NextResponse.json({ error: contentError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ preset: createdPreset }, { status: 201 });
  } catch (error) {
    logError('admin-mangalitsa-presets-post', error);
    return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 });
  }
}
