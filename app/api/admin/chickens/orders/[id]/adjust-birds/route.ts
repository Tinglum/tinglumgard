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
}

interface HatchOverride {
  hatchId: string;
  hensFreeNow?: number | null;
  roostersFreeNow?: number | null;
}

interface LineItem {
  key: string;
  type: 'main' | 'addition';
  additionId: string | null;
  hatchId: string;
  breedName: string;
  currentHens: number;
  currentRoosters: number;
  pricePerHen: number;
  pricePerRooster: number;
  systemFreeHens: number;
  systemFreeRoosters: number;
}

class ValidationError extends Error {}

function toInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function toNonNegativeInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function hasCompletedDeposit(payments: any[] = []): boolean {
  return payments.some((payment) => payment?.payment_type === 'deposit' && payment?.status === 'completed');
}

function getCompletedRemainderPaidNok(payments: any[] = []): number {
  return payments.reduce((sum, payment) => {
    if (payment?.payment_type !== 'remainder' || payment?.status !== 'completed') return sum;
    return sum + toInt(payment?.amount_nok);
  }, 0);
}

function getLineItems(order: any): LineItem[] {
  const items: LineItem[] = [
    {
      key: 'main',
      type: 'main',
      additionId: null,
      hatchId: normalizeText(order?.hatch_id),
      breedName: normalizeText(order?.chicken_breeds?.name) || 'Unknown',
      currentHens: Math.max(0, toInt(order?.quantity_hens)),
      currentRoosters: Math.max(0, toInt(order?.quantity_roosters)),
      pricePerHen: Math.max(0, Number(order?.price_per_hen_nok || 0)),
      pricePerRooster: Math.max(0, Number(order?.price_per_rooster_nok || 0)),
      systemFreeHens: Math.max(0, toInt(order?.chicken_hatches?.available_hens)),
      systemFreeRoosters: Math.max(0, toInt(order?.chicken_hatches?.available_roosters)),
    },
  ];

  for (const addition of order?.chicken_order_additions || []) {
    items.push({
      key: normalizeText(addition?.id),
      type: 'addition',
      additionId: normalizeText(addition?.id) || null,
      hatchId: normalizeText(addition?.hatch_id),
      breedName: normalizeText(addition?.chicken_breeds?.name) || 'Unknown',
      currentHens: Math.max(0, toInt(addition?.quantity_hens)),
      currentRoosters: Math.max(0, toInt(addition?.quantity_roosters)),
      pricePerHen: Math.max(0, Number(addition?.price_per_hen_nok || 0)),
      pricePerRooster: Math.max(
        0,
        Number(addition?.price_per_rooster_nok || addition?.chicken_breeds?.rooster_price_nok || 0)
      ),
      systemFreeHens: Math.max(0, toInt(addition?.chicken_hatches?.available_hens)),
      systemFreeRoosters: Math.max(0, toInt(addition?.chicken_hatches?.available_roosters)),
    });
  }

  return items;
}

function getNextStatus(order: any, remainderAmountNok: number, remainderPaidNok: number): string {
  const currentStatus = normalizeText(order?.status);
  if (currentStatus === 'cancelled' || currentStatus === 'picked_up') return currentStatus;

  const outstandingRemainder = Math.max(0, remainderAmountNok - remainderPaidNok);
  const preserveReadyForPickup = currentStatus === 'ready_for_pickup';

  if (outstandingRemainder > 0) {
    if (preserveReadyForPickup) return 'ready_for_pickup';
    return hasCompletedDeposit(order?.chicken_payments || []) ? 'deposit_paid' : currentStatus || 'pending';
  }

  if (preserveReadyForPickup) return 'ready_for_pickup';
  return hasCompletedDeposit(order?.chicken_payments || []) ? 'fully_paid' : currentStatus || 'pending';
}

async function loadOrder(orderId: string) {
  return supabaseAdmin
    .from('chicken_orders')
    .select(
      '*, chicken_breeds(*), chicken_hatches(*), chicken_payments(*), chicken_order_additions(*, chicken_breeds(*), chicken_hatches(*))'
    )
    .eq('id', orderId)
    .maybeSingle();
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
    const rawAdjustments: Adjustment[] = Array.isArray(body.adjustments) ? body.adjustments : [];
    const rawOverrides: HatchOverride[] = Array.isArray(body.hatchOverrides) ? body.hatchOverrides : [];
    const adminNote = typeof body.adminNote === 'string' ? body.adminNote.trim() : '';

    if (rawAdjustments.length === 0) {
      return NextResponse.json({ error: 'No adjustments provided' }, { status: 400 });
    }

    const { data: order, error: orderError } = await loadOrder(params.id);
    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (['cancelled', 'picked_up'].includes(String(order.status || ''))) {
      return NextResponse.json({ error: 'Cannot modify a cancelled or completed order' }, { status: 400 });
    }

    const lineItems = getLineItems(order);
    const lineByKey = new Map(lineItems.map((line) => [line.key, line]));
    const changes: string[] = [];

    const overridesByHatchId = new Map<
      string,
      { hensFreeNow: number | null; roostersFreeNow: number | null }
    >();

    for (const override of rawOverrides) {
      const hatchId = normalizeText(override?.hatchId);
      if (!hatchId) {
        return NextResponse.json({ error: 'Each hatch override must include a hatchId' }, { status: 400 });
      }

      const hensFreeNow =
        override?.hensFreeNow === null || override?.hensFreeNow === undefined
          ? null
          : toNonNegativeInt(override.hensFreeNow);
      const roostersFreeNow =
        override?.roostersFreeNow === null || override?.roostersFreeNow === undefined
          ? null
          : toNonNegativeInt(override.roostersFreeNow);

      if (
        (override?.hensFreeNow !== null && override?.hensFreeNow !== undefined && hensFreeNow === null) ||
        (override?.roostersFreeNow !== null && override?.roostersFreeNow !== undefined && roostersFreeNow === null)
      ) {
        return NextResponse.json({ error: 'Override values must be whole numbers 0 or greater' }, { status: 400 });
      }

      overridesByHatchId.set(hatchId, { hensFreeNow, roostersFreeNow });
    }

    const normalizedAdjustments = rawAdjustments
      .map((raw) => {
        const type = raw?.type === 'addition' ? 'addition' : 'main';
        const key = type === 'main' ? 'main' : normalizeText(raw?.additionId);
        const line = lineByKey.get(key);

        if (!line) {
          throw new ValidationError(type === 'main' ? 'Main order line not found' : `Addition ${key} not found`);
        }

        const hensDelta = toInt(raw?.hensDelta);
        const roostersDelta = toInt(raw?.roostersDelta);
        const poolHensReturn = hensDelta < 0 ? Math.max(0, toInt(raw?.poolHensReturn)) : 0;
        const poolRoostersReturn = roostersDelta < 0 ? Math.max(0, toInt(raw?.poolRoostersReturn)) : 0;

        if (poolHensReturn > Math.abs(Math.min(0, hensDelta))) {
          throw new ValidationError(`Too many hens returned to inventory for ${line.breedName}`);
        }
        if (poolRoostersReturn > Math.abs(Math.min(0, roostersDelta))) {
          throw new ValidationError(`Too many roosters returned to inventory for ${line.breedName}`);
        }

        const nextHens = line.currentHens + hensDelta;
        const nextRoosters = line.currentRoosters + roostersDelta;

        if (nextHens < 0 || nextRoosters < 0) {
          throw new ValidationError(`Adjusted quantities for ${line.breedName} cannot go below 0`);
        }

        return {
          ...line,
          hensDelta,
          roostersDelta,
          poolHensReturn,
          poolRoostersReturn,
          nextHens,
          nextRoosters,
        };
      })
      .filter((line) => line.hensDelta !== 0 || line.roostersDelta !== 0);

    if (normalizedAdjustments.length === 0) {
      return NextResponse.json({ error: 'No adjustments provided' }, { status: 400 });
    }

    const hatchStateById = new Map<
      string,
      {
        hatchId: string;
        breedName: string;
        systemFreeHens: number;
        systemFreeRoosters: number;
        addedHens: number;
        addedRoosters: number;
        returnedHens: number;
        returnedRoosters: number;
      }
    >();

    for (const line of lineItems) {
      if (!line.hatchId) continue;
      if (!hatchStateById.has(line.hatchId)) {
        hatchStateById.set(line.hatchId, {
          hatchId: line.hatchId,
          breedName: line.breedName,
          systemFreeHens: line.systemFreeHens,
          systemFreeRoosters: line.systemFreeRoosters,
          addedHens: 0,
          addedRoosters: 0,
          returnedHens: 0,
          returnedRoosters: 0,
        });
      }
    }

    for (const adjustment of normalizedAdjustments) {
      if (!adjustment.hatchId) {
        return NextResponse.json(
          { error: `Order line for ${adjustment.breedName} is missing a hatch reference` },
          { status: 400 }
        );
      }

      const hatchState = hatchStateById.get(adjustment.hatchId);
      if (!hatchState) {
        return NextResponse.json(
          { error: `Could not find hatch stock for ${adjustment.breedName}` },
          { status: 400 }
        );
      }

      hatchState.addedHens += Math.max(0, adjustment.hensDelta);
      hatchState.addedRoosters += Math.max(0, adjustment.roostersDelta);
      hatchState.returnedHens += adjustment.poolHensReturn;
      hatchState.returnedRoosters += adjustment.poolRoostersReturn;
    }

    const hatchUpdates = Array.from(hatchStateById.values()).map((state) => {
      const override = overridesByHatchId.get(state.hatchId);
      const freeHensNow = override?.hensFreeNow ?? state.systemFreeHens;
      const freeRoostersNow = override?.roostersFreeNow ?? state.systemFreeRoosters;
      const projectedFreeHens = freeHensNow + state.returnedHens - state.addedHens;
      const projectedFreeRoosters = freeRoostersNow + state.returnedRoosters - state.addedRoosters;

      if (projectedFreeHens < 0) {
        throw new ValidationError(
          `Not enough free hens for ${state.breedName}: need ${state.addedHens}, have ${freeHensNow + state.returnedHens}`
        );
      }
      if (projectedFreeRoosters < 0) {
        throw new ValidationError(
          `Not enough free roosters for ${state.breedName}: need ${state.addedRoosters}, have ${freeRoostersNow + state.returnedRoosters}`
        );
      }

      return {
        hatchId: state.hatchId,
        breedName: state.breedName,
        nextAvailableHens: projectedFreeHens,
        nextAvailableRoosters: projectedFreeRoosters,
        overrideApplied: Boolean(
          override && (override.hensFreeNow !== null || override.roostersFreeNow !== null)
        ),
        freeHensNow,
        freeRoostersNow,
      };
    });

    for (const adjustment of normalizedAdjustments) {
      if (adjustment.type === 'main') {
        const { error: updateErr } = await supabaseAdmin
          .from('chicken_orders')
          .update({
            quantity_hens: adjustment.nextHens,
            quantity_roosters: adjustment.nextRoosters,
          })
          .eq('id', order.id);

        if (updateErr) {
          logError('adjust-birds-update-main', updateErr);
          return NextResponse.json({ error: 'Failed to update order quantities' }, { status: 500 });
        }

        changes.push(
          `Main order (${adjustment.breedName}): hens ${adjustment.currentHens}->${adjustment.nextHens}, roosters ${adjustment.currentRoosters}->${adjustment.nextRoosters}`
        );
        continue;
      }

      const newSubtotal =
        adjustment.nextHens * adjustment.pricePerHen + adjustment.nextRoosters * adjustment.pricePerRooster;

      if (adjustment.nextHens === 0 && adjustment.nextRoosters === 0) {
        const { error: deleteErr } = await supabaseAdmin
          .from('chicken_order_additions')
          .delete()
          .eq('id', adjustment.additionId);

        if (deleteErr) {
          logError('adjust-birds-delete-addition', deleteErr);
          return NextResponse.json({ error: 'Failed to delete empty addition' }, { status: 500 });
        }
      } else {
        const { error: updateErr } = await supabaseAdmin
          .from('chicken_order_additions')
          .update({
            quantity_hens: adjustment.nextHens,
            quantity_roosters: adjustment.nextRoosters,
            subtotal_nok: newSubtotal,
          })
          .eq('id', adjustment.additionId);

        if (updateErr) {
          logError('adjust-birds-update-addition', updateErr);
          return NextResponse.json({ error: 'Failed to update addition' }, { status: 500 });
        }
      }

      changes.push(
        `Addition (${adjustment.breedName}): hens ${adjustment.currentHens}->${adjustment.nextHens}, roosters ${adjustment.currentRoosters}->${adjustment.nextRoosters}`
      );
    }

    for (const hatch of hatchUpdates) {
      const { error: hatchUpdateErr } = await supabaseAdmin
        .from('chicken_hatches')
        .update({
          available_hens: hatch.nextAvailableHens,
          available_roosters: hatch.nextAvailableRoosters,
        })
        .eq('id', hatch.hatchId);

      if (hatchUpdateErr) {
        logError('adjust-birds-update-hatch', hatchUpdateErr, {
          hatchId: hatch.hatchId,
        });
        return NextResponse.json({ error: 'Failed to update hatch inventory' }, { status: 500 });
      }

      if (hatch.overrideApplied) {
        changes.push(
          `Inventory override (${hatch.breedName}): hens set to ${hatch.freeHensNow}, roosters set to ${hatch.freeRoostersNow}${adminNote ? '' : ' — no reason provided'}`
        );
      }
    }

    const { data: updatedOrder, error: refetchErr } = await loadOrder(order.id);
    if (refetchErr || !updatedOrder) {
      return NextResponse.json({ error: 'Failed to reload order' }, { status: 500 });
    }

    const baseSubtotal =
      Math.max(0, toInt(updatedOrder.quantity_hens)) * Math.max(0, Number(updatedOrder.price_per_hen_nok || 0)) +
      Math.max(0, toInt(updatedOrder.quantity_roosters)) * Math.max(0, Number(updatedOrder.price_per_rooster_nok || 0));

    const additionsSubtotal = (updatedOrder.chicken_order_additions || []).reduce(
      (sum: number, row: any) => sum + Math.max(0, Number(row?.subtotal_nok || 0)),
      0
    );

    const deliveryFee = Math.max(0, Number(updatedOrder.delivery_fee_nok || 0));
    const totalAmountNok = Math.max(0, baseSubtotal + additionsSubtotal + deliveryFee);
    // Preserve actual deposit paid — do NOT cap to new total.
    // When deposit > total, the customer overpaid and is owed a refund.
    const depositAmountNok = Math.max(0, Math.round(Number(updatedOrder.deposit_amount_nok || 0)));
    const remainderAmountNok = Math.max(0, Math.round(totalAmountNok - depositAmountNok));
    const remainderPaidNok = getCompletedRemainderPaidNok(updatedOrder.chicken_payments || []);
    const nextStatus = getNextStatus(updatedOrder, remainderAmountNok, remainderPaidNok);

    // Flag overpayment if deposit exceeds new total
    const overpaymentNok = Math.max(0, depositAmountNok - totalAmountNok);

    const noteLines = changes.slice();
    if (overpaymentNok > 0) {
      noteLines.push(`⚠️ Overpayment: customer paid ${depositAmountNok} NOK, new total is ${totalAmountNok} NOK → refund ${overpaymentNok} NOK`);
    }
    if (adminNote) noteLines.push(`Admin note: ${adminNote}`);
    const fullNote = `[${new Date().toISOString().slice(0, 16)}] Bird adjustment: ${noteLines.join('; ')}`;
    const existingNotes = updatedOrder.admin_notes || '';
    const newNotes = [existingNotes, fullNote].filter(Boolean).join('\n');

    // Only disable remainder payment if the remainder drops to zero after adjustment.
    // Otherwise, preserve the existing flag so a previously-enabled payment link stays active.
    const remainderNowZero = remainderAmountNok <= 0;
    const preservedRemainderEnabled = remainderNowZero
      ? false
      : Boolean(order.remainder_payment_enabled);

    const { error: finalErr } = await supabaseAdmin
      .from('chicken_orders')
      .update({
        subtotal_nok: Math.max(0, baseSubtotal),
        total_amount_nok: Math.max(0, totalAmountNok),
        deposit_amount_nok: depositAmountNok,
        remainder_amount_nok: remainderAmountNok,
        remainder_payment_enabled: preservedRemainderEnabled,
        status: nextStatus,
        admin_notes: newNotes,
      })
      .eq('id', order.id);

    if (finalErr) {
      logError('adjust-birds-final-update', finalErr);
      return NextResponse.json({ error: 'Failed to recalculate totals' }, { status: 500 });
    }

    const { data: finalOrder, error: finalOrderError } = await loadOrder(order.id);
    if (finalOrderError || !finalOrder) {
      return NextResponse.json({ error: 'Updated order could not be reloaded' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      changes,
      order: finalOrder,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    logError('adjust-birds-unexpected', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
