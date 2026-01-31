import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        default_quantity,
      display_order,
      consumes_inventory_kg,
      kg_per_unit,
      active,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (slug !== undefined) updateData.slug = slug;
    if (name_no !== undefined) updateData.name_no = name_no;
    if (name_en !== undefined) updateData.name_en = name_en;
    if (description !== undefined) updateData.description = description;
    if (description_no !== undefined) updateData.description_no = description_no;
    if (description_en !== undefined) updateData.description_en = description_en;
    if (price_nok !== undefined) updateData.price_nok = parseInt(price_nok);
    if (pricing_type !== undefined) updateData.pricing_type = pricing_type;
    if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity ? parseInt(stock_quantity) : null;
    if (default_quantity !== undefined) updateData.default_quantity = parseFloat(default_quantity);
    if (display_order !== undefined) updateData.display_order = parseInt(display_order);
    if (consumes_inventory_kg !== undefined) updateData.consumes_inventory_kg = consumes_inventory_kg;
    if (kg_per_unit !== undefined) updateData.kg_per_unit = parseFloat(kg_per_unit);
    if (active !== undefined) updateData.active = active;

    const { data: extra, error } = await supabaseAdmin
      .from('extras_catalog')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ extra });
  } catch (error) {
    console.error('Error updating extra:', error);
    return NextResponse.json(
      { error: 'Failed to update extra' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('extras_catalog')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting extra:', error);
    return NextResponse.json(
      { error: 'Failed to delete extra' },
      { status: 500 }
    );
  }
}
