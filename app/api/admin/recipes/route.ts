import { NextRequest, NextResponse } from 'next/server';
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
    const { data: recipes, error } = await supabaseAdmin
      .from('recipes')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ recipes: recipes || [] });
  } catch (error) {
    logError('admin-recipes-get', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const { data: recipe, error } = await supabaseAdmin
      .from('recipes')
      .insert({
        slug: body.slug,
        title_no: body.title_no,
        title_en: body.title_en,
        intro_no: body.intro_no || '',
        intro_en: body.intro_en || '',
        ingredients_no: body.ingredients_no || [],
        ingredients_en: body.ingredients_en || [],
        steps_no: body.steps_no || [],
        steps_en: body.steps_en || [],
        tips_no: body.tips_no || '',
        tips_en: body.tips_en || '',
        mangalitsa_tip_no: body.mangalitsa_tip_no || '',
        mangalitsa_tip_en: body.mangalitsa_tip_en || '',
        difficulty: body.difficulty || 'medium',
        prep_time_minutes: parseInt(body.prep_time_minutes) || 0,
        cook_time_minutes: parseInt(body.cook_time_minutes) || 0,
        servings: parseInt(body.servings) || 4,
        image_url: body.image_url || '',
        related_extra_slugs: body.related_extra_slugs || [],
        active: body.active !== undefined ? body.active : true,
        display_order: parseInt(body.display_order) || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ recipe });
  } catch (error) {
    logError('admin-recipes-post', error);
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
