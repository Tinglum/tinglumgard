import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

interface ExtraProduct {
  slug: string;
  quantity: number;
}

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function normalizePhone(value?: string | null) {
  return (value || '').replace(/\D/g, '');
}

function isPhoneMatch(sessionPhone: string, orderPhone: string) {
  if (!sessionPhone || !orderPhone) return false;
  if (sessionPhone === orderPhone) return true;

  const sessionSuffix = sessionPhone.slice(-8);
  const orderSuffix = orderPhone.slice(-8);
  return sessionSuffix.length === 8 && orderSuffix.length === 8 && sessionSuffix === orderSuffix;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { extras, creditAmountNok } = body as { extras: ExtraProduct[]; creditAmountNok?: number };

    if (!extras || !Array.isArray(extras)) {
      return NextResponse.json({ error: 'Invalid extras data' }, { status: 400 });
    }

    const normalizedExtras: ExtraProduct[] = extras.map((extra) => ({
      slug: String(extra.slug || '').trim(),
      quantity: Number(extra.quantity),
    }));

    const hasInvalidExtras = normalizedExtras.some(
      (extra) => !extra.slug || !Number.isFinite(extra.quantity) || extra.quantity <= 0
    );

    if (hasInvalidExtras) {
      return NextResponse.json({ error: 'Invalid extra selection' }, { status: 400 });
    }

    const shouldUpdateCredit = Number.isFinite(creditAmountNok);
    const normalizedCredit = shouldUpdateCredit ? Math.max(0, Math.round(creditAmountNok as number)) : undefined;

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const ownsOrder = Boolean(order.user_id) && order.user_id === session.userId;
    const normalizedOrderEmail = normalizeEmail(order.customer_email);
    const normalizedSessionEmail = normalizeEmail(session.email as string | undefined);
    const emailMatches = Boolean(
      normalizedOrderEmail &&
      normalizedSessionEmail &&
      normalizedOrderEmail === normalizedSessionEmail
    );
    const phoneMatches = isPhoneMatch(
      normalizePhone(session.phoneNumber as string | undefined),
      normalizePhone(order.customer_phone)
    );
    const canAccessAnonymousOrder = !order.user_id && (emailMatches || phoneMatches);

    if (!ownsOrder && !canAccessAnonymousOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.user_id) {
      const { error: claimOrderError } = await supabaseAdmin
        .from('orders')
        .update({ user_id: session.userId })
        .eq('id', params.id)
        .is('user_id', null);

      if (claimOrderError) {
        console.error('Failed to claim anonymous order for session user:', claimOrderError);
      } else {
        order.user_id = session.userId;
      }
    }

    // Check if order is locked
    if (order.locked_at) {
      return NextResponse.json(
        { error: 'Order is locked and cannot be modified' },
        { status: 403 }
      );
    }

    const { data: existingOrderExtras, error: existingExtrasError } = await supabaseAdmin
      .from('order_extras')
      .select('total_price, price_nok, quantity')
      .eq('order_id', order.id);

    if (existingExtrasError) {
      console.error('Failed to fetch existing order extras:', existingExtrasError);
    }

    let extrasCatalog: any[] = [];
    const cutRangesById = new Map<string, { size_from_kg: number | null; size_to_kg: number | null }>();
    if (normalizedExtras.length > 0) {
      const { data: catalogData, error: catalogError } = await supabaseAdmin
        .from('extras_catalog')
        .select('*')
        .in('slug', normalizedExtras.map((e) => e.slug));

      if (catalogError || !catalogData) {
        return NextResponse.json({ error: 'Failed to fetch extras catalog' }, { status: 500 });
      }
      extrasCatalog = catalogData;

      const missingSlugs = normalizedExtras
        .map((extra) => extra.slug)
        .filter((slug) => !catalogData.some((row: any) => row.slug === slug));

      if (missingSlugs.length > 0) {
        return NextResponse.json(
          { error: `Unknown extra products: ${missingSlugs.join(', ')}` },
          { status: 400 }
        );
      }

      const cutIds = Array.from(new Set(catalogData.map((row: any) => row.cut_id).filter(Boolean)));
      if (cutIds.length > 0) {
        const { data: cutRows, error: cutRowsError } = await supabaseAdmin
          .from('cuts_catalog')
          .select('id,size_from_kg,size_to_kg')
          .in('id', cutIds);

        if (cutRowsError) {
          console.error('Failed to fetch cut ranges for extras:', cutRowsError);
        } else {
          for (const cut of cutRows || []) {
            cutRangesById.set(cut.id, {
              size_from_kg: cut.size_from_kg ?? null,
              size_to_kg: cut.size_to_kg ?? null,
            });
          }
        }
      }
    }

    // Calculate new totals
    let extrasTotal = 0;
    const extraProductsData: any[] = [];

    for (const extra of normalizedExtras) {
      const catalogItem = extrasCatalog.find((e) => e.slug === extra.slug);
      if (catalogItem) {
        const cutRange = catalogItem.cut_id ? cutRangesById.get(catalogItem.cut_id) : null;
        const itemTotal = Math.round(catalogItem.price_nok * extra.quantity);
        extrasTotal += itemTotal;
        extraProductsData.push({
          slug: extra.slug,
          name: catalogItem.name_no,
          quantity: extra.quantity,
          unit_type: catalogItem.pricing_type === 'per_kg' ? 'kg' : 'unit',
          price_per_unit: catalogItem.price_nok,
          size_from_kg: cutRange?.size_from_kg ?? null,
          size_to_kg: cutRange?.size_to_kg ?? null,
          total_price: itemTotal,
        });
      }
    }

    // Replace existing extras with the new selection (allows removal)
    const existingExtras = (order.extra_products as any[]) || [];
    const finalExtras = extraProductsData;

    const hasOrderExtras = Array.isArray(existingOrderExtras) && existingOrderExtras.length > 0;
    const existingExtrasTotal = hasOrderExtras
      ? existingOrderExtras.reduce((sum: number, e: any) => {
          const itemTotal = e.total_price ?? Math.round((e.price_nok || 0) * (e.quantity || 0));
          return sum + itemTotal;
        }, 0)
      : existingExtras.reduce((sum: number, e: any) => sum + (e.total_price || 0), 0);

    // Calculate new total and remainder (round to integers for database)
    const newTotalAmount = Math.round(order.total_amount - existingExtrasTotal + extrasTotal);
    const newRemainderAmount = Math.round(newTotalAmount - order.deposit_amount);

    const { error: deleteExtrasError } = await supabaseAdmin
      .from('order_extras')
      .delete()
      .eq('order_id', order.id);

    if (deleteExtrasError) {
      console.error('Failed to delete order extras:', deleteExtrasError);
      return NextResponse.json({ error: 'Failed to update order extras' }, { status: 500 });
    }

    if (extraProductsData.length > 0) {
      const extrasToInsert = extraProductsData
        .map((extra) => {
          const catalogItem = extrasCatalog.find((e) => e.slug === extra.slug);
          if (!catalogItem) return null;
          return {
            order_id: order.id,
            extra_id: catalogItem.id,
            price_nok: catalogItem.price_nok,
            unit_price: catalogItem.price_nok,
            unit_type: catalogItem.pricing_type === 'per_kg' ? 'kg' : 'unit',
            quantity: extra.quantity,
            total_price: extra.total_price,
          };
        })
        .filter(Boolean);

      if (extrasToInsert.length > 0) {
        const { error: insertExtrasError } = await supabaseAdmin
          .from('order_extras')
          .insert(extrasToInsert);

        if (insertExtrasError) {
          console.error('Failed to insert order extras:', insertExtrasError);
          return NextResponse.json({ error: 'Failed to update order extras' }, { status: 500 });
        }
      }
    }

    // Update order
    const updatePayload: Record<string, unknown> = {
      extra_products: finalExtras,
      total_amount: newTotalAmount,
      remainder_amount: newRemainderAmount,
      last_modified_at: new Date().toISOString(),
    };

    if (shouldUpdateCredit) {
      updatePayload.extra_credit_amount_nok = normalizedCredit;
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update order:', updateError);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      extrasAdded: extraProductsData.length,
      extrasTotal,
      creditAmountNok: shouldUpdateCredit ? normalizedCredit : undefined,
      newTotalAmount,
      newRemainderAmount,
    });
  } catch (error) {
    console.error('Error adding extras to order:', error);
    return NextResponse.json({ error: 'Failed to add extras' }, { status: 500 });
  }
}
