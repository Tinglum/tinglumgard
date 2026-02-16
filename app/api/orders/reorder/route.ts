import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';
import { getPricingConfig } from '@/lib/config/pricing';

function isMissingColumnError(error: any, columnName: string) {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const hint = String(error?.hint || '').toLowerCase();
  const needle = columnName.toLowerCase();
  return (
    message.includes(needle) ||
    details.includes(needle) ||
    hint.includes(needle)
  );
}

async function insertOrderExtrasWithFallback(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return null;

  let payload = rows;
  const removableColumns = ['unit_price', 'unit_type', 'quantity', 'total_price', 'price_nok'];
  const removed = new Set<string>();

  while (true) {
    const { error } = await supabaseAdmin.from('order_extras').insert(payload);
    if (!error) return null;

    let removedAny = false;
    for (const column of removableColumns) {
      if (removed.has(column)) continue;
      if (!isMissingColumnError(error, column)) continue;

      payload = payload.map((row) => {
        const next = { ...row };
        delete next[column];
        return next;
      });
      removed.add(column);
      removedAny = true;
    }

    if (!removedAny) return error;
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orderId } = await request.json();

    // Fetch the original order
    // Try the full select, fallback if DB schema lacks some columns
    let { data: originalOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_extras (
          *,
          extras_catalog (*)
        )
      `)
      .eq('id', orderId)
      .single();

    if (fetchError || !originalOrder) {
      const fallback = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          order_extras (
            id,
            extra_id,
            quantity,
            price_nok,
            unit_price,
            unit_type,
            extras_catalog (*)
          )
        `)
        .eq('id', orderId)
        .single();

      if (fallback.error || !fallback.data) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      originalOrder = fallback.data as any;
    }

    if (originalOrder.user_id !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Generate new order number
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderNumber = `TL${randomPart}`;

    // Create new order with same details
    const { data: newOrder, error: createError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: session.userId,
        customer_name: originalOrder.customer_name,
        customer_email: originalOrder.customer_email,
        customer_phone: originalOrder.customer_phone,
        box_size: originalOrder.is_mangalitsa ? null : originalOrder.box_size,
        mangalitsa_preset_id: originalOrder.is_mangalitsa ? originalOrder.mangalitsa_preset_id : null,
        is_mangalitsa: !!originalOrder.is_mangalitsa,
        ribbe_choice: originalOrder.ribbe_choice,
        delivery_type: originalOrder.delivery_type,
        fresh_delivery: originalOrder.fresh_delivery,
        notes: '', // Clear notes for new order
        total_amount: originalOrder.total_amount,
        deposit_amount: originalOrder.deposit_amount,
        remainder_amount: originalOrder.remainder_amount,
        status: 'draft',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) throw createError;

    // Copy extras if any
    if (originalOrder.order_extras && originalOrder.order_extras.length > 0) {
      const extrasToInsertBase = originalOrder.order_extras.map((extra: any) => ({
        order_id: newOrder.id,
        extra_id: extra.extra_id,
        price_nok: extra.price_nok ?? extra.unit_price ?? 0,
        unit_type: extra.unit_type ?? 'unit',
        quantity: extra.quantity,
        total_price: extra.total_price,
      }));

      const extrasToInsertWithUnitPrice = extrasToInsertBase.map((extra: any) => ({
        ...extra,
        unit_price: extra.price_nok,
      }));

      const insertError = await insertOrderExtrasWithFallback(
        extrasToInsertWithUnitPrice as Array<Record<string, unknown>>
      );
      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({
      success: true,
      orderNumber: newOrder.order_number,
      orderId: newOrder.id,
    });
  } catch (error) {
    console.error('Error reordering:', error);
    return NextResponse.json(
      { error: 'Failed to create reorder' },
      { status: 500 }
    );
  }
}
