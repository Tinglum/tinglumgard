import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';
import { getPricingConfig } from '@/lib/config/pricing';

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
        box_size: originalOrder.box_size,
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
      const extrasToInsert = originalOrder.order_extras.map((extra: any) => ({
        order_id: newOrder.id,
        extra_id: extra.extra_id,
        quantity: extra.quantity,
        unit_price: extra.unit_price,
        total_price: extra.total_price,
      }));

      await supabaseAdmin.from('order_extras').insert(extrasToInsert);
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
