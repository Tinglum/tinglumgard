import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Get all breeds (including inactive)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('egg_breeds')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching breeds:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create new breed
export async function POST(request: Request) {
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
    console.error('Error creating breed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
