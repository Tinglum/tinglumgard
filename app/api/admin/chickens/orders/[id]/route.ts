import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';
import { getMondayOfWeek } from '@/lib/chickens/pricing';
import { reconcileChickenPickupDependentFlowInstances } from '@/lib/email/lifecycle';

const ALLOWED_STATUSES = new Set([
  'pending',
  'deposit_paid',
  'fully_paid',
  'ready_for_pickup',
  'picked_up',
  'cancelled',
]);

const ALLOWED_DELIVERY_METHODS = new Set(['farm_pickup', 'delivery_namsos_trondheim']);

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFinite(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeChickenOrderFinancials<T extends Record<string, any>>(order: T): T {
  const additionsSubtotal = ((order.chicken_order_additions as Array<any> | undefined) || []).reduce(
    (sum, row) => sum + toFinite(row?.subtotal_nok),
    0
  );
  const baseByPricing =
    toFinite(order.quantity_hens) * toFinite(order.price_per_hen_nok) +
    toFinite(order.quantity_roosters) * toFinite(order.price_per_rooster_nok);
  const deliveryFee = toFinite(order.delivery_fee_nok);
  const totalAmount = toFinite(order.total_amount_nok);
  const expectedBaseFromTotal = Math.max(0, totalAmount - deliveryFee - additionsSubtotal);
  const shouldReconcile =
    totalAmount > 0 && Math.abs(baseByPricing + additionsSubtotal + deliveryFee - totalAmount) > 1;

  return {
    ...order,
    subtotal_nok: shouldReconcile ? expectedBaseFromTotal : baseByPricing,
  };
}

function toNonNegativeNumber(value: unknown): number | null {
  const parsed = toNumber(value);
  if (parsed === null || parsed < 0) return null;
  return parsed;
}

function toNonNegativeInt(value: unknown): number | null {
  const parsed = toNonNegativeNumber(value);
  if (parsed === null) return null;
  return Math.round(parsed);
}

async function fetchOrderWithRelations(orderId: string) {
  // Try by UUID first, then fall back to order_number for deep-link support
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
  const column = isUuid ? 'id' : 'order_number';

  const { data, error } = await supabaseAdmin
    .from('chicken_orders')
    .select(
      '*, chicken_breeds(*), chicken_hatches(*), chicken_payments(*), chicken_order_additions(*, chicken_breeds(*), chicken_hatches(*))'
    )
    .eq(column, orderId)
    .maybeSingle();

  return { data, error };
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data, error } = await fetchOrderWithRelations(params.id);
    if (error || !data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(normalizeChickenOrderFinancials(data));
  } catch (error) {
    logError('admin-chicken-order-get-unexpected', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { data: existingOrder, error: fetchError } = await fetchOrderWithRelations(params.id);
    if (fetchError || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    const textFields: Array<[string, string]> = [
      ['customerName', 'customer_name'],
      ['customerEmail', 'customer_email'],
      ['customerPhone', 'customer_phone'],
      ['shippingAddress', 'shipping_address'],
      ['shippingPostalCode', 'shipping_postal_code'],
      ['shippingCity', 'shipping_city'],
      ['shippingCountry', 'shipping_country'],
      ['notes', 'notes'],
      ['adminNotes', 'admin_notes'],
      ['remainderDueDate', 'remainder_due_date'],
    ];

    for (const [inputKey, dbKey] of textFields) {
      if (body[inputKey] !== undefined) {
        updates[dbKey] = body[inputKey];
      }
    }

    if (body.deliveryMethod !== undefined) {
      const deliveryMethod = String(body.deliveryMethod || '').trim();
      if (!ALLOWED_DELIVERY_METHODS.has(deliveryMethod)) {
        return NextResponse.json({ error: 'Invalid delivery method' }, { status: 400 });
      }
      updates.delivery_method = deliveryMethod;
    }

    if (body.status !== undefined) {
      const status = String(body.status || '').trim();
      if (!ALLOWED_STATUSES.has(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = status;
      if (status === 'picked_up') {
        updates.remainder_payment_enabled = false;
      }
    }

    const intFields: Array<[string, string]> = [
      ['pickupYear', 'pickup_year'],
      ['pickupWeek', 'pickup_week'],
      ['quantityHens', 'quantity_hens'],
      ['quantityRoosters', 'quantity_roosters'],
      ['ageWeeksAtPickup', 'age_weeks_at_pickup'],
    ];

    for (const [inputKey, dbKey] of intFields) {
      if (body[inputKey] !== undefined) {
        const value = toNonNegativeInt(body[inputKey]);
        if (value === null) {
          return NextResponse.json({ error: `Invalid value for ${inputKey}` }, { status: 400 });
        }
        updates[dbKey] = value;
      }
    }

    const decimalFields: Array<[string, string]> = [
      ['pricePerHenNok', 'price_per_hen_nok'],
      ['pricePerRoosterNok', 'price_per_rooster_nok'],
      ['subtotalNok', 'subtotal_nok'],
      ['deliveryFeeNok', 'delivery_fee_nok'],
      ['totalAmountNok', 'total_amount_nok'],
      ['depositAmountNok', 'deposit_amount_nok'],
      ['remainderAmountNok', 'remainder_amount_nok'],
    ];

    for (const [inputKey, dbKey] of decimalFields) {
      if (body[inputKey] !== undefined) {
        const value = toNonNegativeNumber(body[inputKey]);
        if (value === null) {
          return NextResponse.json({ error: `Invalid value for ${inputKey}` }, { status: 400 });
        }
        updates[dbKey] = value;
      }
    }

    const effectivePickupYear = Number(
      updates.pickup_year !== undefined ? updates.pickup_year : existingOrder.pickup_year
    );
    const effectivePickupWeek = Number(
      updates.pickup_week !== undefined ? updates.pickup_week : existingOrder.pickup_week
    );
    const pickupChanged = updates.pickup_year !== undefined || updates.pickup_week !== undefined;
    if (pickupChanged) {
      if (!Number.isFinite(effectivePickupYear) || !Number.isFinite(effectivePickupWeek)) {
        return NextResponse.json({ error: 'Invalid pickup year/week' }, { status: 400 });
      }
      const monday = getMondayOfWeek(effectivePickupYear, effectivePickupWeek).toISOString().slice(0, 10);
      updates.pickup_monday = monday;
    }

    const quantityOrPriceChanged =
      updates.quantity_hens !== undefined ||
      updates.quantity_roosters !== undefined ||
      updates.price_per_hen_nok !== undefined ||
      updates.price_per_rooster_nok !== undefined ||
      updates.delivery_fee_nok !== undefined ||
      updates.total_amount_nok !== undefined ||
      updates.deposit_amount_nok !== undefined ||
      updates.remainder_amount_nok !== undefined ||
      updates.subtotal_nok !== undefined;

    if (quantityOrPriceChanged) {
      const quantityHens = Number(
        updates.quantity_hens !== undefined ? updates.quantity_hens : existingOrder.quantity_hens
      );
      const quantityRoosters = Number(
        updates.quantity_roosters !== undefined ? updates.quantity_roosters : existingOrder.quantity_roosters
      );
      const pricePerHen = Number(
        updates.price_per_hen_nok !== undefined ? updates.price_per_hen_nok : existingOrder.price_per_hen_nok
      );
      const pricePerRooster = Number(
        updates.price_per_rooster_nok !== undefined
          ? updates.price_per_rooster_nok
          : existingOrder.price_per_rooster_nok
      );
      const deliveryFee = Number(
        updates.delivery_fee_nok !== undefined ? updates.delivery_fee_nok : existingOrder.delivery_fee_nok
      );

      const baseSubtotal = quantityHens * pricePerHen + quantityRoosters * pricePerRooster;
      const additionsSubtotal = (existingOrder.chicken_order_additions || []).reduce(
        (sum: number, row: { subtotal_nok?: number | null }) => sum + Number(row.subtotal_nok || 0),
        0
      );

      const subtotalNok = Number(
        updates.subtotal_nok !== undefined ? updates.subtotal_nok : baseSubtotal
      );
      const totalAmountNok = Number(
        updates.total_amount_nok !== undefined ? updates.total_amount_nok : subtotalNok + additionsSubtotal + deliveryFee
      );
      const depositAmountNok = Number(
        updates.deposit_amount_nok !== undefined
          ? updates.deposit_amount_nok
          : Math.min(Number(existingOrder.deposit_amount_nok || 0), totalAmountNok)
      );
      const remainderAmountNok = Number(
        updates.remainder_amount_nok !== undefined
          ? updates.remainder_amount_nok
          : Math.max(0, totalAmountNok - depositAmountNok)
      );

      updates.subtotal_nok = Math.max(0, subtotalNok);
      updates.total_amount_nok = Math.max(0, totalAmountNok);
      updates.deposit_amount_nok = Math.max(0, Math.min(depositAmountNok, totalAmountNok));
      updates.remainder_amount_nok = Math.max(0, remainderAmountNok);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(normalizeChickenOrderFinancials(existingOrder));
    }

    const { error: updateError } = await supabaseAdmin
      .from('chicken_orders')
      .update(updates)
      .eq('id', params.id);

    if (updateError) {
      logError('admin-chicken-order-update', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { data: updatedOrder, error: refetchError } = await fetchOrderWithRelations(params.id);
    if (refetchError || !updatedOrder) {
      return NextResponse.json({ error: 'Order updated but could not be reloaded' }, { status: 500 });
    }

    if (String(updates.status || '') === 'picked_up') {
      try {
        await reconcileChickenPickupDependentFlowInstances(String(updatedOrder.id), {
          reason: 'order_picked_up',
          pickedUpAt: new Date().toISOString(),
        });
      } catch (error) {
        logError('admin-chicken-order-picked-up-followup', error, {
          orderId: String(updatedOrder.id),
        });
      }
    }

    return NextResponse.json(normalizeChickenOrderFinancials(updatedOrder));
  } catch (error) {
    logError('admin-chicken-order-update-unexpected', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
