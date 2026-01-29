import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { isBeforeCutoff } from '@/lib/utils/date';
import { getPricingConfig } from '@/lib/config/pricing';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  try {
    // First, try to fetch the order
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_extras (
          *,
          extras_catalog (*)
        ),
        payments (*)
      `)
      .eq('id', params.id)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If user is logged in and order belongs to them, return it
    if (session && order.user_id === session.userId) {
      return NextResponse.json(order);
    }

    // Allow access to anonymous orders (user_id is null) if user just completed payment
    // This allows the confirmation page to load after Vipps redirect
    if (!order.user_id) {
      // Update the order to link it to the logged-in user if one exists
      if (session) {
        await supabaseAdmin
          .from('orders')
          .update({ user_id: session.userId })
          .eq('id', params.id);

        order.user_id = session.userId;
      }
      return NextResponse.json(order);
    }

    // Order belongs to someone else
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { data: configData } = await supabaseAdmin
      .from('app_config')
      .select('value')
      .eq('key', 'order_modification_cutoff')
      .maybeSingle();

    const cutoffConfig = configData?.value || { year: 2026, week: 46 };

    const mockDate = request.headers.get('x-mock-date');
    const currentDate = mockDate ? new Date(mockDate) : new Date();

    if (!isBeforeCutoff(cutoffConfig.year, cutoffConfig.week, currentDate)) {
      return NextResponse.json(
        { error: 'Order modification period has ended' },
        { status: 403 }
      );
    }

    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id, user_id')
      .eq('id', params.id)
      .eq('user_id', session.userId)
      .maybeSingle();

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const body = await request.json();
    const { deliveryType, freshDelivery, addOns, notes, box_size, ribbe_choice, delivery_type } = body;

    const updateData: Record<string, unknown> = {
      last_modified_at: new Date().toISOString(),
    };

    // Handle box size changes
    if (box_size !== undefined) {
      // Fetch dynamic pricing from config
      const pricing = await getPricingConfig();

      const basePrice = box_size === 8 ? pricing.box_8kg_price : pricing.box_12kg_price;
      let deliveryFee = 0;
      const delType = delivery_type || deliveryType;
      if (delType === 'pickup_e6') {
        deliveryFee = pricing.delivery_fee_pickup_e6;
      } else if (delType === 'delivery_trondheim') {
        deliveryFee = pricing.delivery_fee_trondheim;
      }
      const freshFee = (freshDelivery !== undefined ? freshDelivery : false) ? pricing.fresh_delivery_fee : 0;
      const depositPercentage = box_size === 8 ? pricing.box_8kg_deposit_percentage : pricing.box_12kg_deposit_percentage;
      const depositAmount = Math.floor(basePrice * (depositPercentage / 100));
      const totalAmount = basePrice + deliveryFee + freshFee;
      const remainderAmount = totalAmount - depositAmount;

      updateData.box_size = box_size;
      updateData.total_amount = totalAmount;
      updateData.deposit_amount = depositAmount;
      updateData.remainder_amount = remainderAmount;
    }

    if (ribbe_choice !== undefined) {
      updateData.ribbe_choice = ribbe_choice;
    }

    if (delivery_type !== undefined) {
      updateData.delivery_type = delivery_type;
    }

    if (deliveryType !== undefined) {
      updateData.delivery_type = deliveryType;
    }

    if (freshDelivery !== undefined) {
      updateData.fresh_delivery = freshDelivery;
    }

    if (addOns !== undefined) {
      updateData.add_ons_json = addOns;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { data: updatedOrder, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
