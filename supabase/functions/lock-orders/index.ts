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

  // Verify authorization
  const authHeader = req.headers.get('Authorization') || '';
  const expectedKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!expectedKey || !authHeader.includes(expectedKey)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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

      const formData = new URLSearchParams();
      formData.append('from', emailFrom);
      formData.append('to', order.customer_email);
      formData.append('subject', `Ordre ${order.order_number} låst - Ferdigstilt`);
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
}: {
  customerName: string;
  orderNumber: string;
  language: string;
}) {
  const body = `<p style="margin:0 0 16px;"><span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#2D6A4F;background:#ECFDF5;border:1px solid #BBF7D0;border-radius:20px;padding:4px 12px;letter-spacing:0.3px;text-transform:uppercase;">Ordre l&aring;st</span></p>
<p>Hei ${customerName},</p>
<p>Din ordre <strong>${orderNumber}</strong> er n&aring; l&aring;st og ferdigstilt. Ingen ytterligere endringer kan gj&oslash;res.</p>
<p>Vi klargjør Mangalitsa-boksen din. Du vil motta beskjed n&aring;r den er klar.</p>
<p>Takk for din bestilling!</p>`;

  return wrapEmailDocument(body);
}

function wrapEmailDocument(bodyHtml: string): string {
  return `<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" lang="no"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><meta http-equiv="X-UA-Compatible" content="IE=edge"/><title>Tinglum Gard</title></head><body style="margin:0;padding:0;background:#F5EFE7;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1C1210;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:#F5EFE7;"><tr><td align="center" style="padding:24px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" width="600" style="max-width:600px;width:100%;">
<tr><td style="background:#2C1810;padding:28px 24px;text-align:center;border-radius:12px 12px 0 0;">
<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Tinglum G&aring;rd</p>
</td></tr>
<tr><td style="height:4px;background:#8B6914;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="background:#ffffff;padding:32px 28px;border-left:1px solid #E8DFD5;border-right:1px solid #E8DFD5;">
${bodyHtml}
</td></tr>
<tr><td style="background:#FAF8F5;padding:24px 28px;border:1px solid #E8DFD5;border-top:none;text-align:center;">
<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B5B4E;">Trenger du hjelp? Svar p&aring; denne e-posten.</p>
</td></tr>
<tr><td style="padding:16px;text-align:center;">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B5B4E;">Tinglum G&aring;rd &middot; Trondheim, Norge</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
