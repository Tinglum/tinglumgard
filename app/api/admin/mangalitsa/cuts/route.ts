import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { data: cuts, error } = await supabaseAdmin
      .from('cuts_catalog')
      .select('id,slug,name_no,name_en,chef_name_no,chef_name_en,display_order,active,part_id')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (error) {
      logError('admin-mangalitsa-cuts', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const cutRows = cuts || [];
    const partIds = Array.from(new Set(cutRows.map((cut: any) => cut.part_id).filter(Boolean)));

    let partMap = new Map<string, any>();
    if (partIds.length > 0) {
      const { data: parts, error: partsError } = await supabaseAdmin
        .from('pig_parts')
        .select('id,key,name_no,name_en,display_order')
        .in('id', partIds);

      if (partsError) {
        logError('admin-mangalitsa-cuts-parts', partsError);
        return NextResponse.json({ error: partsError.message }, { status: 500 });
      }

      partMap = new Map((parts || []).map((part: any) => [part.id, part]));
    }

    const normalizedCuts = cutRows.map((cut: any) => ({
      ...cut,
      part: cut.part_id ? partMap.get(cut.part_id) || null : null,
    }));

    return NextResponse.json({ cuts: normalizedCuts });
  } catch (error) {
    logError('admin-mangalitsa-cuts', error);
    return NextResponse.json({ error: 'Failed to fetch cuts catalog' }, { status: 500 });
  }
}
