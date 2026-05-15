import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { data, error } = await supabaseAdmin
      .from('egg_inventory')
      .select(`
        id, breed_id, year, week_number, delivery_monday,
        eggs_available, eggs_allocated, status, forecast_source,
        auto_forecast_eggs, manual_adjustment, manual_override,
        egg_breeds (id, name, slug, accent_color)
      `)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    logError('inventory-get', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const body = await request.json();

    const insertObj: Record<string, unknown> = {
      breed_id: body.breed_id,
      year: body.year,
      week_number: body.week_number,
      delivery_monday: body.delivery_monday,
      eggs_available: body.eggs_available,
      auto_forecast_eggs: body.eggs_available,
      manual_adjustment: 0,
      manual_override: false,
      eggs_allocated: 0,
      status: body.status || 'open',
      forecast_source: 'manual',
    };

    let { data, error } = await supabaseAdmin
      .from('egg_inventory')
      .insert([insertObj])
      .select()
      .single();

    // code 42703 = column does not exist — schema predates optional columns; retry without them.
    if (error?.code === '42703') {
      delete insertObj.auto_forecast_eggs;
      delete insertObj.manual_adjustment;
      delete insertObj.manual_override;
      delete insertObj.forecast_source;

      const retry = await supabaseAdmin
        .from('egg_inventory')
        .insert([insertObj])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logError('inventory-post', error);
    return NextResponse.json({ error: 'Failed to create inventory week' }, { status: 500 });
  }
}
