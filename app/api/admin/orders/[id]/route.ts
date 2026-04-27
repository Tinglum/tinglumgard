import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

function normalizeUuid(value?: string | null): string | null {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, order_extras(*, extras_catalog(*))')
      .eq('id', params.id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const [{ data: boxConfigs }, { data: extrasOptions }, { data: mangalitsaPresets }] =
      await Promise.all([
        supabaseAdmin.from('box_configurations').select('box_size, price').order('box_size'),
        supabaseAdmin.from('extras_catalog').select('id, name_no, price_nok').order('name_no'),
        supabaseAdmin.from('mangalitsa_box_presets').select('id, name_no, price_nok').order('price_nok'),
      ]);

    return NextResponse.json({ order, boxConfigs, extrasOptions, mangalitsaPresets });
  } catch (error) {
    console.error('Error fetching pig order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

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
    const { status, adminNotes, markDelivered } = body;

    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      updateData.status = status;
    }

    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes;
    }

    if (markDelivered) {
      updateData.marked_delivered_at = new Date().toISOString();
      updateData.marked_delivered_by = normalizeUuid(session.userId);
      updateData.status = 'completed';
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
