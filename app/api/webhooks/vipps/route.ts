// app/api/webhooks/vipps/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

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

    // If deposit completed, update order status
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
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Vipps webhook error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
