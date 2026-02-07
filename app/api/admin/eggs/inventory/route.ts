import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Get all inventory
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('egg_inventory')
      .select(`
        *,
        egg_breeds (
          id,
          name,
          slug,
          accent_color
        )
      `)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create new inventory week
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from('egg_inventory')
      .insert([
        {
          breed_id: body.breed_id,
          year: body.year,
          week_number: body.week_number,
          delivery_monday: body.delivery_monday,
          eggs_available: body.eggs_available,
          eggs_allocated: 0,
          status: body.status || 'open',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error creating inventory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
