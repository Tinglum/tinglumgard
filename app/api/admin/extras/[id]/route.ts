import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

const ALLOWED_EXTRAS_FIELDS = new Set([
  'cut_id',
  'name_no', 'name_en',
  'description_no', 'description_en',
  'description_premium_no', 'description_premium_en',
  'chef_term_no', 'chef_term_en',
  'recipe_suggestions',
  'preparation_tips_no', 'preparation_tips_en',
  'price_nok', 'pricing_type',
  'default_quantity', 'display_order',
  'active', 'consumes_inventory_kg', 'kg_per_unit',
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const rawUpdates = await request.json();

    // Whitelist allowed fields
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawUpdates)) {
      if (ALLOWED_EXTRAS_FIELDS.has(key)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

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
