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
    const { data: parts, error } = await supabaseAdmin
      .from('pig_parts')
      .select('id,key,name_no,name_en,display_order,active')
      .order('display_order', { ascending: true });

    if (error) {
      if ((error as any).code === 'PGRST205') {
        return NextResponse.json({ parts: [], legacy: true });
      }
      logError('admin-mangalitsa-parts', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ parts: parts || [] });
  } catch (error) {
    logError('admin-mangalitsa-parts', error);
    return NextResponse.json({ error: 'Failed to fetch pig parts' }, { status: 500 });
  }
}

