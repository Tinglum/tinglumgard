import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withSkinlessRibbe } from '@/lib/recipes/skinless';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: recipes, error } = await supabaseAdmin
      .from('recipes')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ recipes: (recipes || []).map(withSkinlessRibbe) });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}
