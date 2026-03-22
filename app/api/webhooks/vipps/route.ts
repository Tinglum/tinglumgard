// app/api/webhooks/vipps/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/email/dispatch";
import { reconcileEggPaymentDependentFlowInstances } from "@/lib/email/lifecycle";
import { renderManagedTemplate } from "@/lib/email/render";
import { buildAdminOrderLink, buildCustomerOrderLink } from "@/lib/email/links";
import { finalizeConfirmedEggOrder } from '@/lib/eggs/order-confirmation'
import {
  buildChickenBreedAgeLabel,
  buildChickenOrderLinesHtml,
  buildTotalBirdsLabel,
  summarizeChickenOrderLines,
} from "@/lib/chickens/email-lines";
import { logError } from "@/lib/logger";
import { vippsClient } from "@/lib/vipps/api-client";

/**
 * Vipps Webhooks API uses HMAC verification.
 * Docs: "How to authenticate the webhook event"
 */
function verifyVippsWebhookHmac(req: NextRequest, bodyText: string): boolean {
  const secret = process.env.VIPPS_WEBHOOK_SECRET;
  if (!secret) return false;

  const xMsDate = req.headers.get("x-ms-date") || "";
  const xMsContentSha256 = req.headers.get("x-ms-content-sha256") || "";
  const authorization = req.headers.get("authorization") || "";
  const host = req.headers.get("host") || "";

  if (!xMsDate || !xMsContentSha256 || !authorization || !host) return false;

  // 1) Verify content hash matches x-ms-content-sha256
  const computedHash = crypto
    .createHash("sha256")
    .update(bodyText)
    .digest("base64");

  if (computedHash !== xMsContentSha256) return false;

  // 2) Verify Authorization signature
  // Expected signing string format:
  // `POST\n<pathAndQuery>\n<date>;<host>;<hash>`
  // Note \n, not \r\n
  const url = new URL(req.url);
  const pathAndQuery = url.pathname + url.search;

  const signedString = `POST\n${pathAndQuery}\n${xMsDate};${host};${xMsContentSha256}`;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedString)
    .digest("base64");

  const expectedAuth = `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${expectedSignature}`;

  return authorization === expectedAuth;
}

function safeTokenEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getConfiguredCallbackTokens(): string[] {
  const candidates = [
    process.env.VIPPS_WEBHOOK_CALLBACK_AUTH_TOKEN,
    process.env.VIPPS_WEBHOOK_AUTHORIZATION,
    process.env.VIPPS_CALLBACK_AUTH_TOKEN,
    process.env.VIPPS_CALLBACK_TOKEN,
  ]
    .map((value) => (value || '').trim())
    .filter(Boolean);

  return Array.from(new Set(candidates));
}

function extractIncomingCallbackToken(request: NextRequest): string {
  const directHeaderToken =
    request.headers.get('x-vipps-callback-auth-token') ||
    request.headers.get('x-vipps-callback-authorization-token') ||
    request.headers.get('callbackauthtoken') ||
    '';

  if (directHeaderToken.trim()) {
    return directHeaderToken.trim();
  }

  // Some environments forward Vipps callbackAuthorizationToken as plain Authorization header.
  const authorizationHeader = (request.headers.get('authorization') || '').trim();
  if (!authorizationHeader) {
    return '';
  }

  const lower = authorizationHeader.toLowerCase();

  // Not callback token (e.g. HMAC signature format).
  if (lower.startsWith('hmac-sha256')) {
    return '';
  }

  if (lower.startsWith('bearer ')) {
    return authorizationHeader.slice(7).trim();
  }

  return authorizationHeader;
}

type EggAdditionRelation = {
  quantity?: number | null;
  price_per_egg?: number | null;
  subtotal?: number | null;
  egg_breeds?: { name?: string | null } | { name?: string | null }[] | null;
};

type EggAdditionsSummary = {
  baseQuantity: number;
  additionsQuantity: number;
  totalQuantity: number;
  additions: Array<{
    breedName: string;
    quantity: number;
    pricePerEgg: number;
    subtotal: number;
  }>;
};

type EggOrderLine = {
  source: 'base' | 'addition';
  breedName: string;
  quantity: number;
  pricePerEggOre: number;
  subtotalOre: number;
};

function escapeHtml(value: string): string {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function summarizeEggAdditions(order: any): EggAdditionsSummary {
  const relation: EggAdditionRelation[] = Array.isArray(order?.egg_order_additions)
    ? order.egg_order_additions
    : [];

  const additions: EggAdditionsSummary['additions'] = relation
    .map((item: EggAdditionRelation) => {
      const breedRelation = item?.egg_breeds as { name?: string | null } | { name?: string | null }[] | null;
      const breedName =
        (Array.isArray(breedRelation) ? breedRelation[0]?.name : breedRelation?.name) || 'Rugeegg';
      return {
        breedName,
        quantity: Number(item?.quantity || 0),
        pricePerEgg: Number(item?.price_per_egg || 0),
        subtotal: Number(item?.subtotal || 0),
      };
    })
    .filter((item: EggAdditionsSummary['additions'][number]) => item.quantity > 0);

  const baseQuantity = Number(order?.quantity || 0);
  const additionsQuantity = additions.reduce((sum: number, item: EggAdditionsSummary['additions'][number]) => {
    return sum + item.quantity;
  }, 0);
  const totalQuantity = baseQuantity + additionsQuantity;

  return {
    baseQuantity,
    additionsQuantity,
    totalQuantity,
    additions,
  };
}

function buildEggOrderLinesHtml(options: {
  baseBreedName: string;
  baseQuantity: number;
  basePricePerEggOre: number;
  additions: EggAdditionsSummary['additions'];
  deliveryFeeOre?: number;
  deliveryLabel?: string;
  locale?: 'no' | 'en';
}): string {
  const locale = options.locale || 'no';
  const lines: EggOrderLine[] = [];
  const baseQuantity = Math.max(0, Math.round(Number(options.baseQuantity || 0)));
  const basePricePerEggOre = Math.max(0, Math.round(Number(options.basePricePerEggOre || 0)));

  if (baseQuantity > 0) {
    lines.push({
      source: 'base',
      breedName: String(options.baseBreedName || 'Rugeegg').trim() || 'Rugeegg',
      quantity: baseQuantity,
      pricePerEggOre: basePricePerEggOre,
      subtotalOre: baseQuantity * basePricePerEggOre,
    });
  }

  for (const addition of options.additions || []) {
    const quantity = Math.max(0, Math.round(Number(addition?.quantity || 0)));
    if (quantity <= 0) continue;
    const pricePerEggOre = Math.max(0, Math.round(Number(addition?.pricePerEgg || 0)));
    const subtotalOre = Math.max(
      0,
      Math.round(Number(addition?.subtotal || quantity * pricePerEggOre))
    );
    lines.push({
      source: 'addition',
      breedName: String(addition?.breedName || 'Rugeegg').trim() || 'Rugeegg',
      quantity,
      pricePerEggOre,
      subtotalOre,
    });
  }

  if (lines.length === 0) return '';

  const labels =
    locale === 'en'
      ? {
          source: 'Line',
          breed: 'Breed',
          quantity: 'Qty',
          unitPrice: 'Price / egg',
          subtotal: '',
          total: 'Total',
          base: 'Base order',
          addition: 'Added line',
        }
      : {
          source: 'Linje',
          breed: 'Rase',
          quantity: 'Antall',
          unitPrice: 'Pris / egg',
          subtotal: '',
          total: 'Total',
          base: 'Grunnordre',
          addition: 'Tillegg',
        };

  const rows = lines
    .map((line) => {
      const sourceLabel = line.source === 'base' ? labels.base : labels.addition;
      return `<tr>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(sourceLabel)}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${escapeHtml(line.breedName)}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${line.quantity} egg</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;text-align:right;">${formatOreToNokWithPrefix(
    line.pricePerEggOre
  )}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;text-align:right;">${formatOreToNokWithPrefix(
    line.subtotalOre
  )}</td>
</tr>`;
    })
    .join('');

  const eggSubtotalOre = lines.reduce((sum, line) => sum + line.subtotalOre, 0);
  const deliveryFeeOre = Math.max(0, Math.round(Number(options.deliveryFeeOre || 0)));
  const totalOre = eggSubtotalOre + deliveryFeeOre;

  const deliveryFeeLabel = locale === 'en' ? 'Shipping & packing' : 'Frakt og pakking';
  const deliveryFeeRow = deliveryFeeOre > 0
    ? `<tr>
  <td colspan="3" style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${deliveryFeeLabel}${options.deliveryLabel ? ` (${escapeHtml(options.deliveryLabel)})` : ''}</td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;text-align:right;"></td>
  <td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;text-align:right;">${formatOreToNokWithPrefix(deliveryFeeOre)}</td>
</tr>`
    : '';

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin:8px 0;">
  <thead>
    <tr style="background:#f9fafb;">
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${labels.source}</th>
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${labels.breed}</th>
      <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${labels.quantity}</th>
      <th style="text-align:right;padding:8px;border:1px solid #e5e7eb;">${labels.unitPrice}</th>
      <th style="text-align:right;padding:8px;border:1px solid #e5e7eb;">${labels.subtotal}</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    ${deliveryFeeRow}
    <tr style="background:#f9fafb;">
      <td colspan="4" style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">${labels.total}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">${formatOreToNokWithPrefix(
        totalOre
      )}</td>
    </tr>
  </tbody>
</table>`;
}

function formatNok(amount: number): string {
  return `kr ${Math.round(Number(amount) || 0).toLocaleString('nb-NO')}`;
}

function formatOreToNokWithPrefix(amountOre: number): string {
  return `kr ${Math.round((Number(amountOre) || 0) / 100).toLocaleString('nb-NO')}`;
}

function getPigDeliveryLabel(deliveryType: string): string {
  if (deliveryType === 'pickup_farm') return 'Henting på gården';
  if (deliveryType === 'pickup_e6') return 'Henting ved E6';
  if (deliveryType === 'delivery_trondheim') return 'Levering i Trondheim';
  return deliveryType || 'Henting';
}

function getEggDeliveryLabel(deliveryMethod: string): string {
  if (deliveryMethod === 'posten') return 'Posten';
  if (deliveryMethod === 'e6_pickup') return 'E6 møtepunkt';
  if (deliveryMethod === 'farm_pickup') return 'Henting på gården';
  return deliveryMethod || 'Levering';
}

function getChickenDeliveryLabel(deliveryMethod: string): string {
  if (deliveryMethod === 'farm_pickup') return 'Henting på gården';
  if (deliveryMethod === 'delivery_namsos_trondheim') return 'Levering Namsos/Trondheim';
  return deliveryMethod || 'Henting';
}

function buildPigExtrasHtml(extraProducts: any[]): string {
  if (!Array.isArray(extraProducts) || extraProducts.length === 0) return '';
  let html = '<p><strong>Tilleggsprodukter:</strong></p><ul>';
  for (const extra of extraProducts) {
    html += `<li>${extra.name} (${extra.quantity} ${extra.unit_type})</li>`;
  }
  html += '</ul>';
  return html;
}

function buildOrderUrl(appUrl: string, scope: 'order' | 'egg_order' | 'chicken_order', id: string): string {
  if (scope === 'egg_order') return buildCustomerOrderLink(appUrl, 'egg', id);
  if (scope === 'chicken_order') return buildCustomerOrderLink(appUrl, 'chicken', id);
  return buildCustomerOrderLink(appUrl, 'pig', id);
}

function buildAdminUrl(appUrl: string, scope: 'order' | 'egg_order' | 'chicken_order', id: string): string {
  if (scope === 'egg_order') return buildAdminOrderLink(appUrl, 'egg', id);
  if (scope === 'chicken_order') return buildAdminOrderLink(appUrl, 'chicken', id);
  return buildAdminOrderLink(appUrl, 'pig', id);
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizePhone(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function buildVippsContactUpdate(details: any): Record<string, string> {
  if (!details || typeof details !== 'object') return {};

  const firstName = String(details.firstName || details.first_name || '').trim();
  const lastName = String(details.lastName || details.last_name || '').trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const email = normalizeEmail(details.email || details.emailAddress || details.email_address);
  const phone = normalizePhone(details.phoneNumber || details.phone_number || details.mobileNumber);
  const address = String(details.streetAddress || details.addressLine1 || details.address || '').trim();
  const postalCode = String(details.postalCode || details.zipCode || '').trim();
  const city = String(details.city || '').trim();

  const update: Record<string, string> = {};
  if (fullName) update.customer_name = fullName;
  if (email && email !== 'pending@vipps.no') update.customer_email = email;
  if (phone) update.customer_phone = phone;
  if (address) update.shipping_address = address;
  if (postalCode) update.shipping_postal_code = postalCode;
  if (city) update.shipping_city = city;
  return update;
}

async function getVippsCheckoutSessionFromPayment(payment: any): Promise<any | null> {
  const candidates = [payment?.vipps_order_id, payment?.idempotency_key]
    .map((value: unknown) => String(value || '').trim())
    .filter(Boolean);

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    try {
      return await vippsClient.getCheckoutSession(candidate);
    } catch {
      // Ignore candidate mismatch and continue to next.
    }
  }

  return null;
}

async function enrichEggOrderContact(order: any, payment: any): Promise<any> {
  if (!order) return order;

  const currentEmail = normalizeEmail(order.customer_email);
  const currentPhone = normalizePhone(order.customer_phone);
  const needsContactUpdate =
    !currentEmail || currentEmail === 'pending@vipps.no' || !currentPhone || !String(order.customer_name || '').trim();

  if (!needsContactUpdate) return order;

  const checkoutSession = await getVippsCheckoutSessionFromPayment(payment);
  const details = checkoutSession?.shippingDetails || checkoutSession?.billingDetails || checkoutSession?.customerDetails;
  const patch = buildVippsContactUpdate(details);

  if (Object.keys(patch).length === 0) return order;

  const { error } = await supabaseAdmin
    .from('egg_orders')
    .update(patch)
    .eq('id', order.id);

  if (error) {
    logError('vipps-webhook-egg-contact-update', error);
    return { ...order, ...patch };
  }

  return { ...order, ...patch };
}

async function enrichChickenOrderContact(order: any, payment: any): Promise<any> {
  if (!order) return order;

  const currentEmail = normalizeEmail(order.customer_email);
  const currentPhone = normalizePhone(order.customer_phone);
  const needsContactUpdate =
    !currentEmail || currentEmail === 'pending@vipps.no' || !currentPhone || !String(order.customer_name || '').trim();

  if (!needsContactUpdate) return order;

  const checkoutSession = await getVippsCheckoutSessionFromPayment(payment);
  const details = checkoutSession?.shippingDetails || checkoutSession?.billingDetails || checkoutSession?.customerDetails;
  const patch = buildVippsContactUpdate(details);

  if (Object.keys(patch).length === 0) return order;

  const { error } = await supabaseAdmin
    .from('chicken_orders')
    .update(patch)
    .eq('id', order.id);

  if (error) {
    logError('vipps-webhook-chicken-contact-update', error);
    return { ...order, ...patch };
  }

  return { ...order, ...patch };
}

async function attachChickenOrderToVippsUser(order: any): Promise<any> {
  if (!order || order.user_id) return order;

  const email = normalizeEmail(order.customer_email);
  const phone = normalizePhone(order.customer_phone);
  let resolvedUserId: string | null = null;

  if (email && email !== 'pending@vipps.no') {
    const { data: userByEmail } = await supabaseAdmin
      .from('vipps_users')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    resolvedUserId = userByEmail?.id || null;
  }

  if (!resolvedUserId && phone) {
    const { data: userByPhone } = await supabaseAdmin
      .from('vipps_users')
      .select('id')
      .eq('phone_number', phone)
      .maybeSingle();
    resolvedUserId = userByPhone?.id || null;
  }

  if (!resolvedUserId) return order;

  const { error } = await supabaseAdmin
    .from('chicken_orders')
    .update({ user_id: resolvedUserId })
    .eq('id', order.id)
    .is('user_id', null);

  if (error) {
    logError('vipps-webhook-chicken-link-user', error);
    return order;
  }

  return { ...order, user_id: resolvedUserId };
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();

    const payload = JSON.parse(bodyText) as {
      orderId?: string;
      reference?: string;
      sessionId?: string;
      merchantSerialNumber?: string;
      eventType?: string;
      sessionState?: string;
      paymentDetails?: {
        state?: string;
        type?: string;
        amount?: { value: number; currency: string };
      };
      [k: string]: unknown;
    };

    console.log('Vipps webhook received', {
      sessionId: payload.sessionId || null,
      reference: payload.reference || null,
      sessionState: payload.sessionState || null,
      paymentState: payload.paymentDetails?.state || null,
      hasAuthorizationHeader: !!request.headers.get('authorization'),
      hasCallbackAuthHeader:
        !!request.headers.get('x-vipps-callback-auth-token') ||
        !!request.headers.get('x-vipps-callback-authorization-token'),
    });

    // CRITICAL: Check if payment was actually successful
    const sessionState = payload.sessionState as string | undefined;
    const paymentState = payload.paymentDetails?.state as string | undefined;

    console.log('Payment states:', { sessionState, paymentState });

    // Only process successful payments
    if (sessionState !== 'PaymentSuccessful' || paymentState !== 'AUTHORIZED') {
      console.log('Payment not successful, ignoring webhook', { sessionState, paymentState });
      return NextResponse.json(
        { 
          message: "Payment not successful, no action taken",
          sessionState,
          paymentState
        },
        { status: 200 }
      );
    }

    // Try to find payment by session ID or reference
    const vippsId =
      (payload.sessionId as string | undefined) ||
      (payload.reference as string | undefined);

    if (!vippsId) {
      logError('vipps-webhook-missing-identifier', new Error('Missing vipps identifier in webhook'));
      return NextResponse.json(
        { error: "Missing vipps identifier" },
        { status: 400 }
      );
    }

    console.log('Looking for payment with vipps_session_id:', vippsId);

    // Find payment row by vipps_session_id (not vipps_payment_id)
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("vipps_session_id", vippsId)
      .maybeSingle();

    let isEggPayment = false;
    let isChickenPayment = false;
    let resolvedPayment: any = payment;

    if (!resolvedPayment) {
      let eggPayment = null;
      const { data: eggPaymentBySession, error: eggPaymentError } = await supabaseAdmin
        .from("egg_payments")
        .select("*")
        .eq("vipps_order_id", vippsId)
        .maybeSingle();

      if (eggPaymentError) {
        logError('vipps-webhook-egg-payment-not-found', eggPaymentError);
      }

      eggPayment = eggPaymentBySession;

      if (!eggPayment) {
        const { data: eggPaymentByRef } = await supabaseAdmin
          .from("egg_payments")
          .select("*")
          .eq("idempotency_key", vippsId)
          .maybeSingle();
        eggPayment = eggPaymentByRef;
      }

      if (eggPayment) {
        resolvedPayment = eggPayment;
        isEggPayment = true;
      }
    }

    // --- Chicken payments lookup ---
    if (!resolvedPayment) {
      let chickenPayment = null;
      const { data: chickenPaymentBySession, error: chickenPaymentError } = await supabaseAdmin
        .from("chicken_payments")
        .select("*")
        .eq("vipps_order_id", vippsId)
        .maybeSingle();

      if (chickenPaymentError) {
        logError('vipps-webhook-chicken-payment-not-found', chickenPaymentError);
      }

      chickenPayment = chickenPaymentBySession;

      if (!chickenPayment) {
        const { data: chickenPaymentByRef } = await supabaseAdmin
          .from("chicken_payments")
          .select("*")
          .eq("idempotency_key", vippsId)
          .maybeSingle();
        chickenPayment = chickenPaymentByRef;
      }

      if (chickenPayment) {
        resolvedPayment = chickenPayment;
        isChickenPayment = true;
      }
    }

    if (!resolvedPayment) {
      logError('vipps-webhook-payment-not-found', paymentError);
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    console.log('Found payment:', resolvedPayment.id, 'type:', resolvedPayment.payment_type, 'egg:', isEggPayment, 'chicken:', isChickenPayment);

    const incomingCallbackToken = extractIncomingCallbackToken(request);
    const storedCallbackToken = (resolvedPayment.vipps_callback_token || '').trim();
    const configuredCallbackTokens = getConfiguredCallbackTokens();
    const hmacVerified = verifyVippsWebhookHmac(request, bodyText);

    const hasStoredTokenMatch =
      Boolean(incomingCallbackToken && storedCallbackToken) &&
      safeTokenEquals(incomingCallbackToken, storedCallbackToken);

    const hasConfiguredTokenMatch =
      Boolean(incomingCallbackToken) &&
      configuredCallbackTokens.some((configuredToken) => safeTokenEquals(incomingCallbackToken, configuredToken));

    // Backward compatibility: some older pending payments may miss vipps_callback_token in DB.
    // If no stored token exists, accept a non-empty incoming token as long as HMAC validation
    // is not being used for this callback.
    const allowLegacyMissingStoredToken =
      !hmacVerified &&
      !storedCallbackToken &&
      Boolean(incomingCallbackToken);

    const webhookAuthorized =
      hmacVerified ||
      hasStoredTokenMatch ||
      hasConfiguredTokenMatch ||
      allowLegacyMissingStoredToken;

    if (!webhookAuthorized) {
      logError(
        'vipps-webhook-callback-token-mismatch',
        new Error(`Callback token mismatch for payment ${resolvedPayment.id}`)
      );
      return NextResponse.json({ error: 'Unauthorized webhook callback token' }, { status: 401 });
    }

    if (allowLegacyMissingStoredToken) {
      console.warn('Vipps webhook accepted with legacy fallback (missing stored callback token)', {
        paymentId: resolvedPayment.id,
        sessionId: payload.sessionId || null,
      });
    }

    // Idempotency guard: if payment is already completed, skip duplicate side effects.
    if (resolvedPayment.status === 'completed') {
      if (isEggPayment && resolvedPayment.payment_type === 'deposit' && resolvedPayment.egg_order_id) {
        try {
          await finalizeConfirmedEggOrder(resolvedPayment.egg_order_id)

          const { data: existingEggOrder } = await supabaseAdmin
            .from('egg_orders')
            .select('id, status, deposit_amount, total_amount, remainder_amount')
            .eq('id', resolvedPayment.egg_order_id)
            .maybeSingle()

          if (existingEggOrder && existingEggOrder.status === 'pending') {
            const depositAmount = Number(existingEggOrder.deposit_amount || 0)
            const totalAmount = Number(existingEggOrder.total_amount || 0)
            const remainderAmount = Number(existingEggOrder.remainder_amount || 0)
            const nextStatus =
              remainderAmount <= 0 || (depositAmount > 0 && totalAmount > 0 && depositAmount >= totalAmount)
                ? 'fully_paid'
                : 'deposit_paid'

            await supabaseAdmin
              .from('egg_orders')
              .update({ status: nextStatus })
              .eq('id', existingEggOrder.id)
          }
        } catch (error) {
          logError('vipps-webhook-duplicate-egg-finalization', error, {
            paymentId: resolvedPayment.id,
            orderId: resolvedPayment.egg_order_id,
          })
        }
      }

      console.log('Payment already completed, skipping duplicate webhook', { paymentId: resolvedPayment.id });
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Mark payment as completed with timestamp
    const paymentTable = isChickenPayment ? "chicken_payments" : isEggPayment ? "egg_payments" : "payments";
    const { data: updatedRows, error: updErr } = await supabaseAdmin
      .from(paymentTable)
      .update({
        status: "completed",
        paid_at: new Date().toISOString()
      })
      .eq("id", resolvedPayment.id)
      .eq("status", "pending")
      .select("id");

    if (updErr) {
      logError('vipps-webhook-payment-update-failed', updErr);
      throw updErr;
    }

    // Race condition guard: if no rows were updated, another webhook already processed this payment
    if (!updatedRows || updatedRows.length === 0) {
      console.log('Payment was already processed by another webhook call, skipping', { paymentId: resolvedPayment.id });
      return NextResponse.json({ received: true, duplicate: true });
    }

    console.log('Payment marked as completed with timestamp');

    // Fetch the order details for email notification
    let order: any = null;
    let orderFetchErr: any = null;
    let eggBreedName: string | null = null;

    if (isChickenPayment) {
      const result = await supabaseAdmin
        .from("chicken_orders")
        .select("*, chicken_breeds(*), chicken_hatches(hatch_date), chicken_order_additions(hatch_id, quantity_hens, quantity_roosters, price_per_hen_nok, price_per_rooster_nok, subtotal_nok, chicken_breeds(name_no, name_en, name), chicken_hatches(hatch_date))")
        .eq("id", resolvedPayment.chicken_order_id)
        .single();
      order = result.data;
      orderFetchErr = result.error;
    } else if (isEggPayment) {
      const result = await supabaseAdmin
        .from("egg_orders")
        .select("*, egg_breeds(name), egg_order_additions(quantity, price_per_egg, subtotal, egg_breeds(name))")
        .eq("id", resolvedPayment.egg_order_id)
        .single();
      order = result.data;
      orderFetchErr = result.error;

      if (order) {
        order = await enrichEggOrderContact(order, resolvedPayment);
      }

      const baseBreedRelation = order?.egg_breeds as { name?: string } | { name?: string }[] | null;
      eggBreedName = (Array.isArray(baseBreedRelation) ? baseBreedRelation[0]?.name : baseBreedRelation?.name) || null;

      if (!eggBreedName && order?.breed_id) {
        const { data: breed } = await supabaseAdmin
          .from("egg_breeds")
          .select("name")
          .eq("id", order.breed_id)
          .maybeSingle();
        eggBreedName = breed?.name || null;
      }
    } else {
      const result = await supabaseAdmin
        .from("orders")
        .select("*, mangalitsa_preset:mangalitsa_box_presets(name_no, name_en, target_weight_kg)")
        .eq("id", resolvedPayment.order_id)
        .single();
      order = result.data;
      orderFetchErr = result.error;
    }

    if (orderFetchErr || !order) {
      logError('vipps-webhook-fetch-order', orderFetchErr);
    }

    if (isChickenPayment && order) {
      order = await enrichChickenOrderContact(order, resolvedPayment);
      order = await attachChickenOrderToVippsUser(order);
    }

    const eggSummary = isEggPayment ? summarizeEggAdditions(order) : null;
    const eggAdditionsHtml = eggSummary
      ? buildEggOrderLinesHtml({
          baseBreedName: eggBreedName || order?.breed_name || 'Rugeegg',
          baseQuantity: Number(order?.quantity || 0),
          basePricePerEggOre: Number(order?.price_per_egg || 0),
          additions: eggSummary.additions,
          deliveryFeeOre: Number(order?.delivery_fee || 0),
          deliveryLabel: getEggDeliveryLabel(String(order?.delivery_method || '')),
          locale: 'no',
        })
      : '';

    // If deposit completed, update order status and send confirmation email
    if (resolvedPayment.payment_type === "deposit") {
      const orderTable = isChickenPayment ? "chicken_orders" : isEggPayment ? "egg_orders" : "orders";
      const orderIdField = isChickenPayment ? resolvedPayment.chicken_order_id : isEggPayment ? resolvedPayment.egg_order_id : resolvedPayment.order_id;

      if (isEggPayment && order?.id) {
        await finalizeConfirmedEggOrder(order.id)
      }

      // If deposit covers the full amount (or remainder is zero), set status to fully_paid
      const depositAmount = Number(order?.deposit_amount || 0);
      const totalAmount = Number(order?.total_amount || 0);
      const remainderAmount = Number(isEggPayment ? (order?.remainder_amount || 0) : (order?.remainder_amount_nok || 0));
      const newStatus = (remainderAmount <= 0 || (depositAmount > 0 && totalAmount > 0 && depositAmount >= totalAmount)) ? 'fully_paid' : 'deposit_paid';
      console.log(`Updating order status to ${newStatus} (deposit: ${depositAmount}, total: ${totalAmount}, remainder: ${remainderAmount})`);

      const { error: orderErr } = await supabaseAdmin
        .from(orderTable)
        .update({ status: newStatus })
        .eq("id", orderIdField);

      if (orderErr) {
        logError('vipps-webhook-order-update-failed', orderErr);
        throw orderErr;
      }

      console.log('Order status updated successfully');

      const customerEmailForSend = normalizeEmail(order?.customer_email);
      if (order && customerEmailForSend && customerEmailForSend !== 'pending@vipps.no') {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'https://tinglumgard.no';

          if (isEggPayment) {
            const breedName = eggBreedName || order.breed_name || 'Rugeegg';
            const baseQuantity = eggSummary?.baseQuantity ?? Number(order.quantity || 0);
            const additionsQuantity = eggSummary?.additionsQuantity ?? 0;
            const totalQuantity = eggSummary?.totalQuantity ?? baseQuantity;
            const rendered = await renderManagedTemplate({
              templateKey: 'egg.order.deposit.confirmed.customer',
              locale: 'no',
              variables: {
                customer_name: order.customer_name || 'Kunde',
                order_number: order.order_number,
                breed_name: breedName,
                week_number: order.week_number,
                base_quantity: baseQuantity,
                additions_quantity: additionsQuantity,
                total_quantity: totalQuantity,
                additions_html: eggAdditionsHtml,
                total_amount_nok: formatOreToNokWithPrefix(order.total_amount),
                deposit_amount_nok: formatOreToNokWithPrefix(order.deposit_amount),
                remainder_amount_nok: formatOreToNokWithPrefix(order.remainder_amount),
                order_url: buildOrderUrl(appUrl, 'egg_order', order.id),
                tip_index: 0,
              },
            });

            if (!rendered) {
              throw new Error('Missing template egg.order.deposit.confirmed.customer');
            }
            await dispatchEmail({
              to: customerEmailForSend,
              subject: rendered.subject,
              html: rendered.html,
              classification: 'transactional',
              templateKey: rendered.templateKey,
              sourcePath: '/api/webhooks/vipps',
              eggOrderId: order.id,
            });
          } else if (isChickenPayment) {
            const chickenSummary = summarizeChickenOrderLines(order);
            const chickenBreedWithAgeNo = buildChickenBreedAgeLabel(chickenSummary.lines, 'no');
            const chickenBreedWithAgeEn = buildChickenBreedAgeLabel(chickenSummary.lines, 'en');
            const rendered = await renderManagedTemplate({
              templateKey: 'chicken.order.deposit.confirmed.customer',
              locale: 'no',
              variables: {
                customer_name: order.customer_name || 'Kunde',
                order_number: order.order_number,
                breed_name: chickenBreedWithAgeNo || chickenSummary.breedLabel || 'Kyllinger',
                breed_name_en: chickenBreedWithAgeEn || chickenSummary.breedLabel || 'Chickens',
                breed_name_plain: chickenSummary.breedLabel || 'Kyllinger',
                quantity_hens: chickenSummary.hens,
                quantity_roosters: chickenSummary.roosters,
                total_birds_label: buildTotalBirdsLabel(chickenSummary.hens, chickenSummary.roosters, 'no'),
                total_birds_label_en: buildTotalBirdsLabel(chickenSummary.hens, chickenSummary.roosters, 'en'),
                order_lines_html: buildChickenOrderLinesHtml(chickenSummary.lines, 'no', { deliveryFeeNok: Number(order.delivery_fee_nok || 0), deliveryLabel: getChickenDeliveryLabel(String(order.delivery_method || '')) }),
                order_lines_html_en: buildChickenOrderLinesHtml(chickenSummary.lines, 'en', { deliveryFeeNok: Number(order.delivery_fee_nok || 0), deliveryLabel: getChickenDeliveryLabel(String(order.delivery_method || '')) }),
                pickup_date: new Date(`${order.pickup_monday}T00:00:00`).toLocaleDateString('nb-NO'),
                delivery_label: getChickenDeliveryLabel(String(order.delivery_method || '')),
                total_amount_nok: formatNok(order.total_amount_nok),
                deposit_amount_nok: formatNok(order.deposit_amount_nok),
                remainder_amount_nok: formatNok(order.remainder_amount_nok),
                order_url: buildOrderUrl(appUrl, 'chicken_order', order.id),
                tip_index: 0,
              },
            });

            if (!rendered) {
              throw new Error('Missing template chicken.order.deposit.confirmed.customer');
            }
            await dispatchEmail({
              to: customerEmailForSend,
              subject: rendered.subject,
              html: rendered.html,
              classification: 'transactional',
              templateKey: rendered.templateKey,
              sourcePath: '/api/webhooks/vipps',
              chickenOrderId: order.id,
            });
          } else {
            const displayBoxName = order.mangalitsa_preset?.name_no || order.mangalitsa_preset?.name_en || null;
            const boxDisplay = displayBoxName || 'Mangalitsa-boks';
            const discountAmount = order.referral_discount_amount || order.rebate_discount_amount || 0;
            const discountLabel = order.referral_discount_amount ? 'Vennerabatt' : 'Rabattkode';
            const rendered = await renderManagedTemplate({
              templateKey: 'pig.order.deposit.confirmed.customer',
              locale: 'no',
              variables: {
                customer_name: order.customer_name || 'Kunde',
                order_number: order.order_number,
                box_label: boxDisplay,
                ribbe_choice: order.ribbe_choice || 'Ikke valgt',
                delivery_label: getPigDeliveryLabel(String(order.delivery_type || '')),
                extras_html: buildPigExtrasHtml(order.extra_products || []),
                discount_html:
                  discountAmount > 0
                    ? `<p><strong>${discountLabel}:</strong> -${formatNok(discountAmount)}</p>`
                    : '',
                total_amount_nok: formatNok(order.total_amount),
                deposit_amount_nok: formatNok(resolvedPayment.amount_nok),
                remainder_amount_nok: formatNok(order.remainder_amount),
                order_url: buildOrderUrl(appUrl, 'order', order.id),
                tip_index: 0,
              },
            });

            if (!rendered) {
              throw new Error('Missing template pig.order.deposit.confirmed.customer');
            }
            await dispatchEmail({
              to: customerEmailForSend,
              subject: rendered.subject,
              html: rendered.html,
              classification: 'transactional',
              templateKey: rendered.templateKey,
              sourcePath: '/api/webhooks/vipps',
              orderId: order.id,
            });
          }
        } catch (emailError) {
          logError('vipps-webhook-deposit-email', emailError);
        }
      }
      // Send admin notification email
      const adminEmail = process.env.EMAIL_FROM || 'post@tinglum.com';
      if (order && adminEmail) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'https://tinglumgard.no';
          let templateKey = 'admin.order.deposit.confirmed.pig';
          let entityScope: 'order' | 'egg_order' | 'chicken_order' = 'order';
          let variables: Record<string, unknown>;

          if (isEggPayment) {
            templateKey = 'admin.order.deposit.confirmed.egg';
            entityScope = 'egg_order';
            const baseQuantity = eggSummary?.baseQuantity ?? Number(order.quantity || 0);
            const additionsQuantity = eggSummary?.additionsQuantity ?? 0;
            const totalQuantity = eggSummary?.totalQuantity ?? Number(order.quantity || 0);
            variables = {
              order_number: order.order_number,
              customer_name: order.customer_name || 'Kunde',
              customer_email: order.customer_email || '',
              customer_phone: order.customer_phone || 'Ikke oppgitt',
              breed_name: eggBreedName || order.breed_name || 'Rugeegg',
              week_number: order.week_number,
              delivery_date: new Date(`${order.delivery_monday}T00:00:00`).toLocaleDateString('nb-NO'),
              base_quantity: baseQuantity,
              additions_quantity: additionsQuantity,
              total_quantity: totalQuantity,
              additions_html: eggAdditionsHtml,
              price_per_egg_nok: formatOreToNokWithPrefix(order.price_per_egg),
              delivery_method_label: getEggDeliveryLabel(String(order.delivery_method || '')),
              deposit_amount_nok: formatOreToNokWithPrefix(order.deposit_amount),
              remainder_amount_nok: formatOreToNokWithPrefix(order.remainder_amount),
              total_amount_nok: formatOreToNokWithPrefix(order.total_amount),
              order_url: buildAdminUrl(appUrl, 'egg_order', String(order.id)),
            };
          } else if (isChickenPayment) {
            templateKey = 'admin.order.deposit.confirmed.chicken';
            entityScope = 'chicken_order';
            const chickenSummary = summarizeChickenOrderLines(order);
            const chickenBreedWithAgeNo = buildChickenBreedAgeLabel(chickenSummary.lines, 'no');
            const chickenBreedWithAgeEn = buildChickenBreedAgeLabel(chickenSummary.lines, 'en');
            variables = {
              order_number: order.order_number,
              customer_name: order.customer_name || 'Kunde',
              customer_email: order.customer_email || '',
              customer_phone: order.customer_phone || 'Ikke oppgitt',
              breed_name: chickenBreedWithAgeNo || chickenSummary.breedLabel || 'Kyllinger',
              breed_name_en: chickenBreedWithAgeEn || chickenSummary.breedLabel || 'Chickens',
              breed_name_plain: chickenSummary.breedLabel || 'Kyllinger',
              quantity_hens: chickenSummary.hens,
              quantity_roosters: chickenSummary.roosters,
              total_birds_label: buildTotalBirdsLabel(chickenSummary.hens, chickenSummary.roosters, 'no'),
              total_birds_label_en: buildTotalBirdsLabel(chickenSummary.hens, chickenSummary.roosters, 'en'),
              order_lines_html: buildChickenOrderLinesHtml(chickenSummary.lines, 'no', { deliveryFeeNok: Number(order.delivery_fee_nok || 0), deliveryLabel: getChickenDeliveryLabel(String(order.delivery_method || '')) }),
              order_lines_html_en: buildChickenOrderLinesHtml(chickenSummary.lines, 'en', { deliveryFeeNok: Number(order.delivery_fee_nok || 0), deliveryLabel: getChickenDeliveryLabel(String(order.delivery_method || '')) }),
              pickup_week: order.pickup_week,
              pickup_date: new Date(`${order.pickup_monday}T00:00:00`).toLocaleDateString('nb-NO'),
              deposit_amount_nok: formatNok(order.deposit_amount_nok),
              remainder_amount_nok: formatNok(order.remainder_amount_nok),
              total_amount_nok: formatNok(order.total_amount_nok),
              order_url: buildAdminUrl(appUrl, 'chicken_order', String(order.id)),
            };
          } else {
            const discountAmount = order.referral_discount_amount || order.rebate_discount_amount || 0;
            const displayBoxName = order.mangalitsa_preset?.name_no || order.mangalitsa_preset?.name_en || null;
            const boxDisplay = displayBoxName || 'Mangalitsa-boks';
            variables = {
              order_number: order.order_number,
              customer_name: order.customer_name || 'Kunde',
              customer_email: order.customer_email || '',
              customer_phone: order.customer_phone || 'Ikke oppgitt',
              box_label: boxDisplay,
              ribbe_choice: order.ribbe_choice || 'Ikke valgt',
              delivery_label: getPigDeliveryLabel(String(order.delivery_type || '')),
              extras_html: buildPigExtrasHtml(order.extra_products || []),
              discount_amount_nok: formatNok(discountAmount),
              deposit_amount_nok: formatNok(order.deposit_amount),
              remainder_amount_nok: formatNok(order.remainder_amount),
              total_amount_nok: formatNok(order.total_amount),
              order_url: buildAdminUrl(appUrl, 'order', String(order.id)),
            };
          }

          const rendered = await renderManagedTemplate({
            templateKey,
            locale: 'no',
            variables,
          });

          if (!rendered) {
            throw new Error(`Missing template ${templateKey}`);
          }

          await dispatchEmail({
            to: adminEmail,
            subject: rendered.subject,
            html: rendered.html,
            classification: 'system',
            templateKey: rendered.templateKey,
            sourcePath: '/api/webhooks/vipps',
            metadata: {
              payment_type: resolvedPayment.payment_type,
              order_number: order.order_number,
            },
            ...(entityScope === 'order'
              ? { orderId: order.id }
              : entityScope === 'egg_order'
                ? { eggOrderId: order.id }
                : { chickenOrderId: order.id }),
          });
        } catch (emailError) {
          logError('vipps-webhook-admin-notification', emailError);
        }
      }
    }
    // If remainder completed, check if order is now fully paid or still has outstanding balance
    if (resolvedPayment.payment_type === "remainder") {
      const remainderOrderTable = isChickenPayment ? "chicken_orders" : isEggPayment ? "egg_orders" : "orders";
      const remainderOrderId = isChickenPayment ? resolvedPayment.chicken_order_id : isEggPayment ? resolvedPayment.egg_order_id : resolvedPayment.order_id;
      const paymentTable = isChickenPayment ? "chicken_payments" : isEggPayment ? "egg_payments" : "payments";
      const orderFk = isChickenPayment ? "chicken_order_id" : isEggPayment ? "egg_order_id" : "order_id";

      // Sum all completed payments to determine if order is actually fully paid
      const { data: allPayments } = await supabaseAdmin
        .from(paymentTable)
        .select('amount_nok, payment_type, status')
        .eq(orderFk, remainderOrderId)
        .eq('status', 'completed');

      const totalPaidOre = (allPayments || []).reduce((sum, p) => sum + Math.round((p.amount_nok || 0) * 100), 0);
      const totalAmountOre = isChickenPayment
        ? Math.round(Number(order?.total_amount_nok || 0) * 100)
        : Number(order?.total_amount || 0);
      const isActuallyFullyPaid = totalPaidOre >= totalAmountOre;

      const paidStatus = isChickenPayment ? "fully_paid" : isEggPayment ? "fully_paid" : "paid";
      const remainderStatus = isActuallyFullyPaid ? paidStatus : 'deposit_paid';
      console.log(`Remainder payment: totalPaid=${totalPaidOre} øre, totalAmount=${totalAmountOre} øre, status=${remainderStatus}`);

      const { error: orderErr } = await supabaseAdmin
        .from(remainderOrderTable)
        .update({ status: remainderStatus })
        .eq("id", remainderOrderId);

      if (orderErr) {
        logError('vipps-webhook-order-update-failed', orderErr);
        throw orderErr;
      }

      console.log('Order status updated to paid');

      if (isEggPayment && remainderStatus === 'fully_paid') {
        try {
          await reconcileEggPaymentDependentFlowInstances(String(remainderOrderId), 'order_fully_paid');
        } catch (cleanupError) {
          logError('vipps-webhook-egg-flow-cleanup', cleanupError, {
            orderId: String(remainderOrderId),
          });
        }
      }

      const customerEmailForSend = normalizeEmail(order?.customer_email);
      if (order && customerEmailForSend && customerEmailForSend !== 'pending@vipps.no') {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'https://tinglumgard.no';

          if (isEggPayment) {
            const baseQuantity = eggSummary?.baseQuantity ?? Number(order.quantity || 0);
            const additionsQuantity = eggSummary?.additionsQuantity ?? 0;
            const totalQuantity = eggSummary?.totalQuantity ?? baseQuantity;
            const rendered = await renderManagedTemplate({
              templateKey: 'egg.order.remainder.paid.customer',
              locale: 'no',
              variables: {
                customer_name: order.customer_name || 'Kunde',
                order_number: order.order_number,
                base_quantity: baseQuantity,
                additions_quantity: additionsQuantity,
                total_quantity: totalQuantity,
                additions_html: eggAdditionsHtml,
                total_amount_nok: formatOreToNokWithPrefix(order.total_amount),
                remainder_amount_nok: formatOreToNokWithPrefix(order.remainder_amount),
                order_url: buildOrderUrl(appUrl, 'egg_order', order.id),
              },
            });

            if (!rendered) {
              throw new Error('Missing template egg.order.remainder.paid.customer');
            }
            await dispatchEmail({
              to: customerEmailForSend,
              subject: rendered.subject,
              html: rendered.html,
              classification: 'transactional',
              templateKey: rendered.templateKey,
              sourcePath: '/api/webhooks/vipps',
              eggOrderId: order.id,
            });
          } else if (isChickenPayment) {
            const rendered = await renderManagedTemplate({
              templateKey: 'chicken.order.remainder.paid.customer',
              locale: 'no',
              variables: {
                customer_name: order.customer_name || 'Kunde',
                order_number: order.order_number,
                total_amount_nok: formatNok(order.total_amount_nok),
                pickup_date: new Date(`${order.pickup_monday}T00:00:00`).toLocaleDateString('nb-NO'),
                order_url: buildOrderUrl(appUrl, 'chicken_order', order.id),
              },
            });

            if (!rendered) {
              throw new Error('Missing template chicken.order.remainder.paid.customer');
            }
            await dispatchEmail({
              to: customerEmailForSend,
              subject: rendered.subject,
              html: rendered.html,
              classification: 'transactional',
              templateKey: rendered.templateKey,
              sourcePath: '/api/webhooks/vipps',
              chickenOrderId: order.id,
            });
          } else {
            const displayBoxWeight = order.box_size || order.mangalitsa_preset?.target_weight_kg || 0;
            const displayBoxName = order.mangalitsa_preset?.name_no || order.mangalitsa_preset?.name_en || null;
            const boxDisplay = displayBoxName
              ? `${displayBoxName} (${displayBoxWeight}kg)`
              : `${displayBoxWeight}kg`;

            const rendered = await renderManagedTemplate({
              templateKey: 'pig.order.remainder.paid.customer',
              locale: 'no',
              variables: {
                customer_name: order.customer_name || 'Kunde',
                order_number: order.order_number,
                box_label: boxDisplay,
                delivery_label: getPigDeliveryLabel(String(order.delivery_type || '')),
                total_amount_nok: formatNok(order.total_amount),
                order_url: buildOrderUrl(appUrl, 'order', order.id),
              },
            });

            if (!rendered) {
              throw new Error('Missing template pig.order.remainder.paid.customer');
            }
            await dispatchEmail({
              to: customerEmailForSend,
              subject: rendered.subject,
              html: rendered.html,
              classification: 'transactional',
              templateKey: rendered.templateKey,
              sourcePath: '/api/webhooks/vipps',
              orderId: order.id,
            });
          }
        } catch (emailError) {
          logError('vipps-webhook-remainder-email', emailError);
        }
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    logError('vipps-webhook-main', error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
