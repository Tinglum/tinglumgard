import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type PartKey = 'nakke' | 'svinebog' | 'kotelettkam' | 'ribbeside' | 'skinke' | 'knoke';

const PART_META: Record<PartKey, { no: string; en: string }> = {
  nakke: { no: 'Nakke', en: 'Neck' },
  svinebog: { no: 'Svinebog', en: 'Shoulder' },
  kotelettkam: { no: 'Kotelettkam', en: 'Loin' },
  ribbeside: { no: 'Ribbeside', en: 'Belly / Ribs' },
  skinke: { no: 'Skinke', en: 'Ham' },
  knoke: { no: 'Knoke', en: 'Hock / Knuckle' },
};

// Fallback mapping so "Fra del av grisen" still works even if cut joins are missing.
const EXTRA_SLUG_TO_PART_KEY: Record<string, PartKey> = {
  // Nakke
  'extra-guanciale': 'nakke',
  'extra-coppa': 'nakke',
  'extra-secreto-presa-pluma': 'nakke',

  // Kotelettkam
  'indrefilet': 'kotelettkam',
  'ytrefilet': 'kotelettkam',
  'extra-tomahawk': 'kotelettkam',
  'extra-svine-entrecote': 'kotelettkam',
  'koteletter': 'kotelettkam',
  'svinekam': 'kotelettkam',
  'extra-spekk': 'kotelettkam',
  'kamsteik': 'kotelettkam',

  // Ribbeside
  'ekstra_ribbe': 'ribbeside',
  'bacon': 'ribbeside',
  'pinnekjott': 'ribbeside',
  'pinnekjÃ¸tt': 'ribbeside',
  'extra-pancetta': 'ribbeside',
  'extra-smult': 'ribbeside',

  // Svinebog
  'bogsteik': 'svinebog',
  'kjottdeig': 'svinebog',
  'kjottbiter': 'svinebog',
  'polser': 'svinebog',
  'medisterpolse': 'svinebog',
  'medisterpÃ¸lse': 'svinebog',

  // Knoke
  'svinelabb': 'knoke',
  'extra-knoke': 'knoke',

  // Skinke
  'spekeskinke': 'skinke',
  'extra-skinke-speking': 'skinke',
};

export async function GET() {
  try {
    const { data: extras, error } = await supabaseAdmin
      .from('extras_catalog')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (error) {
      logError('extras-route', error);
      return NextResponse.json({ error: 'Failed to fetch extras' }, { status: 500 });
    }

    const extraRows = (extras || []) as any[];

    // Optional enrichment from cuts_catalog + pig_parts (for oppdelingsplan mapping).
    const cutIds: string[] = Array.from(
      new Set(extraRows.map((row) => row.cut_id).filter(Boolean))
    );

    const cutsById = new Map<string, any>();
    const partsById = new Map<string, any>();

    if (cutIds.length > 0) {
      const { data: cuts, error: cutsError } = await supabaseAdmin
        .from('cuts_catalog')
        .select('id,slug,name_no,name_en,chef_name_no,chef_name_en,description_no,description_en,size_from_kg,size_to_kg,part_id')
        .in('id', cutIds);

      if (!cutsError && cuts) {
        for (const cut of cuts) {
          cutsById.set(cut.id, cut);
        }

        const partIds: string[] = Array.from(
          new Set((cuts || []).map((cut: any) => cut.part_id).filter(Boolean))
        );

        if (partIds.length > 0) {
          const { data: parts, error: partsError } = await supabaseAdmin
            .from('pig_parts')
            .select('id,key,name_no,name_en')
            .in('id', partIds);

          if (!partsError && parts) {
            for (const part of parts) {
              partsById.set(part.id, part);
            }
          }
        }
      } else if (cutsError && (cutsError as any).code !== 'PGRST205') {
        // If the relational cut catalog exists but fails, log. If it doesn't exist, ignore.
        logError('extras-route-cuts', cutsError);
      }
    }

    const normalizedExtras = extraRows.map((extra) => {
      const cut = extra.cut_id ? cutsById.get(extra.cut_id) || null : null;
      const part = cut?.part_id ? partsById.get(cut.part_id) || null : null;
      const fallbackPartKey = EXTRA_SLUG_TO_PART_KEY[String(extra.slug || '')] || null;
      const fallbackPartMeta = fallbackPartKey ? PART_META[fallbackPartKey] : null;

      return ({
      ...extra,
      cut_id: extra.cut_id ?? null,
      cut_slug: cut?.slug ?? null,
      part_key: part?.key ?? fallbackPartKey ?? null,
      part_name_no: part?.name_no ?? fallbackPartMeta?.no ?? null,
      part_name_en: part?.name_en ?? fallbackPartMeta?.en ?? null,
      cut_description_no: cut?.description_no ?? null,
      cut_description_en: cut?.description_en ?? null,
      cut_size_from_kg: cut?.size_from_kg ?? null,
      cut_size_to_kg: cut?.size_to_kg ?? null,
      description_premium_no: extra.description_premium_no ?? extra.description_no ?? null,
      description_premium_en: extra.description_premium_en ?? extra.description_en ?? null,
      chef_term_no: extra.chef_term_no ?? null,
      chef_term_en: extra.chef_term_en ?? null,
      recipe_suggestions: extra.recipe_suggestions ?? [],
      preparation_tips_no: extra.preparation_tips_no ?? null,
      preparation_tips_en: extra.preparation_tips_en ?? null,
      });
    });

    return NextResponse.json({ extras: normalizedExtras });
  } catch (error) {
    logError('extras-route', error);
    return NextResponse.json({ error: 'Failed to fetch extras' }, { status: 500 });
  }
}
