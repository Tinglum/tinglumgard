import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Update breed
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.image_url !== undefined) updateData.image_url = body.image_url;
    if (body.price_per_egg !== undefined) updateData.price_per_egg = body.price_per_egg;
    if (body.min_egg_weight_grams !== undefined)
      updateData.min_egg_weight_grams = body.min_egg_weight_grams;
    if (body.accent_color !== undefined) updateData.accent_color = body.accent_color;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.display_order !== undefined) updateData.display_order = body.display_order;

    const { data, error } = await supabaseAdmin
      .from('egg_breeds')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating breed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete breed
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if breed has any orders
    const { count } = await supabaseAdmin
      .from('egg_orders')
      .select('*', { count: 'exact', head: true })
      .eq('breed_id', id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete breed with existing orders. Set it to inactive instead.' },
        { status: 400 }
      );
    }

    // Check if breed has any inventory
    const { count: inventoryCount } = await supabaseAdmin
      .from('egg_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('breed_id', id);

    if (inventoryCount && inventoryCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete breed with existing inventory. Set it to inactive instead.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('egg_breeds')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting breed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
