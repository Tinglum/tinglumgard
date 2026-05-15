import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const inventoryId = searchParams.get('inventoryId');

    if (!inventoryId) {
      return NextResponse.json({ error: 'inventoryId query parameter required' }, { status: 400 });
    }

    const { data: batches, error } = await supabaseAdmin
      .from('egg_collection_batches')
      .select('*')
      .eq('inventory_id', inventoryId)
      .order('collected_date', { ascending: false });

    if (error) {
      logError('admin-egg-collection-batches-fetch', error);
      return NextResponse.json({ error: 'Failed to fetch collection batches' }, { status: 500 });
    }

    const totalCollected = (batches || []).reduce((sum, b) => sum + (b.quantity || 0), 0);

    return NextResponse.json({ batches: batches || [], totalCollected });
  } catch (error) {
    logError('admin-egg-collection-batches-get', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { inventoryId, collectedDate, quantity, notes } = body;

    if (!inventoryId) {
      return NextResponse.json({ error: 'inventoryId required' }, { status: 400 });
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 });
    }

    if (!collectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(collectedDate))) {
      return NextResponse.json({ error: 'collectedDate must be a valid date (YYYY-MM-DD)' }, { status: 400 });
    }

    // Verify inventory exists
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('egg_inventory')
      .select('id')
      .eq('id', inventoryId)
      .maybeSingle();

    if (inventoryError || !inventory) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
    }

    const { data: batch, error: insertError } = await supabaseAdmin
      .from('egg_collection_batches')
      .insert({
        inventory_id: inventoryId,
        collected_date: collectedDate,
        quantity: qty,
        notes: notes?.trim() || null,
      })
      .select('*')
      .single();

    if (insertError) {
      logError('admin-egg-collection-batches-insert', insertError);
      return NextResponse.json({ error: 'Failed to record collection batch' }, { status: 500 });
    }

    // Compute total collected for this inventory
    const { data: allBatches } = await supabaseAdmin
      .from('egg_collection_batches')
      .select('quantity')
      .eq('inventory_id', inventoryId);

    const totalCollected = (allBatches || []).reduce((sum, b) => sum + (b.quantity || 0), 0);

    return NextResponse.json({ success: true, batch, totalCollected });
  } catch (error) {
    logError('admin-egg-collection-batches-post', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
