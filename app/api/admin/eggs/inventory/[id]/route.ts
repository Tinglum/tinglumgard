import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const ALLOWED_STATUSES = new Set(['open', 'closed', 'locked', 'sold_out']);

// Update inventory item
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;

    const updateData: any = {};

    if (body.eggs_available !== undefined) {
      const parsedCapacity = Number(body.eggs_available);
      if (!Number.isInteger(parsedCapacity) || parsedCapacity < 0) {
        return NextResponse.json({ error: 'Invalid eggs_available value' }, { status: 400 });
      }
      updateData.eggs_available = parsedCapacity;
    }

    if (body.status !== undefined) {
      if (!ALLOWED_STATUSES.has(body.status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      updateData.status = body.status;
    }

    if (body.delivery_monday !== undefined) {
      updateData.delivery_monday = body.delivery_monday;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('egg_inventory')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating inventory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete inventory item
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if inventory has any orders
    const { count } = await supabaseAdmin
      .from('egg_orders')
      .select('*', { count: 'exact', head: true })
      .eq('inventory_id', id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete inventory with existing orders.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('egg_inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting inventory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
