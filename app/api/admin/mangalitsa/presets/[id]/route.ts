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
      .from('mangalitsa_box_presets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      logError('admin-mangalitsa-preset-update', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ preset: data });
  } catch (error) {
    logError('admin-mangalitsa-preset-update', error);
    return NextResponse.json({ error: 'Failed to update preset' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('mangalitsa_box_presets')
      .delete()
      .eq('id', params.id);

    if (error) {
      logError('admin-mangalitsa-preset-delete', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('admin-mangalitsa-preset-delete', error);
    return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 });
  }
}
