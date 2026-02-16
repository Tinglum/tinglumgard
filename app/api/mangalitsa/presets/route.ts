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

type LegacyPartKey = 'nakke' | 'svinebog' | 'kotelettkam' | 'ribbeside' | 'skinke' | 'knoke' | 'unknown';

function normalizeForMatch(input: string): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function inferLegacyPartKey(contentNameNo?: string | null, contentNameEn?: string | null): LegacyPartKey {
  const haystack = normalizeForMatch(`${contentNameNo || ''} ${contentNameEn || ''}`);

  if (
    haystack.includes('svinekinn') ||
    haystack.includes('kinn') ||
    haystack.includes('guanciale') ||
    haystack.includes('jowl')
  ) {
    return 'nakke';
  }

  if (haystack.includes('nakkekam') || haystack.includes('coppa') || haystack.includes('neck collar')) {
    return 'nakke';
  }

  if (
    haystack.includes('slakterbiff') ||
    haystack.includes('butcher steak') ||
    haystack.includes('secreto') ||
    haystack.includes('presa') ||
    haystack.includes('pluma')
  ) {
    return 'nakke';
  }

  if (
    haystack.includes('indrefilet') ||
    haystack.includes('tenderloin') ||
    haystack.includes('ytrefilet') ||
    haystack.includes('ryggfilet') ||
    haystack.includes('loin fillet')
  ) {
    return 'kotelettkam';
  }

  if (
    haystack.includes('tomahawk') ||
    haystack.includes('entrecote') ||
    haystack.includes('ribeye') ||
    haystack.includes('kotelett') ||
    haystack.includes('chop')
  ) {
    return 'kotelettkam';
  }

  if (haystack.includes('ryggspekk') || haystack.includes('back fat') || haystack.includes('lardo')) {
    return 'kotelettkam';
  }

  if (
    haystack.includes('ribbe') ||
    haystack.includes('ribs') ||
    haystack.includes('belly') ||
    haystack.includes('pancetta') ||
    haystack.includes('sideflesk') ||
    haystack.includes('bacon')
  ) {
    return 'ribbeside';
  }

  if (
    haystack.includes('kokkefett') ||
    haystack.includes('smult') ||
    haystack.includes('cooking fat') ||
    haystack.includes('lard')
  ) {
    return 'ribbeside';
  }

  if (
    haystack.includes('bog') ||
    haystack.includes('shoulder') ||
    haystack.includes('kjottdeig') ||
    haystack.includes('ground') ||
    haystack.includes('mince') ||
    haystack.includes('gryte') ||
    haystack.includes('steke') ||
    haystack.includes('stew') ||
    haystack.includes('roast meat')
  ) {
    return 'svinebog';
  }

  if (haystack.includes('polse') || haystack.includes('sausage') || haystack.includes('medister') || haystack.includes('julepolse')) {
    return 'svinebog';
  }

  if (haystack.includes('skinke') || haystack.includes('ham') || haystack.includes('prosciutto')) {
    return 'skinke';
  }

  if (haystack.includes('knoke') || haystack.includes('knuckle') || haystack.includes('hock') || haystack.includes('shank')) {
    return 'knoke';
  }

  if (haystack.includes('labb') || haystack.includes('trotter')) {
    return 'knoke';
  }

  return 'unknown';
}

function inferLegacyCutSlug(contentNameNo?: string | null, contentNameEn?: string | null): string | null {
  const haystack = normalizeForMatch(`${contentNameNo || ''} ${contentNameEn || ''}`);

  if (haystack.includes('guanciale') || haystack.includes('svinekinn') || haystack.includes('jowl')) return 'guanciale';
  if (haystack.includes('nakkekam') || haystack.includes('coppa')) return 'nakkekam-coppa';
  if (haystack.includes('slakterbiff') || haystack.includes('secreto') || haystack.includes('presa') || haystack.includes('pluma')) return 'secreto-presa-pluma';
  if (haystack.includes('indrefilet') || haystack.includes('tenderloin')) return 'indrefilet';
  if (haystack.includes('tomahawk')) return 'tomahawk-kotelett';
  if (haystack.includes('entrecote') || haystack.includes('ribeye')) return 'svine-entrecote';
  if (haystack.includes('ryggspekk') || haystack.includes('lardo') || haystack.includes('back fat')) return 'ryggspekk-lardo';
  if (haystack.includes('ribbevalg') || haystack.includes('rib selection')) return 'ribbevalg';
  if (haystack.includes('ekstra ribbe') || (haystack.includes('ribbe') && haystack.includes('ekstra'))) return 'ekstra-ribbe';
  if (haystack.includes('sideflesk')) return 'bacon-sideflesk';
  if (haystack.includes('bacon')) return 'bacon';
  if (haystack.includes('kokkefett') || haystack.includes('smult') || haystack.includes('cooking fat') || haystack.includes('lard')) return 'kokkefett-smult';
  if (haystack.includes('bogstek') || (haystack.includes('bog') && haystack.includes('stek')) || haystack.includes('shoulder roast')) return 'bogstek';
  if (haystack.includes('kjottdeig')) return 'kjottdeig-grov';
  if (haystack.includes('gryte') || haystack.includes('stew') || haystack.includes('roast meat')) return 'gryte-stekekjott';
  if (haystack.includes('bbq') && haystack.includes('polse')) return 'bbq-polse';
  if (haystack.includes('premium') && haystack.includes('polse')) return 'premium-polse';
  if (haystack.includes('medister') && haystack.includes('farse')) return 'medisterfarse';
  if (haystack.includes('medister') && haystack.includes('polse')) return 'medisterpolser';
  if (haystack.includes('julepolse') || (haystack.includes('christmas') && haystack.includes('sausage'))) return 'julepolse';
  if (haystack.includes('knoke') || haystack.includes('knuckle') || haystack.includes('hock')) return 'knoke';
  if (haystack.includes('skinke') || haystack.includes('ham')) return 'skinke-speking';
  if (haystack.includes('ytrefilet') || haystack.includes('ryggfilet') || haystack.includes('loin fillet')) return 'ytrefilet-ryggfilet';
  if (haystack.includes('svinekoteletter') || (haystack.includes('pork') && haystack.includes('chops'))) return 'svinekoteletter';
  if (haystack.includes('labb') || haystack.includes('trotter')) return 'labb';

  return null;
}

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
        cut_size_from_kg: cut?.size_from_kg ?? null,
        cut_size_to_kg: cut?.size_to_kg ?? null,
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

async function normalizeLegacyPresets(presetRows: PresetRow[]) {
  const presetIds = presetRows.map((preset) => preset.id);
  const { data: legacyContents, error: legacyError } = await supabaseAdmin
    .from('mangalitsa_preset_contents')
    .select('id,preset_id,content_name_no,content_name_en,target_weight_kg,display_order,is_hero')
    .in('preset_id', presetIds)
    .order('display_order', { ascending: true });

  if (legacyError) {
    throw legacyError;
  }

  const rows = (legacyContents || []) as LegacyPresetContentRow[];
  return presetRows.map((preset) => ({
    ...preset,
    contents: rows
      .filter((row) => row.preset_id === preset.id)
      .map((row, idx) => ({
        id: row.id,
        cut_id: null,
        cut_slug: inferLegacyCutSlug(row.content_name_no, row.content_name_en),
        cut_size_from_kg: null,
        cut_size_to_kg: null,
        part_key: inferLegacyPartKey(row.content_name_no, row.content_name_en),
        part_name_no: null,
        part_name_en: null,
        cut_description_no: null,
        cut_description_en: null,
        content_name_no: row.content_name_no,
        content_name_en: row.content_name_en,
        target_weight_kg: row.target_weight_kg ?? null,
        quantity: null,
        quantity_unit_no: null,
        quantity_unit_en: null,
        display_order: row.display_order ?? idx + 1,
        is_hero: Boolean(row.is_hero),
      }))
      .sort((a, b) => a.display_order - b.display_order),
  }));
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
      try {
        const legacyPresets = await normalizeLegacyPresets(presetRows);
        return NextResponse.json(
          { presets: legacyPresets, legacy: true },
          {
            headers: {
              'Cache-Control': 'no-store, must-revalidate',
            },
          }
        );
      } catch (legacyFallbackError) {
        logError('mangalitsa-presets-route-legacy-fallback', legacyFallbackError);
        return NextResponse.json(
          { error: 'Missing relational cut tables. Run the latest Supabase migrations.' },
          { status: 500 }
        );
      }
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
        logError('mangalitsa-presets-route-cuts', cutsError);
        try {
          const legacyPresets = await normalizeLegacyPresets(presetRows);
          return NextResponse.json(
            { presets: legacyPresets, legacy: true },
            {
              headers: {
                'Cache-Control': 'no-store, must-revalidate',
              },
            }
          );
        } catch (legacyFallbackError) {
          logError('mangalitsa-presets-route-legacy-fallback', legacyFallbackError);
          return NextResponse.json({ error: 'Failed to fetch cuts catalog' }, { status: 500 });
        }
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
        try {
          const legacyPresets = await normalizeLegacyPresets(presetRows);
          return NextResponse.json(
            { presets: legacyPresets, legacy: true },
            {
              headers: {
                'Cache-Control': 'no-store, must-revalidate',
              },
            }
          );
        } catch (legacyFallbackError) {
          logError('mangalitsa-presets-route-legacy-fallback', legacyFallbackError);
          return NextResponse.json({ error: 'Failed to fetch pig parts' }, { status: 500 });
        }
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
