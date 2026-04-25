import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

/**
 * POST /api/admin/orders/[id]/adjust-box
 * Change box size and/or extras for a pig order at pickup time.
 * Recalculates total, deposit, remainder and appends an admin note.
 *
 * Body: { boxSize?: 8|12, mangalitsaPresetId?: string|null, extraIds?: string[], adminNote?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const adminNote = typeof body.adminNote === 'string' ? body.adminNote.trim() : '';

    // Fetch current order with extras
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, order_extras(*, extras_catalog(*))')
      .eq('id', params.id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (['cancelled', 'forfeited', 'completed'].includes(order.status)) {
      return NextResponse.json({ error: 'Order is not eligible for changes' }, { status: 400 });
    }

    const changes: string[] = [];
    const updates: Record<string, unknown> = {};

    // --- Box size change ---
    let newBoxSize = order.box_size;
    let newMangalitsaPresetId = order.mangalitsa_preset_id ?? null;
    let newBoxPriceNok = 0;

    if (body.boxSize !== undefined && body.boxSize !== null) {
      const nextSize = Number(body.boxSize);
      if (![8, 12].includes(nextSize)) {
        return NextResponse.json({ error: 'Invalid box size. Must be 8 or 12.' }, { status: 400 });
      }

      // Fetch box price from box_configurations or app_config
      const { data: boxConfig } = await supabaseAdmin
        .from('box_configurations')
        .select('price')
        .eq('box_size', nextSize)
        .maybeSingle();

      if (!boxConfig) {
        return NextResponse.json({ error: `No price configured for ${nextSize}kg box` }, { status: 400 });
      }

      if (nextSize !== order.box_size) {
        changes.push(`Boks endret: ${order.box_size}kg → ${nextSize}kg`);
        newBoxSize = nextSize;
        newMangalitsaPresetId = null; // Standard box, not Mangalitsa
        updates.box_size = nextSize;
        updates.mangalitsa_preset_id = null;
        updates.is_mangalitsa = false;
      }
      newBoxPriceNok = Number(boxConfig.price);
    } else if (body.mangalitsaPresetId !== undefined && body.mangalitsaPresetId !== null) {
      // Mangalitsa preset change
      const { data: preset } = await supabaseAdmin
        .from('mangalitsa_box_presets')
        .select('id, name_no, price_nok')
        .eq('id', body.mangalitsaPresetId)
        .maybeSingle();

      if (!preset) {
        return NextResponse.json({ error: 'Mangalitsa preset not found' }, { status: 404 });
      }

      if (preset.id !== order.mangalitsa_preset_id) {
        changes.push(`Mangalitsa-pakke endret til: ${preset.name_no}`);
        newMangalitsaPresetId = preset.id;
        updates.mangalitsa_preset_id = preset.id;
        updates.box_size = null;
        updates.is_mangalitsa = true;
      }
      newBoxPriceNok = Number(preset.price_nok);
    } else {
      // No box change — use current box price
      if (order.is_mangalitsa && order.mangalitsa_preset_id) {
        const { data: preset } = await supabaseAdmin
          .from('mangalitsa_box_presets')
          .select('price_nok')
          .eq('id', order.mangalitsa_preset_id)
          .maybeSingle();
        newBoxPriceNok = Number(preset?.price_nok ?? 0);
      } else {
        const { data: boxConfig } = await supabaseAdmin
          .from('box_configurations')
          .select('price')
          .eq('box_size', order.box_size)
          .maybeSingle();
        newBoxPriceNok = Number(boxConfig?.price ?? 0);
      }
    }

    // --- Extras change ---
    if (Array.isArray(body.extraIds)) {
      const incomingIds: string[] = body.extraIds;

      // Delete all existing extras for this order
      const { error: deleteError } = await supabaseAdmin
        .from('order_extras')
        .delete()
        .eq('order_id', params.id);

      if (deleteError) {
        logError('adjust-box-delete-extras', deleteError);
        return NextResponse.json({ error: 'Failed to update extras' }, { status: 500 });
      }

      // Insert new extras
      if (incomingIds.length > 0) {
        const insertRows = incomingIds.map((extraId) => ({
          order_id: params.id,
          extra_id: extraId,
        }));

        const { error: insertError } = await supabaseAdmin
          .from('order_extras')
          .insert(insertRows);

        if (insertError) {
          logError('adjust-box-insert-extras', insertError);
          return NextResponse.json({ error: 'Failed to insert extras' }, { status: 500 });
        }
      }

      const oldExtraCount = (order.order_extras || []).length;
      if (oldExtraCount !== incomingIds.length || oldExtraCount > 0) {
        changes.push(`Tilbehør oppdatert (${incomingIds.length} valgt)`);
      }
    }

    // --- Recalculate totals ---
    // Re-fetch extras with prices
    const { data: newExtras } = await supabaseAdmin
      .from('order_extras')
      .select('*, extras_catalog(price_nok)')
      .eq('order_id', params.id);

    const extrasTotal = (newExtras || []).reduce(
      (sum: number, e: any) => sum + Number(e.extras_catalog?.price_nok ?? 0),
      0
    );

    const newTotal = newBoxPriceNok + extrasTotal;
    const existingDeposit = Number(order.deposit_amount ?? 0);
    const newRemainder = Math.max(0, newTotal - existingDeposit);

    updates.total_amount = newTotal;
    updates.remainder_amount = newRemainder;

    // Status: if remainder increased and order was fully paid, revert to deposit_paid
    if (newRemainder > 0 && order.status === 'completed') {
      updates.status = 'deposit_paid';
      changes.push('Status tilbakestilt til deposit_paid (ny restbetaling)');
    }

    // Admin note
    const noteLines = changes.slice();
    if (adminNote) noteLines.push(`Notat: ${adminNote}`);
    if (noteLines.length > 0) {
      const fullNote = `[${new Date().toISOString().slice(0, 16)}] Justert ved henting: ${noteLines.join('; ')}`;
      const existingNotes = order.admin_notes || '';
      updates.admin_notes = [existingNotes, fullNote].filter(Boolean).join('\n');
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update(updates)
        .eq('id', params.id);

      if (updateError) {
        logError('adjust-box-update', updateError);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
      }
    }

    // Refetch final order
    const { data: finalOrder } = await supabaseAdmin
      .from('orders')
      .select('*, order_extras(*, extras_catalog(*))')
      .eq('id', params.id)
      .single();

    return NextResponse.json({
      success: true,
      changes,
      order: finalOrder,
      newTotal,
      newRemainder,
      extrasTotal,
    });
  } catch (error) {
    logError('adjust-box-unexpected', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
