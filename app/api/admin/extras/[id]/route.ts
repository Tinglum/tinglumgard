import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const updates = await request.json();

    const { data, error } = await supabaseAdmin
      .from('extras_catalog')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      logError('admin-extras-update', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ extra: data });
  } catch (error) {
    logError('admin-extras-update', error);
    return NextResponse.json({ error: 'Failed to update extra' }, { status: 500 });
  }
}
