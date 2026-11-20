import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';
import { getPricingConfig } from '@/lib/config/pricing';
import { logError } from '@/lib/logger';
import { getFixedExtraQuantityForSlug } from '@/lib/extras/fixedQuantities';
import { createOrderAccessToken } from '@/lib/auth/order-access';
import { VIPPS_PENDING_EMAIL } from '@/lib/constants';
import { isPigAmbassadorCode, PIG_AMBASSADOR_REWARD_NOK, PIG_CAMPAIGN_CODE } from '@/lib/pig-campaign';
import { validatePigCampaignOffer } from '@/lib/pig-campaign-server';
export const dynamic = 'force-dynamic';

interface ExtraProduct {
  slug: string;
  quantity: number;
}

interface CheckoutRequest {
  mangalitsaPresetId?: string;
  ribbeChoice: 'tynnribbe' | 'familieribbe' | 'porchetta' | 'butchers_choice';
  extraProducts?: ExtraProduct[];
  deliveryType: 'pickup_farm' | 'pickup_e6' | 'delivery_trondheim' | 'pickup_oslo';
  freshDelivery: boolean;
  notes?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  referralCode?: string;
  referredByPhone?: string;
  rebateCode?: string;
}

function normalizeReferralCodeBase(name?: string | null, phone?: string | null) {
  const cleanedName = (name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();

  const namePart = cleanedName.slice(0, 4) || 'TG';
  const phoneDigits = (phone || '').replace(/\D/g, '');
  const phonePart = (phoneDigits.slice(-4) || '0000').padStart(4, '0');

  return `${namePart}${phonePart}`;
}

async function ensureAutoReferralCode(options: {
  ownerPhone?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  orderId?: string | null;
}) {
  const ownerPhone = (options.ownerPhone || '').trim();
  if (!ownerPhone) return null;

  const { data: existingCode, error: existingCodeError } = await supabaseAdmin
    .from('referral_codes')
    .select('id,code,order_id')
    .eq('owner_phone', ownerPhone)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingCodeError) {
    logError('checkout-referral-existing-code', existingCodeError);
    return null;
  }

  if (existingCode?.code) {
    if(!existingCode.order_id && options.orderId) {
      const {error:linkError}=await supabaseAdmin.from('referral_codes').update({order_id:options.orderId}).eq('id',existingCode.id).is('order_id',null);
      if(linkError) { logError('checkout-referral-link-order',linkError);return null; }
    }
    return existingCode.code;
  }

  const base = normalizeReferralCodeBase(options.ownerName, ownerPhone);

  for (let attempt = 0; attempt < 10; attempt++) {
    const randomLen = attempt === 0 ? 0 : Math.min(4, attempt + 1);
    const randomPart = randomLen
      ? randomBytes(4).toString('hex').toUpperCase().slice(0, randomLen)
      : '';
    const candidate = `${base}${randomPart}`.slice(0, 20);

    try {
      const { data: createdCode, error: createError } = await supabaseAdmin
        .from('referral_codes')
        .insert({
          code: candidate,
          owner_phone: ownerPhone,
          owner_name: options.ownerName || null,
          owner_email: options.ownerEmail || null,
          order_id: options.orderId || null,
          max_uses: 5,
          is_active: true,
        })
        .select('code')
        .single();

      if (createError) {
        const errorCode = (createError as any)?.code;
        if (errorCode === '23505') continue;
        logError('checkout-referral-create-code', createError);
        return null;
      }

      return createdCode?.code || null;
    } catch (error) {
      logError('checkout-referral-create-code-exception', error);
      return null;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  // Allow anonymous orders - no authentication required

  try {
    const body: CheckoutRequest = await request.json();
    const { mangalitsaPresetId, ribbeChoice, extraProducts, deliveryType, freshDelivery, notes, customerName, customerEmail, customerPhone, referralCode: rawReferralCode, rebateCode: rawRebateCode } = body;
    const referralCode = typeof rawReferralCode==='string' ? rawReferralCode.trim().toUpperCase() : undefined;
    const rebateCode = typeof rawRebateCode==='string' ? rawRebateCode.trim().toUpperCase() : undefined;
    if(referralCode && rebateCode) return NextResponse.json({error:'Velg én rabatt; koder kan ikke kombineres'},{status:400});

    const normalizedExtraProducts: ExtraProduct[] = Array.isArray(extraProducts)
      ? extraProducts
          .map((extra) => {
            const slug = String(extra?.slug || '').trim();
            const fixedQuantity = getFixedExtraQuantityForSlug(slug);
            const parsedQuantity = Number(extra?.quantity);
            const quantity = fixedQuantity ?? parsedQuantity;
            return { slug, quantity };
          })
          .filter((extra) => extra.slug && Number.isFinite(extra.quantity) && extra.quantity > 0)
      : [];

    if (!mangalitsaPresetId) {
      return NextResponse.json({ error: 'Mangalitsa preset is required' }, { status: 400 });
    }
    if (!['pickup_farm','pickup_e6','delivery_trondheim','pickup_oslo'].includes(deliveryType)) return NextResponse.json({error:'Invalid pickup option'},{status:400});

    const { data: mangalitsaPresetData, error: presetError } = await supabaseAdmin
      .from('mangalitsa_box_presets')
      .select('*')
      .eq('id', mangalitsaPresetId)
      .eq('active', true)
      .single();

    if (presetError || !mangalitsaPresetData) {
      return NextResponse.json({ error: 'Invalid Mangalitsa preset' }, { status: 400 });
    }

    const effectiveBoxSize = mangalitsaPresetData.target_weight_kg;

    // Customer details are optional - they will be populated from Vipps after payment

    // Availability CHECK only — the box is NOT reserved at checkout. Stock is
    // locked atomically only when the deposit payment completes (see the Vipps
    // webhook), so a failed/abandoned Vipps payment never holds a box. The
    // customer is told on Min side that the box is unreserved until they pay.
    const inventory = await supabaseAdmin
      .from('inventory')
      .select('*')
      .eq('active', true)
      .maybeSingle();

    if (inventory.error || !inventory.data) {
      return NextResponse.json({ error: 'Inventory unavailable' }, { status: 500 });
    }

    if (Number(inventory.data.kg_remaining) < effectiveBoxSize) {
      return NextResponse.json({ error: 'Sold out' }, { status: 409 });
    }

    // Fetch dynamic pricing from config
    const pricing = await getPricingConfig();

    const basePrice = mangalitsaPresetData.price_nok;
    let deliveryFee = 0;
    if (deliveryType === 'pickup_e6') {
      deliveryFee = pricing.delivery_fee_pickup_e6;
    } else if (deliveryType === 'delivery_trondheim' || deliveryType === 'pickup_oslo') {
      deliveryFee = pricing.delivery_fee_trondheim;
    }
    const freshFee = freshDelivery ? pricing.fresh_delivery_fee : 0;

    // Calculate extra products total from database
    interface OrderLineExtra {
      slug: string;
      name: string;
      quantity: number;
      unit_type: string;
      price_per_unit: number;
      size_from_kg: number | null;
      size_to_kg: number | null;
      total_price: number;
    }
    let extrasTotal = 0;
    const extraProductsData: OrderLineExtra[] = [];
    const cutRangesById = new Map<string, { size_from_kg: number | null; size_to_kg: number | null }>();

    if (normalizedExtraProducts.length > 0) {
      // Fetch extras from database
      const { data: extras, error: extrasError } = await supabaseAdmin
        .from('extras_catalog')
        .select('*')
        .in('slug', normalizedExtraProducts.map((e) => e.slug));

      if (!extrasError && extras) {
        const cutIds = Array.from(new Set(extras.map((row: any) => row.cut_id).filter(Boolean)));
        if (cutIds.length > 0) {
          const { data: cutRows, error: cutRowsError } = await supabaseAdmin
            .from('cuts_catalog')
            .select('id,size_from_kg,size_to_kg')
            .in('id', cutIds);

          if (cutRowsError) {
            logError('checkout-extra-cut-ranges', cutRowsError);
          } else {
            for (const cut of cutRows || []) {
              cutRangesById.set(cut.id, {
                size_from_kg: cut.size_from_kg ?? null,
                size_to_kg: cut.size_to_kg ?? null,
              });
            }
          }
        }

        const extrasMap = new Map(extras.map((e: any) => [e.slug, e]));
        for (const extra of normalizedExtraProducts) {
          const catalogItem = extrasMap.get(extra.slug);
          if (catalogItem) {
            const cutRange = catalogItem.cut_id ? cutRangesById.get(catalogItem.cut_id) : null;
            const itemTotal = catalogItem.price_nok * extra.quantity;
            extrasTotal += itemTotal;
            extraProductsData.push({
              slug: extra.slug,
              name: catalogItem.name_no,
              quantity: extra.quantity,
              unit_type: catalogItem.pricing_type === 'per_kg' ? 'kg' : 'unit',
              price_per_unit: catalogItem.price_nok,
              size_from_kg: cutRange?.size_from_kg ?? null,
              size_to_kg: cutRange?.size_to_kg ?? null,
              total_price: itemTotal
            });
          }
        }
      }
    }

    // Calculate base amounts
    const depositPercentage = 50;
    const baseDepositAmount = Math.round(basePrice * (depositPercentage / 100));

    // Check for account-based benefit (egg/chicken customer pork discount)
    let autoBenefitDiscount = 0;
    let autoBenefitId: string | null = null;
    let autoBenefitSource: string | null = null;
    const normalizedBenefitEmail = (customerEmail || '').trim().toLowerCase();
    if (normalizedBenefitEmail && normalizedBenefitEmail !== VIPPS_PENDING_EMAIL) {
      const { data: benefit } = await supabaseAdmin
        .from('customer_benefits')
        .select('id, discount_percent, granted_by_order_type')
        .eq('user_email', normalizedBenefitEmail)
        .eq('benefit_type', 'egg_customer_pork_discount')
        .eq('used', false)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (benefit) {
        autoBenefitDiscount = Math.round(baseDepositAmount * (Number(benefit.discount_percent) / 100));
        autoBenefitId = benefit.id;
        autoBenefitSource = benefit.granted_by_order_type;
      }
    }

    // Resolve referral discount server-side — never trust client-supplied amount
    let referralDiscountAmount = 0;
    let resolvedReferrerPhone: string | null = null;
    let referrerCreditAmount = 0;
    let isAmbassadorReferral = false;
    if (referralCode) {
      const normalizedReferralCode = referralCode.toUpperCase().trim();
      isAmbassadorReferral = isPigAmbassadorCode(normalizedReferralCode);
      const { data: referralCodeRecord } = await supabaseAdmin
        .from('referral_codes')
        .select('id, is_active, owner_phone, owner_email, order_id')
        .eq('code', normalizedReferralCode)
        .maybeSingle();
      const normalizedPhone = (value?: string | null) => String(value || '').replace(/\D/g,'').replace(/^(?:0047|47)(?=\d{8}$)/,'');
      const selfReferral = Boolean(customerPhone && referralCodeRecord?.owner_phone && normalizedPhone(customerPhone) === normalizedPhone(referralCodeRecord.owner_phone)) || Boolean(customerEmail && customerEmail.trim().toLowerCase() === String(referralCodeRecord?.owner_email || '').trim().toLowerCase());
      if (!referralCodeRecord?.is_active || (!isAmbassadorReferral && !referralCodeRecord.order_id) || selfReferral) return NextResponse.json({error:'Ugyldig vennerabattkode'},{status:400});
      const {data: validation,error: validationError} = await supabaseAdmin.rpc('validate_referral_code',{p_code:normalizedReferralCode,p_phone:customerPhone||'',p_email:customerEmail||''});
      if (validationError || !validation?.valid) return NextResponse.json({error:validation?.error || 'Kunne ikke kontrollere vennerabatten'},{status:400});
      if (isAmbassadorReferral) {
        referralDiscountAmount = Math.round(baseDepositAmount * .30);
        resolvedReferrerPhone = referralCodeRecord.owner_phone;
        referrerCreditAmount = PIG_AMBASSADOR_REWARD_NOK;
      } else {
        const {data: referrerOrder,error: referrerError} = await supabaseAdmin.from('orders').select('deposit_amount,referral_discount_amount,rebate_discount_amount,status').eq('id',referralCodeRecord.order_id).maybeSingle();
        if (referrerError || !referrerOrder || ['draft','cancelled','forfeited'].includes(referrerOrder.status)) return NextResponse.json({error:'Vennelenken er ikke klar ennå'},{status:400});
        referralDiscountAmount = Math.round(baseDepositAmount * .30);
        resolvedReferrerPhone = referralCodeRecord.owner_phone;
        const originalReferrerDeposit = Number(referrerOrder.deposit_amount) + Math.max(Number(referrerOrder.referral_discount_amount)||0,Number(referrerOrder.rebate_discount_amount)||0);
        referrerCreditAmount = Math.round(originalReferrerDeposit * .20);
      }
    }

    // Resolve rebate discount server-side — never trust client-supplied amount
    let rebateDiscountAmount = 0;
    if(rebateCode===PIG_CAMPAIGN_CODE) {
      const offer=await validatePigCampaignOffer({depositAmount:baseDepositAmount,customerEmail,customerPhone});
      if(!offer.valid) return NextResponse.json({error:offer.error},{status:400});
      rebateDiscountAmount=offer.discount_amount || 0;
    } else if (rebateCode) {
      const now = new Date().toISOString();
      const { data: rebateRecord } = await supabaseAdmin
        .from('rebate_codes')
        .select('id, is_active, discount_type, discount_value, max_uses, current_uses, valid_from, valid_until')
        .eq('code', rebateCode)
        .maybeSingle();
      const validFrom = rebateRecord?.valid_from ? rebateRecord.valid_from <= now : true;
      const validUntil = rebateRecord?.valid_until ? rebateRecord.valid_until >= now : true;
      const withinUses = rebateRecord?.max_uses == null || (rebateRecord.current_uses ?? 0) < rebateRecord.max_uses;
      if (rebateRecord?.is_active && validFrom && validUntil && withinUses) {
        if (rebateRecord.discount_type === 'percentage') {
          rebateDiscountAmount = Math.round(baseDepositAmount * (Number(rebateRecord.discount_value) / 100));
        } else {
          rebateDiscountAmount = Math.round(Number(rebateRecord.discount_value));
        }
      }
    }

    const manualDiscount = referralDiscountAmount || rebateDiscountAmount;
    // Manual discounts (referral/rebate) take priority; auto-benefit only if no manual discount
    const totalDiscountAmount = manualDiscount || autoBenefitDiscount;

    const depositAmount = Math.round(baseDepositAmount - totalDiscountAmount);

    // Total amount includes everything MINUS the discount
    const totalAmount = Math.round((basePrice + deliveryFee + freshFee + extrasTotal) - totalDiscountAmount);

    // Remainder is the rest of the total after the (discounted) deposit.
    // Delivery fees and extras are paid with the remainder.
    const remainderAmount = Math.round(totalAmount - depositAmount);

    // Generate order number: TL + 5 hex chars from cryptographic random source
    const orderNumber = `TL${randomBytes(3).toString('hex').toUpperCase().slice(0, 5)}`;

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: null, // Anonymous order
        order_number: orderNumber,
        box_size: null,
        mangalitsa_preset_id: mangalitsaPresetId,
        is_mangalitsa: true,
        status: 'draft',
        deposit_amount: depositAmount,
        remainder_amount: remainderAmount,
        total_amount: totalAmount,
        box_price_nok: basePrice,
        customer_name: customerName || 'Vipps kunde',
        customer_email: customerEmail || VIPPS_PENDING_EMAIL,
        customer_phone: customerPhone || null,
        delivery_type: deliveryType,
        pickup_date: deliveryType === 'delivery_trondheim' ? '2026-12-20' : deliveryType === 'pickup_e6' || deliveryType === 'pickup_oslo' ? '2026-12-21' : null,
        fresh_delivery: freshDelivery,
        notes: notes || '',
        ribbe_choice: ribbeChoice,
        extra_products: extraProductsData,
        referral_code_used: referralCode || null,
        referral_discount_amount: referralDiscountAmount,
        referred_by_phone: resolvedReferrerPhone,
        rebate_code_used: rebateCode || null,
        rebate_discount_amount: rebateDiscountAmount,
      })
      .select()
      .single();

    if (orderError || !order) {
      logError('checkout-order-creation', orderError);
      if (
        orderError?.code === '23502' &&
        typeof orderError?.message === 'string' &&
        orderError.message.includes('box_size')
      ) {
        return NextResponse.json(
          {
            error: 'Database schema mismatch',
            details: 'orders.box_size must allow NULL for Mangalitsa orders. Run latest migrations.',
          },
          { status: 500 }
        );
      }
      throw new Error(`Failed to create order: ${orderError?.message || 'Unknown error'}`);
    }

    // Ensure the customer always has a personal referral code after ordering.
    // This powers direct sharing from the confirmation page.
    const personalReferralCode = await ensureAutoReferralCode({
      ownerPhone: customerPhone || null,
      ownerName: customerName || null,
      ownerEmail: customerEmail || null,
      orderId: order.id,
    });

    // Create referral tracking record if referral code was used
    if (referralCode && resolvedReferrerPhone && customerPhone && referralDiscountAmount > 0) {
      try {
        // Get the referral code record
        const { data: codeRecord } = await supabaseAdmin
          .from('referral_codes')
          .select('*')
          .eq('code', referralCode)
          .single();

        if (codeRecord) {
          // Calculate credit for referrer (20% of original deposit before discount)
          const creditAmount = referrerCreditAmount;

          // Create referral tracking
          await supabaseAdmin
            .from('referrals')
            .insert({
              referral_code_id: codeRecord.id,
              referrer_phone: resolvedReferrerPhone,
              referee_phone: customerPhone,
              order_id: order.id,
              order_number: order.order_number,
              discount_percentage: 30.00,
              discount_amount_nok: referralDiscountAmount,
              credit_percentage: isAmbassadorReferral ? 0.00 : 20.00,
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

    // Mark auto-benefit as used if it was applied
    if (autoBenefitId && !manualDiscount) {
      try {
        await supabaseAdmin
          .from('customer_benefits')
          .update({
            used: true,
            used_on_order_id: order.id,
          })
          .eq('id', autoBenefitId);
      } catch (benefitError) {
        logError('checkout-benefit-usage', benefitError);
      }
    }

    // Note: Order confirmation email is sent AFTER payment completes in the Vipps webhook
    // Not sending email here because the customer hasn't paid yet

    const orderAccessToken = await createOrderAccessToken({
      scope: 'orders',
      orderId: order.id,
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      orderAccessToken,
      referralCode: personalReferralCode,
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
