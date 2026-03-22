import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

interface Adjustment {
  type: 'main' | 'addition';
  additionId?: string | null;
  hensDelta: number;
  roostersDelta: number;
  poolHensReturn?: number;
  poolRoostersReturn?: number;
  poolHensIncrease?: number;
  poolRoostersIncrease?: number;
}

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
    const adjustments: Adjustment[] = body.adjustments || [];
    const adminNote = typeof body.adminNote === 'string' ? body.adminNote.trim() : '';

    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json({ error: 'No adjustments provided' }, { status: 400 });
    }

    // Fetch full order with relations
    const { data: order, error: orderError } = await supabaseAdmin
      .from('chicken_orders')
      .select(
        '*, chicken_breeds(*), chicken_hatches(*), chicken_payments(*), chicken_order_additions(*, chicken_breeds(*), chicken_hatches(*))'
      )
      .eq('id', params.id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const changes: string[] = [];

    for (const adj of adjustments) {
      const hensDelta = Math.round(Number(adj.hensDelta || 0));
      const roostersDelta = Math.round(Number(adj.roostersDelta || 0));

      if (hensDelta === 0 && roostersDelta === 0) continue;

      if (adj.type === 'main') {
        // --- Adjust main order line ---
        const newHens = Math.max(0, (order.quantity_hens || 0) + hensDelta);
        const newRoosters = Math.max(0, (order.quantity_roosters || 0) + roostersDelta);
        const hatchId = order.hatch_id;

        // Update order quantities
        const { error: updateErr } = await supabaseAdmin
          .from('chicken_orders')
          .update({ quantity_hens: newHens, quantity_roosters: newRoosters })
          .eq('id', order.id);

        if (updateErr) {
          logError('adjust-birds-update-main', updateErr);
          return NextResponse.json({ error: 'Failed to update order quantities' }, { status: 500 });
        }

        // Adjust hatch pool
        await adjustHatchPool(hatchId, adj, hensDelta, roostersDelta);

        const breedName = order.chicken_breeds?.name || 'Ukjent';
        changes.push(
          `Hovedlinje (${breedName}): høner ${order.quantity_hens}→${newHens}, haner ${order.quantity_roosters}→${newRoosters}`
        );
      } else if (adj.type === 'addition' && adj.additionId) {
        // --- Adjust addition line ---
        const addition = (order.chicken_order_additions || []).find(
          (a: any) => a.id === adj.additionId
        );
        if (!addition) {
          return NextResponse.json({ error: `Addition ${adj.additionId} not found` }, { status: 404 });
        }

        const newHens = Math.max(0, (addition.quantity_hens || 0) + hensDelta);
        const newRoosters = Math.max(0, (addition.quantity_roosters || 0) + roostersDelta);
        const pricePerHen = Number(addition.price_per_hen_nok || 0);
        const pricePerRooster = Number(addition.price_per_rooster_nok || 0);
        const newSubtotal = newHens * pricePerHen + newRoosters * pricePerRooster;
        const hatchId = addition.hatch_id;

        if (newHens === 0 && newRoosters === 0) {
          // Delete the addition if empty
          const { error: delErr } = await supabaseAdmin
            .from('chicken_order_additions')
            .delete()
            .eq('id', addition.id);

          if (delErr) {
            logError('adjust-birds-delete-addition', delErr);
            return NextResponse.json({ error: 'Failed to delete empty addition' }, { status: 500 });
          }
        } else {
          const { error: updateErr } = await supabaseAdmin
            .from('chicken_order_additions')
            .update({
              quantity_hens: newHens,
              quantity_roosters: newRoosters,
              subtotal_nok: newSubtotal,
            })
            .eq('id', addition.id);

          if (updateErr) {
            logError('adjust-birds-update-addition', updateErr);
            return NextResponse.json({ error: 'Failed to update addition' }, { status: 500 });
          }
        }

        // Adjust hatch pool
        await adjustHatchPool(hatchId, adj, hensDelta, roostersDelta);

        const breedName = addition.chicken_breeds?.name || 'Ukjent';
        changes.push(
          `Tillegg (${breedName}): høner ${addition.quantity_hens}→${newHens}, haner ${addition.quantity_roosters}→${newRoosters}`
        );
      }
    }

    // Recalculate order totals
    const { data: updatedOrder, error: refetchErr } = await supabaseAdmin
      .from('chicken_orders')
      .select('*, chicken_order_additions(*), chicken_payments(*)')
      .eq('id', order.id)
      .single();

    if (refetchErr || !updatedOrder) {
      return NextResponse.json({ error: 'Failed to reload order' }, { status: 500 });
    }

    const baseSubtotal =
      (updatedOrder.quantity_hens || 0) * Number(updatedOrder.price_per_hen_nok || 0) +
      (updatedOrder.quantity_roosters || 0) * Number(updatedOrder.price_per_rooster_nok || 0);

    const additionsSubtotal = (updatedOrder.chicken_order_additions || []).reduce(
      (sum: number, row: any) => sum + Number(row.subtotal_nok || 0),
      0
    );

    const deliveryFee = Number(updatedOrder.delivery_fee_nok || 0);
    const totalAmountNok = baseSubtotal + additionsSubtotal + deliveryFee;
    const depositAmountNok = Math.min(Number(updatedOrder.deposit_amount_nok || 0), totalAmountNok);
    const remainderAmountNok = Math.max(0, totalAmountNok - depositAmountNok);

    // Determine status based on payments
    const remainderPaidNok = (updatedOrder.chicken_payments || []).reduce(
      (sum: number, p: any) => {
        if (p.payment_type !== 'remainder' || p.status !== 'completed') return sum;
        return sum + Number(p.amount_nok || 0);
      },
      0
    );

    let newStatus = updatedOrder.status;
    if (
      updatedOrder.status === 'fully_paid' &&
      remainderAmountNok > 0 &&
      remainderPaidNok < remainderAmountNok
    ) {
      newStatus = 'deposit_paid';
    } else if (
      updatedOrder.status === 'deposit_paid' &&
      (remainderAmountNok <= 0 || remainderPaidNok >= remainderAmountNok)
    ) {
      newStatus = 'fully_paid';
    }

    // Build admin note
    const noteLines = changes.slice();
    if (adminNote) noteLines.push(`Notat: ${adminNote}`);
    const fullNote = `[${new Date().toISOString().slice(0, 16)}] Antall justert: ${noteLines.join('; ')}`;
    const existingNotes = updatedOrder.admin_notes || '';
    const newNotes = [existingNotes, fullNote].filter(Boolean).join('\n');

    const { error: finalErr } = await supabaseAdmin
      .from('chicken_orders')
      .update({
        subtotal_nok: Math.max(0, baseSubtotal),
        total_amount_nok: Math.max(0, totalAmountNok),
        remainder_amount_nok: Math.max(0, remainderAmountNok),
        status: newStatus,
        admin_notes: newNotes,
      })
      .eq('id', order.id);

    if (finalErr) {
      logError('adjust-birds-final-update', finalErr);
      return NextResponse.json({ error: 'Failed to recalculate totals' }, { status: 500 });
    }

    // Refetch final state
    const { data: finalOrder } = await supabaseAdmin
      .from('chicken_orders')
      .select(
        '*, chicken_breeds(*), chicken_hatches(*), chicken_payments(*), chicken_order_additions(*, chicken_breeds(*), chicken_hatches(*))'
      )
      .eq('id', order.id)
      .single();

    return NextResponse.json({
      success: true,
      changes,
      order: finalOrder,
    });
  } catch (error) {
    logError('adjust-birds-unexpected', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function adjustHatchPool(
  hatchId: string,
  adj: Adjustment,
  hensDelta: number,
  roostersDelta: number
) {
  if (!hatchId) return;

  const { data: hatch, error } = await supabaseAdmin
    .from('chicken_hatches')
    .select('available_hens, available_roosters')
    .eq('id', hatchId)
    .single();

  if (error || !hatch) {
    logError('adjust-birds-fetch-hatch', error);
    return;
  }

  let poolHensDelta = 0;
  let poolRoostersDelta = 0;

  if (hensDelta > 0) {
    // Adding birds: increase pool by poolIncrease, then deduct what we're adding to order
    const poolIncrease = Math.max(0, Math.round(Number(adj.poolHensIncrease || 0)));
    poolHensDelta = poolIncrease - hensDelta;
  } else if (hensDelta < 0) {
    // Subtracting birds: return specified amount to pool
    const poolReturn = Math.min(Math.abs(hensDelta), Math.max(0, Math.round(Number(adj.poolHensReturn || 0))));
    poolHensDelta = poolReturn;
  }

  if (roostersDelta > 0) {
    const poolIncrease = Math.max(0, Math.round(Number(adj.poolRoostersIncrease || 0)));
    poolRoostersDelta = poolIncrease - roostersDelta;
  } else if (roostersDelta < 0) {
    const poolReturn = Math.min(Math.abs(roostersDelta), Math.max(0, Math.round(Number(adj.poolRoostersReturn || 0))));
    poolRoostersDelta = poolReturn;
  }

  if (poolHensDelta === 0 && poolRoostersDelta === 0) return;

  const newAvailableHens = Math.max(0, (hatch.available_hens || 0) + poolHensDelta);
  const newAvailableRoosters = Math.max(0, (hatch.available_roosters || 0) + poolRoostersDelta);

  const { error: updateErr } = await supabaseAdmin
    .from('chicken_hatches')
    .update({
      available_hens: newAvailableHens,
      available_roosters: newAvailableRoosters,
    })
    .eq('id', hatchId);

  if (updateErr) {
    logError('adjust-birds-update-hatch', updateErr);
  }
}
