import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { data: cuts, error } = await supabaseAdmin
      .from('cuts_catalog')
      .select(`
        id,
        slug,
        name_no,
        name_en,
        chef_name_no,
        chef_name_en,
        display_order,
        active,
        part:pig_parts(
          id,
          key,
          name_no,
          name_en,
          display_order
        )
      `)
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (error) {
      logError('admin-mangalitsa-cuts', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ cuts: cuts || [] });
  } catch (error) {
    logError('admin-mangalitsa-cuts', error);
    return NextResponse.json({ error: 'Failed to fetch cuts catalog' }, { status: 500 });
  }
}
