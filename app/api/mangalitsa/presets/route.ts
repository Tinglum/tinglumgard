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
      return NextResponse.json(
        { presets: fallbackPresets, fallback: true },
        {
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
          },
        }
      );
    }

    // Sort contents within each preset
    const sortedPresets = (presets || []).map((preset: any) => ({
      ...preset,
      contents: (preset.contents || []).sort((a: any, b: any) => a.display_order - b.display_order),
    }));

    return NextResponse.json(
      { presets: sortedPresets },
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
