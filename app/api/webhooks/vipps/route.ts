// app/api/webhooks/vipps/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";
import { getAdminEggOrderNotificationTemplate, getAdminOrderNotificationTemplate } from "@/lib/email/templates";
import { logError } from "@/lib/logger";

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

    if (!resolvedPayment) {
      logError('vipps-webhook-payment-not-found', paymentError);
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    console.log('Found payment:', resolvedPayment.id, 'type:', resolvedPayment.payment_type, 'egg:', isEggPayment);

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

    // Mark payment as completed with timestamp
    const { error: updErr } = await supabaseAdmin
      .from(isEggPayment ? "egg_payments" : "payments")
      .update({ 
        status: "completed",
        paid_at: new Date().toISOString()
      })
      .eq("id", resolvedPayment.id);

    if (updErr) {
      logError('vipps-webhook-payment-update-failed', updErr);
      throw updErr;
    }

    console.log('Payment marked as completed with timestamp');

    // Fetch the order details for email notification
    let order: any = null;
    let orderFetchErr: any = null;
    let eggBreedName: string | null = null;

    if (isEggPayment) {
      const result = await supabaseAdmin
        .from("egg_orders")
        .select("*")
        .eq("id", resolvedPayment.egg_order_id)
        .single();
      order = result.data;
      orderFetchErr = result.error;

      if (order?.breed_id) {
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

    // If deposit completed, update order status and send confirmation email
    if (resolvedPayment.payment_type === "deposit") {
      console.log('Updating order status to deposit_paid');
      const { error: orderErr } = await supabaseAdmin
        .from(isEggPayment ? "egg_orders" : "orders")
        .update({ status: "deposit_paid" })
        .eq("id", isEggPayment ? resolvedPayment.egg_order_id : resolvedPayment.order_id);

      if (orderErr) {
        logError('vipps-webhook-order-update-failed', orderErr);
        throw orderErr;
      }

      console.log('Order status updated successfully');

      if (isEggPayment && order && order.customer_email && order.customer_email !== 'pending@vipps.no') {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no';
          const breedName = eggBreedName || order.breed_name || 'Rugeegg';
          const totalNok = Math.round(order.total_amount / 100).toLocaleString('nb-NO');
          const depositNok = Math.round(order.deposit_amount / 100).toLocaleString('nb-NO');
          const remainderNok = Math.round(order.remainder_amount / 100).toLocaleString('nb-NO');

          const eggConfirmationHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1f2937; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
    .success { color: #16a34a; font-size: 22px; font-weight: bold; margin: 20px 0; }
    .order-details { background: #f8fafc; padding: 18px; border-radius: 8px; margin: 20px 0; }
    .amount { font-size: 18px; font-weight: 700; color: #111827; margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Tinglum Gård</h1></div>
    <div class="content">
      <div class="success">Bestilling bekreftet!</div>
      <p>Hei ${order.customer_name},</p>
      <p>Takk for din bestilling. Betalingen er mottatt og rugeeggene er reservert.</p>
      <div class="order-details">
        <p><strong>Bestillingsnummer:</strong> ${order.order_number}</p>
        <p><strong>Rase:</strong> ${breedName}</p>
        <p><strong>Uke:</strong> ${order.week_number}</p>
        <p><strong>Antall:</strong> ${order.quantity} egg</p>
      </div>
      <div class="amount">Totalt: kr ${totalNok}</div>
      <div class="amount" style="font-size: 15px;">Forskudd betalt: kr ${depositNok}</div>
      <div class="amount" style="font-size: 15px;">Restbetaling: kr ${remainderNok}</div>
      <p>Du kan se bestillingen din på <a href="${appUrl}/rugeegg/mine-bestillinger">Min side</a>.</p>
      <p>Vennlig hilsen,<br><strong>Tinglum Gård</strong></p>
    </div>
  </div>
</body>
</html>`;

          await sendEmail({
            to: order.customer_email,
            subject: `Bestilling bekreftet - ${order.order_number}`,
            html: eggConfirmationHtml,
          });
        } catch (emailError) {
          logError('vipps-webhook-egg-deposit-email', emailError);
        }
      }

      // Send order confirmation email (after payment is complete)
      if (!isEggPayment && order && order.customer_email && order.customer_email !== 'pending@vipps.no') {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no';
          const displayBoxName = order.mangalitsa_preset?.name_no || order.mangalitsa_preset?.name_en || null;
          const boxDisplay = displayBoxName || 'Mangalitsa-boks';
          
          // Build extras list
          let extrasHtml = '';
          if (order.extra_products && order.extra_products.length > 0) {
            extrasHtml = '<p><strong>Tilleggsprodukter:</strong></p><ul>';
            for (const extra of order.extra_products) {
              extrasHtml += `<li>${extra.name} (${extra.quantity} ${extra.unit_type})</li>`;
            }
            extrasHtml += '</ul>';
          }

          const discountAmount = order.referral_discount_amount || order.rebate_discount_amount || 0;
          const discountLabel = order.referral_discount_amount ? 'Vennerabatt' : 'Rabattkode';
          const discountHtml = discountAmount > 0
            ? `
      <div class="discount-box">
        <strong>${discountLabel}:</strong> -kr ${discountAmount.toLocaleString('nb-NO')}
      </div>`
            : '';

          const orderConfirmationHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C1810; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
    .success { color: #28a745; font-size: 24px; font-weight: bold; margin: 20px 0; }
    .order-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .amount { font-size: 20px; font-weight: 700; color: #2C1810; margin: 10px 0; }
    .discount-box { background: #fff4e5; border-left: 4px solid #f5a623; padding: 12px 16px; margin: 16px 0; border-radius: 6px; }
    .button { display: inline-block; background: #2C1810; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    ul { margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Tinglum Gård</h1></div>
    <div class="content">
      <div class="success">✓ Bestilling bekreftet!</div>
      
      <p>Hei ${order.customer_name},</p>
      
      <p>Takk for din bestilling! Betalingen er mottatt og din griskasse er nå reservert.</p>
      
      <div class="order-details">
        <p><strong>Bestillingsnummer:</strong> ${order.order_number}</p>
        <p><strong>Mangalitsa-boks:</strong> ${boxDisplay}</p>
        <p><strong>Ribbe:</strong> ${order.ribbe_choice}</p>
        <p><strong>Leveringsmåte:</strong> ${order.delivery_type === 'pickup_farm' ? 'Henting på gård' : order.delivery_type === 'pickup_e6' ? 'Henting ved E6' : 'Levering Trondheim'}</p>
        ${extrasHtml}
      </div>

      ${discountHtml}
      <div class="amount">Totalt: kr ${order.total_amount.toLocaleString('nb-NO')}</div>
      <div class="amount" style="font-size: 16px;">Forskudd betalt: kr ${resolvedPayment.amount_nok.toLocaleString('nb-NO')}</div>
      <div class="amount" style="font-size: 16px;">Restbetaling: kr ${order.remainder_amount.toLocaleString('nb-NO')}</div>

      <p><strong>Hva skjer videre?</strong></p>
      <ul>
        <li>Du får påminnelse om restbetaling ca. 2 uker før henting</li>
        <li>Vi sender beskjed når griskassen er klar for henting</li>
        <li>Du kan se din bestilling på <a href="${appUrl}/min-side">Min Side</a></li>
      </ul>

      <p>Har du spørsmål? Send oss en melding på <a href="${appUrl}/min-side">Min Side</a> eller svar på denne e-posten.</p>

      <p>Vennlig hilsen,<br><strong>Tinglum Gård</strong></p>
    </div>
  </div>
</body>
</html>
          `;

          const depositEmailResult = await sendEmail({
            to: order.customer_email,
            subject: `Bestilling bekreftet - ${order.order_number}`,
            html: orderConfirmationHtml,
          });

          if (depositEmailResult.success) {
            console.log('Order confirmation email sent to:', order.customer_email, 'ID:', depositEmailResult.id);
          } else {
            console.error('Failed to send order confirmation email:', depositEmailResult.error);
          }
        } catch (emailError) {
          logError('vipps-webhook-deposit-email', emailError);
          // Don't fail the webhook if email fails
        }
      }

      // Send admin notification email
      const adminEmail = process.env.EMAIL_FROM || 'post@tinglum.com';
      if (order && adminEmail) {
        try {
          const adminNotification = isEggPayment
            ? getAdminEggOrderNotificationTemplate({
                orderNumber: order.order_number,
                customerName: order.customer_name,
                customerEmail: order.customer_email,
                customerPhone: order.customer_phone || 'Ikke oppgitt',
                breedName: eggBreedName || order.breed_name || 'Rugeegg',
                weekNumber: order.week_number,
                deliveryMonday: order.delivery_monday,
                quantity: order.quantity,
                pricePerEgg: order.price_per_egg,
                deliveryMethod: order.delivery_method,
                depositAmount: order.deposit_amount,
                remainderAmount: order.remainder_amount,
                totalAmount: order.total_amount,
              })
            : getAdminOrderNotificationTemplate({
                orderNumber: order.order_number,
                customerName: order.customer_name,
                customerEmail: order.customer_email,
                customerPhone: order.customer_phone || 'Ikke oppgitt',
                boxSize: order.box_size || order.mangalitsa_preset?.target_weight_kg || 0,
                boxName: order.mangalitsa_preset?.name_no || order.mangalitsa_preset?.name_en || undefined,
                deliveryType: order.delivery_type,
                freshDelivery: order.fresh_delivery,
                ribbeChoice: order.ribbe_choice,
                extraProducts: order.extra_products || [],
                depositAmount: order.deposit_amount,
                remainderAmount: order.remainder_amount,
                totalAmount: order.total_amount,
                referralDiscount: order.referral_discount_amount || 0,
                rebateDiscount: order.rebate_discount_amount || 0,
              });

          const emailResult = await sendEmail({
            to: adminEmail,
            subject: adminNotification.subject,
            html: adminNotification.html,
          });

          if (emailResult.success) {
            console.log('Admin notification email sent to:', adminEmail, 'ID:', emailResult.id);
          } else {
            console.error('Failed to send admin notification email:', emailResult.error);
          }
        } catch (emailError) {
          logError('vipps-webhook-admin-notification', emailError);
          // Don't fail the webhook if email fails
        }
      }
    }

    // If remainder completed, update order status and send confirmation email
    if (resolvedPayment.payment_type === "remainder") {
      console.log('Updating order status to paid');
      const { error: orderErr } = await supabaseAdmin
        .from(isEggPayment ? "egg_orders" : "orders")
        .update({ status: isEggPayment ? "fully_paid" : "paid" })
        .eq("id", isEggPayment ? resolvedPayment.egg_order_id : resolvedPayment.order_id);

      if (orderErr) {
        logError('vipps-webhook-order-update-failed', orderErr);
        throw orderErr;
      }

      console.log('Order status updated to paid');

      if (isEggPayment && order && order.customer_email && order.customer_email !== 'pending@vipps.no') {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no';
          const totalNok = Math.round(order.total_amount / 100).toLocaleString('nb-NO');
          const remainderNok = Math.round(order.remainder_amount / 100).toLocaleString('nb-NO');

          const eggRemainderHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1f2937; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
    .amount { font-size: 18px; font-weight: 700; color: #111827; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Tinglum Gård</h1></div>
    <div class="content">
      <h2>Betaling fullført!</h2>
      <p>Hei ${order.customer_name},</p>
      <p>Vi har mottatt restbetalingen for bestilling <strong>${order.order_number}</strong>.</p>
      <div class="amount">Totalt betalt: kr ${totalNok}</div>
      <div class="amount" style="font-size: 15px;">Restbetaling: kr ${remainderNok}</div>
      <p>Du kan se bestillingen din på <a href="${appUrl}/rugeegg/mine-bestillinger">Min side</a>.</p>
      <p>Vennlig hilsen,<br>Tinglum Gård</p>
    </div>
  </div>
</body>
</html>`;

          await sendEmail({
            to: order.customer_email,
            subject: `Betaling fullført - ${order.order_number}`,
            html: eggRemainderHtml,
          });
        } catch (emailError) {
          logError('vipps-webhook-egg-remainder-email', emailError);
        }
      }

      // Send remainder confirmation email
      if (!isEggPayment && order && order.customer_email && order.customer_email !== 'pending@vipps.no') {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no';
          const displayBoxWeight = order.box_size || order.mangalitsa_preset?.target_weight_kg || 0;
          const displayBoxName = order.mangalitsa_preset?.name_no || order.mangalitsa_preset?.name_en || null;
          const boxDisplay = displayBoxName
            ? `${displayBoxName} (${displayBoxWeight}kg)`
            : `${displayBoxWeight}kg`;
          const remainderConfirmationHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C1810; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
    .amount { font-size: 24px; font-weight: 700; color: #2C1810; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Tinglum Gård</h1></div>
    <div class="content">
      <h2>Betaling fullført! ✓</h2>
      <p>Hei ${order.customer_name},</p>
      <p>Vi har mottatt restbetalingen for din bestilling <strong>${order.order_number}</strong>.</p>
      <div class="amount">Totalt betalt: kr ${order.total_amount.toLocaleString('nb-NO')}</div>
      <p>Din ${boxDisplay} er nå fullstendig betalt!</p>
      <p><strong>Hva skjer videre?</strong></p>
      <ul>
        <li>Bestillingen din blir låst ca. 2 uker før henting (ingen flere endringer)</li>
        <li>Vi sender beskjed når bestillingen din er klar for henting</li>
        <li>Du kan se din bestilling på <a href="${appUrl}/min-side">Min Side</a></li>
      </ul>
      <p><strong>Henteinformasjon:</strong></p>
      <p>${
        order.delivery_type === 'pickup_farm' ? 'Henting på gård' :
        order.delivery_type === 'pickup_e6' ? 'Henting ved E6' :
        'Levering i Trondheim'
      }</p>
      <p>Takk for din bestilling!</p>
      <p>Vennlig hilsen,<br>Tinglum Gård</p>
    </div>
  </div>
</body>
</html>
          `;

          await sendEmail({
            to: order.customer_email,
            subject: `Betaling fullført - ${order.order_number}`,
            html: remainderConfirmationHtml,
          });

          console.log('Remainder confirmation email sent to:', order.customer_email);
        } catch (emailError) {
          logError('vipps-webhook-remainder-email', emailError);
          // Don't fail the webhook if email fails
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logError('vipps-webhook-main', error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
