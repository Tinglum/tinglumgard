import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

const ALLOWED_RECIPE_FIELDS = new Set([
  'slug', 'title_no', 'title_en',
  'intro_no', 'intro_en',
  'ingredients_no', 'ingredients_en',
  'steps_no', 'steps_en',
  'tips_no', 'tips_en',
  'mangalitsa_tip_no', 'mangalitsa_tip_en',
  'difficulty', 'prep_time_minutes', 'cook_time_minutes', 'servings',
  'image_url', 'related_extra_slugs',
  'active', 'display_order',
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

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawUpdates)) {
      if (ALLOWED_RECIPE_FIELDS.has(key)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('recipes')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      logError('admin-recipes-update', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ recipe: data });
  } catch (error) {
    logError('admin-recipes-update', error);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
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
    // Soft delete
    const { error } = await supabaseAdmin
      .from('recipes')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) {
      logError('admin-recipes-delete', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('admin-recipes-delete', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
