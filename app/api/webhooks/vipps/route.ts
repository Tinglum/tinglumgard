// app/api/webhooks/vipps/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";

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

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    console.log('Vipps webhook received:', bodyText);
    console.log('Webhook headers:', {
      authorization: request.headers.get('authorization'),
      callbackAuthToken: request.headers.get('X-Vipps-Callback-Auth-Token'),
    });

    // Vipps Checkout v3 uses callbackAuthorizationToken instead of HMAC
    // For now, we'll accept all webhooks and add proper verification later
    // TODO: Verify callbackAuthorizationToken matches what we sent

    const payload = JSON.parse(bodyText) as {
      orderId?: string;
      reference?: string;
      sessionId?: string;
      merchantSerialNumber?: string;
      eventType?: string;
      [k: string]: unknown;
    };

    console.log('Webhook payload:', payload);

    // Try to find payment by session ID or reference
    const vippsId =
      (payload.sessionId as string | undefined) ||
      (payload.reference as string | undefined);

    if (!vippsId) {
      console.error('Missing vipps identifier in webhook');
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

    if (paymentError || !payment) {
      console.error('Payment not found:', paymentError);
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    console.log('Found payment:', payment.id, 'type:', payment.payment_type);

    // Mark payment as completed
    const { error: updErr } = await supabaseAdmin
      .from("payments")
      .update({ status: "completed" })
      .eq("id", payment.id);

    if (updErr) {
      console.error('Failed to update payment:', updErr);
      throw updErr;
    }

    console.log('Payment marked as completed');

    // Fetch the order details for email notification
    const { data: order, error: orderFetchErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", payment.order_id)
      .single();

    if (orderFetchErr || !order) {
      console.error('Failed to fetch order for email:', orderFetchErr);
    }

    // If deposit completed, update order status and send confirmation email
    if (payment.payment_type === "deposit") {
      console.log('Updating order status to deposit_paid');
      const { error: orderErr } = await supabaseAdmin
        .from("orders")
        .update({ status: "deposit_paid" })
        .eq("id", payment.order_id);

      if (orderErr) {
        console.error('Failed to update order:', orderErr);
        throw orderErr;
      }

      console.log('Order status updated successfully');

      // Send deposit confirmation email
      if (order && order.customer_email && order.customer_email !== 'pending@vipps.no') {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no';
          const depositConfirmationHtml = `
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
    .button { display: inline-block; background: #2C1810; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Tinglum Gård</h1></div>
    <div class="content">
      <h2>Depositum bekreftet! ✓</h2>
      <p>Hei ${order.customer_name},</p>
      <p>Vi har mottatt depositum for din bestilling <strong>${order.order_number}</strong>.</p>
      <div class="amount">Depositum betalt: kr ${payment.amount_nok.toLocaleString('nb-NO')}</div>
      <p>Din ${order.box_size}kg griskasse er nå reservert!</p>
      <p><strong>Hva skjer videre?</strong></p>
      <ul>
        <li>Du vil motta en påminnelse om restbetaling (kr ${order.remainder_amount.toLocaleString('nb-NO')}) ca. 2 uker før henting</li>
        <li>Du kan se og administrere din bestilling på <a href="${appUrl}/min-side">Min Side</a></li>
        <li>Vi sender beskjed når bestillingen din er klar for henting</li>
      </ul>
      <p>Vennlig hilsen,<br>Tinglum Gård</p>
    </div>
  </div>
</body>
</html>
          `;

          await sendEmail({
            to: order.customer_email,
            subject: `Depositum bekreftet - ${order.order_number}`,
            html: depositConfirmationHtml,
          });

          console.log('Deposit confirmation email sent to:', order.customer_email);
        } catch (emailError) {
          console.error('Failed to send deposit confirmation email:', emailError);
          // Don't fail the webhook if email fails
        }
      }
    }

    // If remainder completed, update order status and send confirmation email
    if (payment.payment_type === "remainder") {
      console.log('Updating order status to paid');
      const { error: orderErr } = await supabaseAdmin
        .from("orders")
        .update({ status: "paid" })
        .eq("id", payment.order_id);

      if (orderErr) {
        console.error('Failed to update order:', orderErr);
        throw orderErr;
      }

      console.log('Order status updated to paid');

      // Send remainder confirmation email
      if (order && order.customer_email && order.customer_email !== 'pending@vipps.no') {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no';
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
      <p>Din ${order.box_size}kg griskasse er nå fullstendig betalt!</p>
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
          console.error('Failed to send remainder confirmation email:', emailError);
          // Don't fail the webhook if email fails
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Vipps webhook error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
