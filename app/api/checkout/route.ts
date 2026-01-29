import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/email/client';
import { getOrderConfirmationTemplate } from '@/lib/email/templates';

interface ExtraProduct {
  slug: string;
  quantity: number;
}

interface CheckoutRequest {
  boxSize: 8 | 12;
  ribbeChoice: 'tynnribbe' | 'familieribbe' | 'porchetta' | 'butchers_choice';
  extraProducts?: ExtraProduct[];
  deliveryType: 'pickup_farm' | 'pickup_e6' | 'delivery_trondheim';
  freshDelivery: boolean;
  notes?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export async function POST(request: NextRequest) {
  // Allow anonymous orders - no authentication required

  try {
    const body: CheckoutRequest = await request.json();
    const { boxSize, ribbeChoice, extraProducts, deliveryType, freshDelivery, notes, customerName, customerEmail, customerPhone } = body;

    // Validation
    if (boxSize !== 8 && boxSize !== 12) {
      return NextResponse.json({ error: 'Invalid box size' }, { status: 400 });
    }

    // Customer details are optional - they will be populated from Vipps after payment

    // Check inventory
    const inventory = await supabaseAdmin
      .from('inventory')
      .select('*')
      .eq('active', true)
      .maybeSingle();

    if (!inventory.data || inventory.data.kg_remaining < boxSize) {
      return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
    }

    // Calculate pricing
    const basePrice = boxSize === 8 ? 3500 : 4800;
    let deliveryFee = 0;
    if (deliveryType === 'pickup_e6') {
      deliveryFee = 300;
    } else if (deliveryType === 'delivery_trondheim') {
      deliveryFee = 200;
    }
    const freshFee = freshDelivery ? 500 : 0;

    // Calculate extra products total from database
    let extrasTotal = 0;
    const extraProductsData: any[] = [];

    if (extraProducts && extraProducts.length > 0) {
      // Fetch extras from database
      const { data: extras, error: extrasError } = await supabaseAdmin
        .from('extras_catalog')
        .select('*')
        .in('slug', extraProducts.map(e => e.slug));

      if (!extrasError && extras) {
        for (const extra of extraProducts) {
          const catalogItem = extras.find(e => e.slug === extra.slug);
          if (catalogItem) {
            const itemTotal = catalogItem.price_nok * extra.quantity;
            extrasTotal += itemTotal;
            extraProductsData.push({
              slug: extra.slug,
              name: catalogItem.name_no,
              quantity: extra.quantity,
              unit_type: catalogItem.pricing_type === 'per_kg' ? 'kg' : 'unit',
              price_per_unit: catalogItem.price_nok,
              total_price: itemTotal
            });
          }
        }
      }
    }

    const totalAmount = basePrice + deliveryFee + freshFee + extrasTotal;
    const depositAmount = Math.floor(basePrice * 0.5);
    const remainderAmount = totalAmount - depositAmount;

    // Generate order number (max 7 characters: TL + 5 random alphanumerics)
    // Using base36 (0-9, A-Z) for compact representation
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderNumber = `TL${randomPart}`;

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: null, // Anonymous order
        order_number: orderNumber,
        box_size: boxSize,
        status: 'draft',
        deposit_amount: depositAmount,
        remainder_amount: remainderAmount,
        total_amount: totalAmount,
        customer_name: customerName || 'Vipps kunde',
        customer_email: customerEmail || 'pending@vipps.no',
        customer_phone: customerPhone || null,
        delivery_type: deliveryType,
        fresh_delivery: freshDelivery,
        notes: notes || '',
        ribbe_choice: ribbeChoice,
        extra_products: extraProductsData,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Order creation error:', orderError);
      throw new Error('Failed to create order');
    }

    // Update inventory
    const { error: inventoryError } = await supabaseAdmin
      .from('inventory')
      .update({ kg_remaining: inventory.data.kg_remaining - boxSize })
      .eq('id', inventory.data.id);

    if (inventoryError) {
      console.error('Inventory update error:', inventoryError);
      // Don't fail the order, but log the error
    }

    // Send order confirmation email (only if customer email is provided)
    if (customerEmail && customerEmail !== 'pending@vipps.no') {
      try {
        const emailTemplate = getOrderConfirmationTemplate({
          customerName: customerName || 'Kunde',
        orderNumber: order.order_number,
        boxSize,
        ribbeChoice,
        deliveryType,
        freshDelivery,
        extraProducts: extraProductsData.map(e => e.name),
        depositAmount,
        totalAmount,
        language: 'no',
      });

        await sendEmail({
          to: customerEmail,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Don't fail the order if email fails
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process checkout';
    return NextResponse.json(
      { error: 'Failed to process checkout', details: errorMessage },
      { status: 500 }
    );
  }
}
