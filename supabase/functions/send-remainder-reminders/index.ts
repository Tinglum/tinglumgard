import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  reminder_sent_at: string | null;
  total_amount: number;
  deposit_amount: number;
  remainder_amount: number;
  box_size: number;
  add_ons_json: any;
  order_extras: any[];
  fresh_delivery: boolean;
  payments: any[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY')!;
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN')!;
    const mailgunRegion = Deno.env.get('MAILGUN_REGION') || 'eu';
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'post@tinglum.com';
    const apiBase = mailgunRegion === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net';

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'reminder_week')
      .single();

    if (!config) {
      throw new Error('Reminder week config not found');
    }

    const targetWeek = config.value.week;
    const targetYear = config.value.year;
    const currentWeek = getWeekNumber(new Date());

    console.log(`Current week: ${currentWeek}, Target week: ${targetWeek}`);

    if (currentWeek !== targetWeek) {
      return new Response(
        JSON.stringify({
          message: `Not reminder week yet. Current: ${currentWeek}, Target: ${targetWeek}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*, payments(*), order_extras(*, extras_catalog(*))')
      .is('reminder_sent_at', null)
      .eq('status', 'deposit_paid');

    if (ordersError) throw ordersError;

    let sentCount = 0;
    const results = [];

    for (const order of orders as Order[]) {
      const depositPaid = order.payments?.some(
        (p: any) => p.payment_type === 'deposit' && p.status === 'completed'
      );
      const remainderPaid = order.payments?.some(
        (p: any) => p.payment_type === 'remainder' && p.status === 'completed'
      );

      if (!depositPaid || remainderPaid) {
        continue;
      }

      // Fetch current pricing from app_config
      const { data: configData, error: configError } = await supabaseClient
        .from('app_config')
        .select('key, value')
        .in('key', ['box_8kg_price', 'box_12kg_price'])

      if (configError || !configData) {
        console.error('Failed to fetch pricing config:', configError);
        continue; // Skip this order if we cannot get pricing
      }

      const priceConfig = new Map(configData.map(c => [c.key, parseInt(c.value)]));
      let basePrice = order.box_size === 8 
        ? (priceConfig.get('box_8kg_price') || 0)
        : (priceConfig.get('box_12kg_price') || 0);
      
      if (basePrice === 0) {
        console.error('Invalid price configuration for order:', order.id);
        continue; // Skip orders with invalid pricing
      }

      let depositPercentage = 50;

      if (configData?.value) {
        const pricing = configData.value;
        basePrice = order.box_size === 8 ? pricing.box_8kg_price : pricing.box_12kg_price;
        depositPercentage = pricing.deposit_percentage || 50;
      }

      const depositAmount = Math.floor(basePrice * depositPercentage / 100);
      let remainderAmount = basePrice - depositAmount;

      // Fetch add-on prices from app_config
      const { data: addonsConfigData } = await supabaseClient
        .from('app_config')
        .select('value')
        .eq('key', 'addons_pricing')
        .single();

      const addonsPricing = addonsConfigData?.value || {
        organ_pakke: 200,
        grunn_pakke: 100,
        krydder_pakke: 150,
      };

      const addOnsJson = order.add_ons_json || {};
      if (addOnsJson.organPakke) remainderAmount += (addonsPricing.organ_pakke || 200);
      if (addOnsJson.grunnPakke) remainderAmount += (addonsPricing.grunn_pakke || 100);
      if (addOnsJson.krydderpakke) remainderAmount += (addonsPricing.krydder_pakke || 150);

      if (order.order_extras && order.order_extras.length > 0) {
        order.order_extras.forEach((extra: any) => {
          remainderAmount += extra.price_nok || 0;
        });
      }

      if (order.fresh_delivery) {
        remainderAmount += (pricing.fresh_delivery_fee || 200);
      }

      const paymentUrl = `${Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://tinglum.no'}/min-side`;
      const dueDate = 'Fredag 1. november 2024';

      const emailHtml = getRemainderReminderEmail({
        customerName: order.customer_name,
        orderNumber: order.order_number,
        remainderAmount,
        paymentUrl,
        dueDate,
        language: 'no',
      });

      const formData = new URLSearchParams();
      formData.append('from', emailFrom);
      formData.append('to', order.customer_email);
      formData.append('subject', `Restbetaling forfaller - Ordre ${order.order_number}`);
      formData.append('html', emailHtml);

      const emailResponse = await fetch(`${apiBase}/v3/${mailgunDomain}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`api:${mailgunApiKey}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (emailResponse.ok) {
        await supabase
          .from('orders')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', order.id);

        sentCount++;
        results.push({ order: order.order_number, status: 'sent' });
      } else {
        const error = await emailResponse.json();
        results.push({ order: order.order_number, status: 'failed', error });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${sentCount} reminder emails`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getRemainderReminderEmail({
  customerName,
  orderNumber,
  remainderAmount,
  paymentUrl,
  dueDate,
  language,
}: {
  customerName: string;
  orderNumber: string;
  remainderAmount: number;
  paymentUrl: string;
  dueDate: string;
  language: string;
}) {
  return `
<!DOCTYPE html>
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
      <h1 style="margin: 0;">Tinglum Gård</h1>
    </div>
    <div class="content">
      <h2>Hei ${customerName},</h2>
      <p>Takk for depositum for ordre <strong>${orderNumber}</strong>.</p>
      <p>Restbetalingen for din okseboks forfaller nå.</p>

      <div class="info-box">
        <p style="margin: 0;"><strong>Ordrenummer:</strong> ${orderNumber}</p>
        <p style="margin: 10px 0 0 0;"><strong>Forfallsdato:</strong> ${dueDate}</p>
      </div>

      <div style="text-align: center;">
        <div class="amount">kr ${remainderAmount.toLocaleString('nb-NO')}</div>
        <a href="${paymentUrl}" class="button">Betal rest med Vipps</a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Hvis du allerede har betalt, kan du se bort fra denne påminnelsen. Bestillingen din vil bli låst etter forfallsdato.
      </p>

      <p>Vennlig hilsen,<br>Tinglum Gård</p>
    </div>
    <div class="footer">
      <p>Tinglum Gård • Trondheim, Norge</p>
    </div>
  </div>
</body>
</html>
  `;
}
