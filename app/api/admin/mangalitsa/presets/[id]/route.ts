import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
