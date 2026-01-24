import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { data: extras, error } = await supabaseAdmin
      .from('extras_catalog')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ extras: extras || [] });
  } catch (error) {
    console.error('Error fetching extras:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extras' },
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
    const {
      slug,
      name_no,
      name_en,
      description,
      description_no,
      description_en,
      price_nok,
      pricing_type,
      stock_quantity,
      display_order,
      consumes_inventory_kg,
      kg_per_unit,
      active,
    } = body;

    const { data: extra, error } = await supabaseAdmin
      .from('extras_catalog')
      .insert({
        slug,
        name_no,
        name_en,
        description: description || null,
        description_no: description_no || null,
        description_en: description_en || null,
        price_nok: parseInt(price_nok),
        pricing_type: pricing_type || 'per_unit',
        stock_quantity: stock_quantity ? parseInt(stock_quantity) : null,
        display_order: display_order ? parseInt(display_order) : 0,
        consumes_inventory_kg: consumes_inventory_kg || false,
        kg_per_unit: parseFloat(kg_per_unit) || 0,
        active: active !== undefined ? active : true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ extra });
  } catch (error) {
    console.error('Error creating extra:', error);
    return NextResponse.json(
      { error: 'Failed to create extra' },
      { status: 500 }
    );
  }
}
