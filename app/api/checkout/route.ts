import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/email/client';
import { getOrderConfirmationTemplate } from '@/lib/email/templates';
import { getPricingConfig } from '@/lib/config/pricing';
import { logError } from '@/lib/logger';

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
  referralCode?: string;
  referralDiscount?: number;
  referredByPhone?: string;
  rebateCode?: string;
  rebateDiscount?: number;
}

export async function POST(request: NextRequest) {
  // Allow anonymous orders - no authentication required

  try {
    const body: CheckoutRequest = await request.json();
    const { boxSize, ribbeChoice, extraProducts, deliveryType, freshDelivery, notes, customerName, customerEmail, customerPhone, referralCode, referralDiscount, referredByPhone, rebateCode, rebateDiscount } = body;

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

    // Fetch dynamic pricing from config
    const pricing = await getPricingConfig();

    // Calculate pricing using dynamic config
    const basePrice = boxSize === 8 ? pricing.box_8kg_price : pricing.box_12kg_price;
    let deliveryFee = 0;
    if (deliveryType === 'pickup_e6') {
      deliveryFee = pricing.delivery_fee_pickup_e6;
    } else if (deliveryType === 'delivery_trondheim') {
      deliveryFee = pricing.delivery_fee_trondheim;
    }
    const freshFee = freshDelivery ? pricing.fresh_delivery_fee : 0;

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

    // Calculate base amounts
    const depositPercentage = boxSize === 8 ? pricing.box_8kg_deposit_percentage : pricing.box_12kg_deposit_percentage;
    const baseDepositAmount = Math.round(basePrice * (depositPercentage / 100));

    // Apply discount to deposit only (referral OR rebate - cannot stack)
    const referralDiscountAmount = Math.round(referralDiscount || 0);
    const rebateDiscountAmount = Math.round(rebateDiscount || 0);
    const totalDiscountAmount = referralDiscountAmount || rebateDiscountAmount;

    const depositAmount = Math.round(baseDepositAmount - totalDiscountAmount);

    // Remainder is ONLY the box price minus the base deposit (before discount)
    // It does NOT include delivery fees or extras (those are paid with deposit)
    const remainderAmount = Math.round(basePrice - baseDepositAmount);

    // Total amount includes everything MINUS the discount
    const totalAmount = Math.round((basePrice + deliveryFee + freshFee + extrasTotal) - totalDiscountAmount);

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
        referral_code_used: referralCode || null,
        referral_discount_amount: referralDiscountAmount,
        referred_by_phone: referredByPhone || null,
        rebate_code_used: rebateCode || null,
        rebate_discount_amount: rebateDiscountAmount,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Order creation failed:', {
        error: orderError,
        code: orderError?.code,
        message: orderError?.message,
        details: orderError?.details,
      });
      logError('checkout-order-creation', orderError);
      throw new Error(`Failed to create order: ${orderError?.message || 'Unknown error'}`);
    }

    // Create referral tracking record if referral code was used
    if (referralCode && referredByPhone && customerPhone) {
      try {
        // Get the referral code record
        const { data: codeRecord } = await supabaseAdmin
          .from('referral_codes')
          .select('*')
          .eq('code', referralCode)
          .single();

        if (codeRecord) {
          // Calculate credit for referrer (10% of original deposit before discount)
          const creditAmount = Math.round(baseDepositAmount * 0.10);

          // Create referral tracking
          await supabaseAdmin
            .from('referrals')
            .insert({
              referral_code_id: codeRecord.id,
              referrer_phone: referredByPhone,
              referee_phone: customerPhone,
              order_id: order.id,
              order_number: order.order_number,
              discount_percentage: 20.00,
              discount_amount_nok: referralDiscountAmount,
              credit_percentage: 10.00,
              credit_amount_nok: creditAmount,
              referee_name: customerName || 'Vipps kunde',
              referee_email: customerEmail,
            });
        }
      } catch (referralError) {
        logError('checkout-referral-tracking', referralError);
        // Don't fail the order if referral tracking fails
      }
    }

    // Create rebate usage tracking record if rebate code was used
    if (rebateCode && customerPhone) {
      try {
        // Get the rebate code record
        const { data: rebateCodeRecord } = await supabaseAdmin
          .from('rebate_codes')
          .select('*')
          .eq('code', rebateCode)
          .single();

        if (rebateCodeRecord) {
          // Create rebate usage tracking
          await supabaseAdmin
            .from('rebate_usage')
            .insert({
              rebate_code_id: rebateCodeRecord.id,
              order_id: order.id,
              order_number: order.order_number,
              customer_phone: customerPhone,
              customer_email: customerEmail,
              customer_name: customerName || 'Vipps kunde',
              discount_amount_nok: rebateDiscountAmount,
              original_deposit: baseDepositAmount,
              final_deposit: depositAmount,
            });
        }
      } catch (rebateError) {
        logError('checkout-rebate-tracking', rebateError);
        // Don't fail the order if rebate tracking fails
      }
    }

    // Update inventory
    const { error: inventoryError } = await supabaseAdmin
      .from('inventory')
      .update({ kg_remaining: inventory.data.kg_remaining - boxSize })
      .eq('id', inventory.data.id);

    if (inventoryError) {
      logError('checkout-inventory-update', inventoryError);
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
        logError('checkout-confirmation-email', emailError);
        // Don't fail the order if email fails
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (error) {
    logError('checkout-main', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process checkout';
    return NextResponse.json(
      { error: 'Failed to process checkout', details: errorMessage },
      { status: 500 }
    );
  }
}
