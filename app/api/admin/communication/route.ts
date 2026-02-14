import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";

type FlowTemplate = {
  id?: string;
  slug: string;
  product_type: "mangalitsa" | "eggs";
  flow_stage: string;
  name_no: string;
  name_en: string;
  subject_no: string;
  subject_en: string;
  body_no: string;
  body_en: string;
  channel?: "email";
  trigger_event?: string | null;
  send_offset_days?: number;
  active?: boolean;
  display_order?: number;
};

const DEFAULT_FLOW_TEMPLATES: FlowTemplate[] = [
  {
    slug: "mangalitsa-order-confirmation",
    product_type: "mangalitsa",
    flow_stage: "order_confirmation",
    name_no: "Mangalitsa: Ordrebekreftelse",
    name_en: "Mangalitsa: Order confirmation",
    subject_no: "Ordrebekreftelse {ORDER_NUMBER}",
    subject_en: "Order confirmation {ORDER_NUMBER}",
    body_no:
      "<p>Hei {CUSTOMER_NAME},</p><p>Takk for bestillingen av Mangalitsa-boks. Vi har registrert ordren din ({ORDER_NUMBER}).</p><p>Du får neste oppdatering når sesongen skrider frem.</p>",
    body_en:
      "<p>Hi {CUSTOMER_NAME},</p><p>Thanks for your Mangalitsa box order. We have registered your order ({ORDER_NUMBER}).</p><p>You will receive the next update as the season progresses.</p>",
    channel: "email",
    trigger_event: "order_created",
    send_offset_days: 0,
    active: true,
    display_order: 10,
  },
  {
    slug: "mangalitsa-mid-season-update",
    product_type: "mangalitsa",
    flow_stage: "mid_season_update",
    name_no: "Mangalitsa: Midt i sesongen",
    name_en: "Mangalitsa: Mid-season update",
    subject_no: "Statusoppdatering for {ORDER_NUMBER}",
    subject_en: "Season update for {ORDER_NUMBER}",
    body_no:
      "<p>Hei {CUSTOMER_NAME},</p><p>En kort oppdatering: grisene vokser godt, og vi følger planen for sesongen.</p><p>Vi sender ny melding nær slakting og levering.</p>",
    body_en:
      "<p>Hi {CUSTOMER_NAME},</p><p>A short update: the pigs are growing well and we are on plan for the season.</p><p>We will send another message closer to slaughter and delivery.</p>",
    channel: "email",
    trigger_event: "season_midpoint",
    send_offset_days: 0,
    active: true,
    display_order: 20,
  },
  {
    slug: "mangalitsa-slaughter-week",
    product_type: "mangalitsa",
    flow_stage: "slaughter_week_notice",
    name_no: "Mangalitsa: Slakteuke",
    name_en: "Mangalitsa: Slaughter week",
    subject_no: "Slakteuke nærmer seg for {ORDER_NUMBER}",
    subject_en: "Slaughter week approaching for {ORDER_NUMBER}",
    body_no:
      "<p>Hei {CUSTOMER_NAME},</p><p>Vi går inn i slakteuke for din bestilling ({ORDER_NUMBER}).</p><p>Du får informasjon om betaling av restbeløp og levering i neste oppdatering.</p>",
    body_en:
      "<p>Hi {CUSTOMER_NAME},</p><p>We are entering slaughter week for your order ({ORDER_NUMBER}).</p><p>You will receive remainder payment and delivery details in the next update.</p>",
    channel: "email",
    trigger_event: "slaughter_week",
    send_offset_days: 0,
    active: true,
    display_order: 30,
  },
  {
    slug: "mangalitsa-delivery-scheduling",
    product_type: "mangalitsa",
    flow_stage: "delivery_scheduling",
    name_no: "Mangalitsa: Leveringsplanlegging",
    name_en: "Mangalitsa: Delivery scheduling",
    subject_no: "Planlegg levering for {ORDER_NUMBER}",
    subject_en: "Schedule delivery for {ORDER_NUMBER}",
    body_no:
      "<p>Hei {CUSTOMER_NAME},</p><p>Nå planlegger vi levering/henting for ordren din ({ORDER_NUMBER}).</p><p>Logg inn på Min side for å bekrefte detaljer og eventuelle ekstra produkter.</p>",
    body_en:
      "<p>Hi {CUSTOMER_NAME},</p><p>We are now planning delivery/pickup for your order ({ORDER_NUMBER}).</p><p>Please sign in to My page to confirm details and any extra products.</p>",
    channel: "email",
    trigger_event: "delivery_window_open",
    send_offset_days: 0,
    active: true,
    display_order: 40,
  },
  {
    slug: "mangalitsa-feedback-request",
    product_type: "mangalitsa",
    flow_stage: "post_delivery_feedback",
    name_no: "Mangalitsa: Hvordan var opplevelsen?",
    name_en: "Mangalitsa: How was it?",
    subject_no: "Hvordan var Mangalitsa-boksen din?",
    subject_en: "How was your Mangalitsa box?",
    body_no:
      "<p>Hei {CUSTOMER_NAME},</p><p>Takk for bestillingen. Vi vil gjerne høre hvordan opplevelsen var.</p><p>Send oss gjerne en kort tilbakemelding på smak, levering og totalopplevelse.</p>",
    body_en:
      "<p>Hi {CUSTOMER_NAME},</p><p>Thanks for your order. We would love to hear how your experience was.</p><p>Please share quick feedback on taste, delivery, and overall experience.</p>",
    channel: "email",
    trigger_event: "post_delivery",
    send_offset_days: 3,
    active: true,
    display_order: 50,
  },
  {
    slug: "eggs-order-confirmation",
    product_type: "eggs",
    flow_stage: "order_confirmation",
    name_no: "Egg: Ordrebekreftelse",
    name_en: "Eggs: Order confirmation",
    subject_no: "Ordrebekreftelse rugeegg {ORDER_NUMBER}",
    subject_en: "Hatching eggs order confirmation {ORDER_NUMBER}",
    body_no:
      "<p>Hei {CUSTOMER_NAME},</p><p>Vi har registrert bestillingen din ({ORDER_NUMBER}) for rugeegg.</p><p>Du får oppdatering når forsendelsen nærmer seg.</p>",
    body_en:
      "<p>Hi {CUSTOMER_NAME},</p><p>We have registered your hatching eggs order ({ORDER_NUMBER}).</p><p>You will receive updates as shipment approaches.</p>",
    channel: "email",
    trigger_event: "order_created",
    send_offset_days: 0,
    active: true,
    display_order: 110,
  },
  {
    slug: "eggs-mid-season-update",
    product_type: "eggs",
    flow_stage: "mid_season_update",
    name_no: "Egg: Midt i sesongen",
    name_en: "Eggs: Mid-season update",
    subject_no: "Status på rugeegg-sesongen",
    subject_en: "Hatching season status update",
    body_no:
      "<p>Hei {CUSTOMER_NAME},</p><p>En kort oppdatering fra gården: vi følger plan for klekking og forsendelser.</p><p>Du får detaljert melding nær utsendelse.</p>",
    body_en:
      "<p>Hi {CUSTOMER_NAME},</p><p>A short update from the farm: we are on track for hatching and shipment weeks.</p><p>You will receive detailed information closer to shipping.</p>",
    channel: "email",
    trigger_event: "season_midpoint",
    send_offset_days: 0,
    active: true,
    display_order: 120,
  },
  {
    slug: "eggs-slaughter-week",
    product_type: "eggs",
    flow_stage: "packing_week_notice",
    name_no: "Egg: Pakkeuke nærmer seg",
    name_en: "Eggs: Packing week approaching",
    subject_no: "Pakking av rugeegg for {ORDER_NUMBER}",
    subject_en: "Packing hatching eggs for {ORDER_NUMBER}",
    body_no:
      "<p>Hei {CUSTOMER_NAME},</p><p>Vi går inn i pakkeuke for ordren din ({ORDER_NUMBER}).</p><p>Du får oppdatert melding når pakken er klar til utsendelse.</p>",
    body_en:
      "<p>Hi {CUSTOMER_NAME},</p><p>We are entering packing week for your order ({ORDER_NUMBER}).</p><p>You will get another update when shipment is ready.</p>",
    channel: "email",
    trigger_event: "packing_week",
    send_offset_days: 0,
    active: true,
    display_order: 130,
  },
  {
    slug: "eggs-delivery-scheduling",
    product_type: "eggs",
    flow_stage: "delivery_scheduling",
    name_no: "Egg: Leveringsplanlegging",
    name_en: "Eggs: Delivery scheduling",
    subject_no: "Leveringsdetaljer for {ORDER_NUMBER}",
    subject_en: "Delivery details for {ORDER_NUMBER}",
    body_no:
      "<p>Hei {CUSTOMER_NAME},</p><p>Nå planlegger vi utsendelse av ordren din ({ORDER_NUMBER}).</p><p>Kontroller kontaktinformasjon og leveringsdetaljer på Min side.</p>",
    body_en:
      "<p>Hi {CUSTOMER_NAME},</p><p>We are now scheduling shipment for your order ({ORDER_NUMBER}).</p><p>Please verify contact and delivery details on My page.</p>",
    channel: "email",
    trigger_event: "shipment_window_open",
    send_offset_days: 0,
    active: true,
    display_order: 140,
  },
  {
    slug: "eggs-feedback-request",
    product_type: "eggs",
    flow_stage: "post_delivery_feedback",
    name_no: "Egg: Hvordan gikk klekkingen?",
    name_en: "Eggs: How did hatching go?",
    subject_no: "Tilbakemelding på rugeegg-batch",
    subject_en: "Feedback on your hatching eggs batch",
    body_no:
      "<p>Hei {CUSTOMER_NAME},</p><p>Takk for bestillingen av rugeegg.</p><p>Vi setter stor pris på tilbakemelding om klekkingsresultat og levering.</p>",
    body_en:
      "<p>Hi {CUSTOMER_NAME},</p><p>Thank you for ordering hatching eggs.</p><p>We would greatly appreciate feedback on hatch rate and delivery quality.</p>",
    channel: "email",
    trigger_event: "post_delivery",
    send_offset_days: 3,
    active: true,
    display_order: 150,
  },
];

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case "send_individual":
        return await sendIndividualEmail(data.orderId, data.subject, data.message);
      case "send_bulk":
        return await sendBulkEmail(data.orderIds, data.subject, data.message);
      case "send_to_all":
        return await sendToAllCustomers(data.subject, data.message, data.filter);
      case "get_templates":
        return await getLegacyTemplates();
      case "get_flow_templates":
        return await getFlowTemplates();
      case "save_flow_template":
        return await saveFlowTemplate(data.template);
      case "get_history":
        return await getEmailHistory(data.orderId);
      case "get_all_history":
        return await getAllEmailHistory();
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Communication error:", error);
    return NextResponse.json(
      { error: "Communication operation failed" },
      { status: 500 }
    );
  }
}

async function getFlowTemplates() {
  const { data, error } = await supabaseAdmin
    .from("communication_flow_templates")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    // Fallback when migration is not applied yet.
    return NextResponse.json({ templates: DEFAULT_FLOW_TEMPLATES, fallback: true });
  }

  return NextResponse.json({ templates: data || [] });
}

async function getLegacyTemplates() {
  const response = await getFlowTemplates();
  const payload = await response.json();
  const templates = (payload.templates || []).map((template: FlowTemplate) => ({
    id: template.slug,
    name: template.name_no,
    subject: template.subject_no,
    message: template.body_no,
    product_type: template.product_type,
    flow_stage: template.flow_stage,
  }));
  return NextResponse.json({ templates, fallback: payload.fallback || false });
}

async function saveFlowTemplate(template: FlowTemplate) {
  if (!template?.slug) {
    return NextResponse.json({ error: "Template slug is required" }, { status: 400 });
  }

  const payload = {
    slug: template.slug,
    product_type: template.product_type,
    flow_stage: template.flow_stage,
    name_no: template.name_no,
    name_en: template.name_en,
    subject_no: template.subject_no,
    subject_en: template.subject_en,
    body_no: template.body_no,
    body_en: template.body_en,
    channel: template.channel || "email",
    trigger_event: template.trigger_event || null,
    send_offset_days: template.send_offset_days || 0,
    active: template.active ?? true,
    display_order: template.display_order ?? 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("communication_flow_templates")
    .upsert(payload, { onConflict: "slug" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error:
          "Could not save template. Ensure migration for communication_flow_templates is applied.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ template: data });
}

async function sendIndividualEmail(orderId: string, subject: string, message: string) {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("customer_name, customer_email, order_number")
    .eq("id", orderId)
    .single();

  if (error) throw error;

  if (!order.customer_email || order.customer_email === "pending@vipps.no") {
    return NextResponse.json({ error: "No valid email address" }, { status: 400 });
  }

  await sendEmail({
    to: order.customer_email,
    subject: subject.replace("{ORDER_NUMBER}", order.order_number),
    html: buildEmailHTML(order.customer_name, message, order.order_number),
  });

  await supabaseAdmin.from("email_log").insert({
    order_id: orderId,
    recipient: order.customer_email,
    subject,
    message,
    sent_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}

async function sendBulkEmail(orderIds: string[], subject: string, message: string) {
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("id, customer_name, customer_email, order_number")
    .in("id", orderIds);

  if (error) throw error;

  const results = [];
  for (const order of orders || []) {
    if (!order.customer_email || order.customer_email === "pending@vipps.no") continue;
    try {
      await sendEmail({
        to: order.customer_email,
        subject: subject.replace("{ORDER_NUMBER}", order.order_number),
        html: buildEmailHTML(order.customer_name, message, order.order_number),
      });

      await supabaseAdmin.from("email_log").insert({
        order_id: order.id,
        recipient: order.customer_email,
        subject,
        message,
        sent_at: new Date().toISOString(),
      });

      results.push({ order_number: order.order_number, success: true });
    } catch (emailError) {
      console.error(`Failed to send email to ${order.customer_email}:`, emailError);
      results.push({ order_number: order.order_number, success: false, error: emailError });
    }
  }

  return NextResponse.json({
    success: true,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}

async function sendToAllCustomers(
  subject: string,
  message: string,
  filter?: { status?: string }
) {
  let query = supabaseAdmin
    .from("orders")
    .select("id, customer_name, customer_email, order_number, status");

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }

  const { data: orders, error } = await query;
  if (error) throw error;

  const validOrders = (orders || []).filter(
    (order: any) => order.customer_email && order.customer_email !== "pending@vipps.no"
  );

  const uniqueEmails = new Map<string, any>();
  validOrders.forEach((order: any) => {
    if (!uniqueEmails.has(order.customer_email)) {
      uniqueEmails.set(order.customer_email, order);
    }
  });

  const results = [];
  for (const [email, order] of Array.from(uniqueEmails.entries())) {
    try {
      await sendEmail({
        to: email,
        subject: subject.replace("{ORDER_NUMBER}", order.order_number),
        html: buildEmailHTML(order.customer_name, message, order.order_number),
      });

      await supabaseAdmin.from("email_log").insert({
        order_id: order.id,
        recipient: email,
        subject,
        message,
        sent_at: new Date().toISOString(),
      });

      results.push({ email, success: true });
    } catch (emailError) {
      console.error(`Failed to send email to ${email}:`, emailError);
      results.push({ email, success: false, error: emailError });
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return NextResponse.json({
    success: true,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    total_customers: uniqueEmails.size,
    results,
  });
}

async function getEmailHistory(orderId: string) {
  const { data: history, error } = await supabaseAdmin
    .from("email_log")
    .select("*")
    .eq("order_id", orderId)
    .order("sent_at", { ascending: false });

  if (error) {
    console.error("Error fetching email history:", error);
    return NextResponse.json({ history: [] });
  }

  return NextResponse.json({ history: history || [] });
}

async function getAllEmailHistory() {
  const { data: history, error } = await supabaseAdmin
    .from("email_log")
    .select(
      `
      *,
      orders (
        order_number,
        customer_name,
        status
      )
    `
    )
    .order("sent_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching all email history:", error);
    return NextResponse.json({ history: [] });
  }

  return NextResponse.json({ history: history || [] });
}

function buildEmailHTML(customerName: string, message: string, orderNumber: string): string {
  const personalizedMessage = message
    .replace(/{CUSTOMER_NAME}/g, customerName)
    .replace(/{ORDER_NUMBER}/g, orderNumber);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C1810; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tinglum Gård</h1>
    </div>
    <div class="content">
      ${personalizedMessage}
      <p style="margin-top: 30px;">Vennlig hilsen,<br><strong>Tinglum Gård</strong></p>
    </div>
    <div class="footer">
      <p>Tinglum Gård</p>
    </div>
  </div>
</body>
</html>
  `;
}
