import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

const fallbackPresets = [
  {
    id: 'fallback-premium-cuts',
    slug: 'premium-cuts',
    name_no: 'Premium Cuts',
    name_en: 'Premium Cuts',
    short_pitch_no: 'Alt det kule',
    short_pitch_en: 'All the cool stuff',
    description_no: 'Svinekinn, coppa og slakterens hemmelige biffer.',
    description_en: 'Pork jowl, coppa and butcher secret steaks.',
    target_weight_kg: 8,
    price_nok: 4900,
    display_order: 1,
    scarcity_message_no: 'Kun 1 av 4 bokser per gris',
    scarcity_message_en: 'Only 1 of 4 boxes per pig',
    contents: [
      { content_name_no: 'Svinekinn (guanciale)', content_name_en: 'Pork jowl (guanciale)', display_order: 1, is_hero: true },
      { content_name_no: 'Nakkekam (coppa)', content_name_en: 'Neck collar (coppa)', display_order: 2, is_hero: true },
      { content_name_no: 'Slakterbiff (secreto, presa, pluma)', content_name_en: 'Butcher steak (secreto, presa, pluma)', display_order: 3, is_hero: true },
      { content_name_no: 'Ryggspekk (lardo)', content_name_en: 'Back fat (lardo)', display_order: 4, is_hero: false },
    ],
  },
  {
    id: 'fallback-bbq-steakhouse',
    slug: 'bbq-steakhouse',
    name_no: 'BBQ og Steakhouse',
    name_en: 'BBQ & Steakhouse',
    short_pitch_no: 'Helgemat og grill',
    short_pitch_en: 'Weekend feasts & grill',
    description_no: 'Tomahawk, svine-entrecote og bogstek for grill og smoker.',
    description_en: 'Tomahawk, pork ribeye and shoulder roast for grill and smoker.',
    target_weight_kg: 9,
    price_nok: 3900,
    display_order: 2,
    scarcity_message_no: 'Kun 1 av 4 bokser per gris',
    scarcity_message_en: 'Only 1 of 4 boxes per pig',
    contents: [
      { content_name_no: 'Tomahawk-kotelett, 2 stk', content_name_en: 'Tomahawk chop, 2 pcs', display_order: 1, is_hero: true },
      { content_name_no: 'Svine-entrecote, 2 stk', content_name_en: 'Pork ribeye, 2 pcs', display_order: 2, is_hero: true },
      { content_name_no: 'Bogstek', content_name_en: 'Shoulder roast', display_order: 3, is_hero: false },
      { content_name_no: 'Ribbevalg, 1,5 kg', content_name_en: 'Rib selection, 1.5 kg', display_order: 4, is_hero: false },
    ],
  },
  {
    id: 'fallback-julespesial',
    slug: 'julespesial',
    name_no: 'Julespesial',
    name_en: 'Christmas Special',
    short_pitch_no: 'Ribbe + medisterpakka',
    short_pitch_en: 'Ribs + sausage package',
    description_no: 'Ribbevalg, medisterpølser og medisterfarse av Mangalitsa.',
    description_en: 'Rib selection, medister sausages and medister mince from Mangalitsa.',
    target_weight_kg: 8,
    price_nok: 3700,
    display_order: 3,
    scarcity_message_no: 'Kun 1 av 4 bokser per gris',
    scarcity_message_en: 'Only 1 of 4 boxes per pig',
    contents: [
      { content_name_no: 'Ribbevalg, 1,5 kg', content_name_en: 'Rib selection, 1.5 kg', display_order: 1, is_hero: true },
      { content_name_no: 'Medisterpolser av Mangalitsa', content_name_en: 'Mangalitsa medister sausages', display_order: 2, is_hero: true },
      { content_name_no: 'Medisterfarse', content_name_en: 'Medister mince', display_order: 3, is_hero: true },
      { content_name_no: 'Knoke, 1 stk', content_name_en: 'Knuckle, 1 pc', display_order: 4, is_hero: false },
    ],
  },
  {
    id: 'fallback-familieboks',
    slug: 'familieboks',
    name_no: 'Familieboks',
    name_en: 'Family Box',
    short_pitch_no: 'Matuke og gode middager',
    short_pitch_en: 'Meal prep & good dinners',
    description_no: 'Bacon, koteletter, kjottdeig og pølser for premium hverdagsmat.',
    description_en: 'Bacon, chops, ground pork and sausages for premium everyday meals.',
    target_weight_kg: 10,
    price_nok: 3100,
    display_order: 4,
    scarcity_message_no: 'Kun 1 av 4 bokser per gris',
    scarcity_message_en: 'Only 1 of 4 boxes per pig',
    contents: [
      { content_name_no: 'Ribbevalg, 1,5 kg', content_name_en: 'Rib selection, 1.5 kg', display_order: 1, is_hero: false },
      { content_name_no: 'Bacon', content_name_en: 'Bacon', display_order: 2, is_hero: false },
      { content_name_no: 'Koteletter med fettkappe', content_name_en: 'Chops with fat cap', display_order: 3, is_hero: false },
      { content_name_no: 'Kjottdeig, grov og saftig', content_name_en: 'Ground pork, coarse & juicy', display_order: 4, is_hero: false },
    ],
  },
];

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
      // Fallback for environments where the relational cut migration is not applied yet.
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
        return NextResponse.json(
          { presets: fallbackPresets, fallback: true },
          {
            headers: {
              'Cache-Control': 'no-store, must-revalidate',
            },
          }
        );
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

    if (!relationalPresets || relationalPresets.length === 0) {
      return NextResponse.json(
        { presets: fallbackPresets, fallback: true },
        {
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
          },
        }
      );
    }

    const normalizedPresets = relationalPresets.map(normalizePreset);

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
