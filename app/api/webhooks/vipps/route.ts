// app/api/webhooks/vipps/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

    const ok = verifyVippsWebhookHmac(request, bodyText);
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = JSON.parse(bodyText) as {
      orderId?: string;
      reference?: string;
      sessionId?: string;
      merchantSerialNumber?: string;
      eventType?: string;
      [k: string]: unknown;
    };

    // Your system stores the Vipps checkout session id on payments.vipps_payment_id
    // The webhook payload shape depends on the event type you subscribed to.
    // Use the most reliable identifier you have in your own records.
    const vippsId =
      (payload.sessionId as string | undefined) ||
      (payload.reference as string | undefined);

    if (!vippsId) {
      return NextResponse.json(
        { error: "Missing vipps identifier" },
        { status: 400 }
      );
    }

    // Find payment row by vipps_payment_id
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("vipps_payment_id", vippsId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // You may want to map eventType to payment status.
    // For now, mark as "completed" when we receive a webhook, adjust if you store more states.
    const { error: updErr } = await supabaseAdmin
      .from("payments")
      .update({ status: "completed" })
      .eq("id", payment.id);

    if (updErr) throw updErr;

    // If deposit completed, update order status
    if (payment.type === "deposit") {
      const { error: orderErr } = await supabaseAdmin
        .from("orders")
        .update({ status: "deposit_paid" })
        .eq("id", payment.order_id);

      if (orderErr) throw orderErr;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Vipps webhook error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
