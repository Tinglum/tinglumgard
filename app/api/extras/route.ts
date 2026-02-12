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

    const normalizedExtras = (extras || []).map((extra) => ({
      ...extra,
      description_premium_no: extra.description_premium_no ?? extra.description_no ?? null,
      description_premium_en: extra.description_premium_en ?? extra.description_en ?? null,
      chef_term_no: extra.chef_term_no ?? null,
      chef_term_en: extra.chef_term_en ?? null,
      recipe_suggestions: extra.recipe_suggestions ?? [],
      preparation_tips_no: extra.preparation_tips_no ?? null,
      preparation_tips_en: extra.preparation_tips_en ?? null,
    }));

    return NextResponse.json({ extras: normalizedExtras });
  } catch (error) {
    logError('extras-route', error);
    return NextResponse.json({ error: 'Failed to fetch extras' }, { status: 500 });
  }
}
