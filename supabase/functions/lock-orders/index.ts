import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'noreply@tinglum.no';

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'lock_week')
      .single();

    if (!config) {
      throw new Error('Lock week config not found');
    }

    const targetWeek = config.value.week;
    const currentWeek = getWeekNumber(new Date());

    console.log(`Current week: ${currentWeek}, Target week: ${targetWeek}`);

    if (currentWeek !== targetWeek) {
      return new Response(
        JSON.stringify({
          message: `Not lock week yet. Current: ${currentWeek}, Target: ${targetWeek}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .is('locked_at', null)
      .in('status', ['deposit_paid', 'paid']);

    if (ordersError) throw ordersError;

    let lockedCount = 0;
    const results = [];

    for (const order of orders as any[]) {
      await supabase
        .from('orders')
        .update({
          locked_at: new Date().toISOString(),
          status: 'paid',
        })
        .eq('id', order.id);

      const emailHtml = getOrderLockedEmail({
        customerName: order.customer_name,
        orderNumber: order.order_number,
        language: 'no',
      });

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: emailFrom,
          to: order.customer_email,
          subject: `Ordre ${order.order_number} låst - Ferdigstilt`,
          html: emailHtml,
        }),
      });

      if (emailResponse.ok) {
        lockedCount++;
        results.push({ order: order.order_number, status: 'locked' });
      } else {
        const error = await emailResponse.json();
        results.push({ order: order.order_number, status: 'failed', error });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Locked ${lockedCount} orders`,
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

function getOrderLockedEmail({
  customerName,
  orderNumber,
  language,
}: {
  customerName: string;
  orderNumber: string;
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
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Tinglum Gård</h1>
    </div>
    <div class="content">
      <h2>Hei ${customerName},</h2>
      <p>Din ordre <strong>${orderNumber}</strong> er nå låst og ferdigstilt.</p>
      <p>Ingen flere endringer kan gjøres. Vi klargjør okseboksen din for henting/levering.</p>
      <p>Du vil motta beskjed når bestillingen din er klar.</p>
      <p>Takk for din bestilling!</p>
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
