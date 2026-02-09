import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

interface ExtraProduct {
  slug: string;
  quantity: number;
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

    const shouldUpdateCredit = Number.isFinite(creditAmountNok);
    const normalizedCredit = shouldUpdateCredit ? Math.max(0, Math.round(creditAmountNok as number)) : undefined;

    // Verify order belongs to user (or is an anonymous order matching phone/email)
    const orConditions = [`user_id.eq.${session.userId}`];
    if (session.phoneNumber) {
      orConditions.push(`and(user_id.is.null,customer_phone.eq.${session.phoneNumber})`);
    }
    if (session.email) {
      orConditions.push(`and(user_id.is.null,customer_email.eq.${session.email})`);
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .or(orConditions.join(','))
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
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
    if (extras.length > 0) {
      const { data: catalogData, error: catalogError } = await supabaseAdmin
        .from('extras_catalog')
        .select('*')
        .in('slug', extras.map((e) => e.slug));

      if (catalogError || !catalogData) {
        return NextResponse.json({ error: 'Failed to fetch extras catalog' }, { status: 500 });
      }
      extrasCatalog = catalogData;
    }

    // Calculate new totals
    let extrasTotal = 0;
    const extraProductsData: any[] = [];

    for (const extra of extras) {
      const catalogItem = extrasCatalog.find((e) => e.slug === extra.slug);
      if (catalogItem) {
        const itemTotal = Math.round(catalogItem.price_nok * extra.quantity);
        extrasTotal += itemTotal;
        extraProductsData.push({
          slug: extra.slug,
          name: catalogItem.name_no,
          quantity: extra.quantity,
          unit_type: catalogItem.pricing_type === 'per_kg' ? 'kg' : 'unit',
          price_per_unit: catalogItem.price_nok,
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
