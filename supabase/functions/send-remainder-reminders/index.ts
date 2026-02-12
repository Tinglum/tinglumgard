import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

type ReminderOrder = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  reminder_sent_at: string | null;
  status: string;
  box_size: number | null;
  remainder_amount: number;
  extra_credit_amount_nok?: number | null;
  mangalitsa_preset?: {
    name_no?: string | null;
    target_weight_kg?: number | null;
  } | {
    name_no?: string | null;
    target_weight_kg?: number | null;
  }[] | null;
  payments: Array<{
    payment_type: string;
    status: string;
  }>;
};

type ReminderWeekConfig = {
  week?: number;
  year?: number;
};

function getIsoWeekAndYear(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

function resolvePreset(order: ReminderOrder) {
  if (Array.isArray(order.mangalitsa_preset)) {
    return order.mangalitsa_preset[0] || null;
  }
  return order.mangalitsa_preset || null;
}

function getBoxLabel(order: ReminderOrder): string {
  const preset = resolvePreset(order);
  const name = preset?.name_no || 'Mangalitsa-boks';
  const size = order.box_size || preset?.target_weight_kg || null;

  if (size) {
    return `${name} (${size} kg)`;
  }

  return name;
}

function getRemainderReminderEmail(params: {
  customerName: string;
  orderNumber: string;
  boxLabel: string;
  remainderAmount: number;
  paymentUrl: string;
  dueDateLabel: string;
}) {
  const { customerName, orderNumber, boxLabel, remainderAmount, paymentUrl, dueDateLabel } = params;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a1a; color: white; padding: 30px 20px; text-align: center; }
    .content { background: #ffffff; padding: 30px 20px; }
    .button { display: inline-block; background: #1a1a1a; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    .amount { font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 20px 0; }
    .info-box { background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Tinglum Gard</h1>
    </div>
    <div class="content">
      <h2>Hei ${customerName},</h2>
      <p>Dette er en påminnelse om restbetaling for ordre <strong>${orderNumber}</strong>.</p>
      <p><strong>Produkt:</strong> ${boxLabel}</p>

      <div class="info-box">
        <p style="margin: 0;"><strong>Ordrenummer:</strong> ${orderNumber}</p>
        <p style="margin: 10px 0 0 0;"><strong>Forfallsdato:</strong> ${dueDateLabel}</p>
      </div>

      <div style="text-align: center;">
        <div class="amount">kr ${remainderAmount.toLocaleString('nb-NO')}</div>
        <a href="${paymentUrl}" class="button">Betal rest med Vipps</a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Hvis du allerede har betalt, kan du se bort fra denne påminnelsen.
      </p>

      <p>Vennlig hilsen,<br>Tinglum Gard</p>
    </div>
    <div class="footer">
      <p>Tinglum Gard • Trondheim, Norge</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY') || '';
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN') || '';
    const mailgunRegion = Deno.env.get('MAILGUN_REGION') || 'eu';
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'post@tinglum.com';
    const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://tinglum.no';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    if (!mailgunApiKey || !mailgunDomain) {
      throw new Error('Missing Mailgun credentials');
    }

    const apiBase = mailgunRegion === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const forceRun = url.searchParams.get('force') === 'true';

    const { data: reminderConfigData } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'reminder_week')
      .maybeSingle();

    const reminderConfig: ReminderWeekConfig = reminderConfigData?.value || {};
    const targetWeek = Number(reminderConfig.week || 0);
    const targetYear = Number(reminderConfig.year || new Date().getFullYear());

    const current = getIsoWeekAndYear(new Date());

    if (!forceRun && targetWeek > 0 && (current.week !== targetWeek || current.year !== targetYear)) {
      return new Response(
        JSON.stringify({
          message: 'Not reminder week yet',
          currentWeek: current.week,
          currentYear: current.year,
          targetWeek,
          targetYear,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        reminder_sent_at,
        status,
        box_size,
        remainder_amount,
        extra_credit_amount_nok,
        mangalitsa_preset:mangalitsa_box_presets(name_no, target_weight_kg),
        payments(payment_type, status)
      `)
      .eq('status', 'deposit_paid')
      .is('reminder_sent_at', null)
      .not('customer_email', 'is', null);

    if (ordersError) {
      throw ordersError;
    }

    const dueDate = new Date('2026-11-16');
    const dueDateLabel = dueDate.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let sentCount = 0;
    let skippedCount = 0;
    const results: Array<Record<string, unknown>> = [];

    for (const order of (orders || []) as ReminderOrder[]) {
      const email = order.customer_email || '';
      if (!email || email === 'pending@vipps.no') {
        skippedCount += 1;
        results.push({ order: order.order_number, status: 'skipped', reason: 'missing_email' });
        continue;
      }

      const depositPaid = order.payments?.some((p) => p.payment_type === 'deposit' && p.status === 'completed');
      const remainderPaid = order.payments?.some((p) => p.payment_type === 'remainder' && p.status === 'completed');

      if (!depositPaid || remainderPaid) {
        skippedCount += 1;
        results.push({ order: order.order_number, status: 'skipped', reason: 'payment_state' });
        continue;
      }

      const credit = Math.max(0, Math.round(order.extra_credit_amount_nok || 0));
      const remainderAmount = Math.max(0, Math.round((order.remainder_amount || 0) - credit));

      if (remainderAmount <= 0) {
        skippedCount += 1;
        results.push({ order: order.order_number, status: 'skipped', reason: 'no_remainder_due' });
        continue;
      }

      const customerName = order.customer_name || 'kunde';
      const boxLabel = getBoxLabel(order);
      const paymentUrl = `${appUrl}/min-side`;
      const subject = `Restbetaling forfaller - Ordre ${order.order_number}`;
      const html = getRemainderReminderEmail({
        customerName,
        orderNumber: order.order_number,
        boxLabel,
        remainderAmount,
        paymentUrl,
        dueDateLabel,
      });

      const formData = new URLSearchParams();
      formData.append('from', emailFrom);
      formData.append('to', email);
      formData.append('subject', subject);
      formData.append('html', html);

      const emailResponse = await fetch(`${apiBase}/v3/${mailgunDomain}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`api:${mailgunApiKey}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        results.push({
          order: order.order_number,
          status: 'failed',
          error: errorText,
        });
        continue;
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', order.id);

      if (updateError) {
        results.push({
          order: order.order_number,
          status: 'sent_but_update_failed',
          error: updateError.message,
        });
        continue;
      }

      sentCount += 1;
      results.push({ order: order.order_number, status: 'sent' });
    }

    return new Response(
      JSON.stringify({
        sent: sentCount,
        skipped: skippedCount,
        totalCandidates: (orders || []).length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

