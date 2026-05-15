import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Get all breeds (including inactive)
export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('egg_breeds')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    logError('admin-eggs-breeds-get', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create new breed
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from('egg_breeds')
      .insert([
        {
          name: body.name,
          slug: body.slug,
          description: body.description || '',
          image_url: body.image_url || '',
          price_per_egg: body.price_per_egg,
          min_egg_weight_grams:
            body.min_egg_weight_grams !== undefined ? body.min_egg_weight_grams : null,
          accent_color: body.accent_color || '#000000',
          active: body.active !== undefined ? body.active : true,
          display_order: body.display_order || 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    logError('admin-eggs-breeds-create', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
