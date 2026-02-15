import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

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
        .select('id,slug,name_no,name_en,chef_name_no,chef_name_en,description_no,description_en,part_id')
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

      return ({
      ...extra,
      cut_id: extra.cut_id ?? null,
      cut_slug: cut?.slug ?? null,
      part_key: part?.key ?? null,
      part_name_no: part?.name_no ?? null,
      part_name_en: part?.name_en ?? null,
      cut_description_no: cut?.description_no ?? null,
      cut_description_en: cut?.description_en ?? null,
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
