import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const orderId = params.id;

    const { data: order, error: fetchError } = await supabaseAdmin
      .from('chicken_orders')
      .select('id, order_number, delivery_method')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      shippingName,
      shippingEmail,
      shippingPhone,
      shippingAddress,
      shippingPostalCode,
      shippingCity,
      shippingCountry,
    } = body;

    // All fields required for delivery orders
    if (order.delivery_method === 'delivery_namsos_trondheim') {
      const required: Record<string, unknown> = {
        shippingName,
        shippingEmail,
        shippingPhone,
        shippingAddress,
        shippingPostalCode,
        shippingCity,
        shippingCountry,
      };

      const missing = Object.entries(required)
        .filter(([, v]) => !v || String(v).trim() === '')
        .map(([k]) => k);

      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Missing required shipping fields: ${missing.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, string | null> = {};

    if (shippingName !== undefined) updates.shipping_name = String(shippingName || '').trim() || null;
    if (shippingEmail !== undefined) updates.shipping_email = String(shippingEmail || '').trim() || null;
    if (shippingPhone !== undefined) updates.shipping_phone = String(shippingPhone || '').trim() || null;
    if (shippingAddress !== undefined) updates.shipping_address = String(shippingAddress || '').trim() || null;
    if (shippingPostalCode !== undefined) updates.shipping_postal_code = String(shippingPostalCode || '').trim() || null;
    if (shippingCity !== undefined) updates.shipping_city = String(shippingCity || '').trim() || null;
    if (shippingCountry !== undefined) updates.shipping_country = String(shippingCountry || '').trim() || null;

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('chicken_orders')
      .update(updates)
      .eq('id', orderId)
      .select('id, order_number, delivery_method, shipping_name, shipping_email, shipping_phone, shipping_address, shipping_postal_code, shipping_city, shipping_country')
      .single();

    if (updateError) {
      logError('admin-chicken-shipping-update', updateError);
      return NextResponse.json({ error: 'Failed to update shipping details' }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    logError('admin-chicken-shipping-main', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
