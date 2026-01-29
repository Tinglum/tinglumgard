import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Fetch box configurations
    const { data: boxConfigs, error } = await supabaseAdmin
      .from('box_configurations')
      .select('*')
      .order('box_size', { ascending: true });

    if (error) throw error;

    // If no configs exist, create default ones
    if (!boxConfigs || boxConfigs.length === 0) {
      const defaultConfigs = [
        {
          box_size: 8,
          price: 6490,
          items: [
            { id: 'item_1', name: 'Entrecôte', quantity: 1.5, unit: 'kg' },
            { id: 'item_2', name: 'Indrefilet', quantity: 1, unit: 'kg' },
            { id: 'item_3', name: 'Oksebiff', quantity: 1.5, unit: 'kg' },
            { id: 'item_4', name: 'Flatbiff', quantity: 1, unit: 'kg' },
            { id: 'item_5', name: 'Kjøttdeig', quantity: 2, unit: 'kg' },
            { id: 'item_6', name: 'Gryte', quantity: 1, unit: 'kg' },
          ],
          description: 'Perfekt for mindre husstander. Inneholder et variert utvalg av kvalitetsokse.',
        },
        {
          box_size: 12,
          price: 8990,
          items: [
            { id: 'item_1', name: 'Entrecôte', quantity: 2, unit: 'kg' },
            { id: 'item_2', name: 'Indrefilet', quantity: 1.5, unit: 'kg' },
            { id: 'item_3', name: 'Oksebiff', quantity: 2, unit: 'kg' },
            { id: 'item_4', name: 'Flatbiff', quantity: 1.5, unit: 'kg' },
            { id: 'item_5', name: 'Kjøttdeig', quantity: 3, unit: 'kg' },
            { id: 'item_6', name: 'Gryte', quantity: 1.5, unit: 'kg' },
            { id: 'item_7', name: 'Mørbrad', quantity: 0.5, unit: 'kg' },
          ],
          description: 'Ideell for større familier. Mer kjøtt og større variasjon.',
        },
      ];

      const { data: insertedConfigs, error: insertError } = await supabaseAdmin
        .from('box_configurations')
        .insert(defaultConfigs)
        .select();

      if (insertError) throw insertError;

      return NextResponse.json({ boxes: insertedConfigs });
    }

    return NextResponse.json({ boxes: boxConfigs });
  } catch (error) {
    console.error('Box config GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch box configurations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { box_size, price, items, description } = body;

    // Upsert the box configuration
    const { data, error } = await supabaseAdmin
      .from('box_configurations')
      .upsert({
        box_size,
        price,
        items,
        description,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'box_size'
      })
      .select()
      .single();

    if (error) throw error;

    // Also update the pricing in config table for backwards compatibility
    await supabaseAdmin
      .from('config')
      .upsert({
        key: `box_${box_size}kg_price`,
        value: price.toString(),
      });

    return NextResponse.json({ success: true, box: data });
  } catch (error) {
    console.error('Box config POST error:', error);
    return NextResponse.json({ error: 'Failed to update box configuration' }, { status: 500 });
  }
}
