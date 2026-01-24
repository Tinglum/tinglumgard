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

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'payment_deadline')
      .single();

    if (!config) {
      throw new Error('Payment deadline config not found');
    }

    const deadlineWeek = config.value.week;
    const currentWeek = getWeekNumber(new Date());

    console.log(`Current week: ${currentWeek}, Deadline week: ${deadlineWeek}`);

    if (currentWeek <= deadlineWeek) {
      return new Response(
        JSON.stringify({
          message: `Not past deadline yet. Current: ${currentWeek}, Deadline: ${deadlineWeek}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*, payments(*)')
      .eq('at_risk', false)
      .eq('status', 'deposit_paid');

    if (ordersError) throw ordersError;

    let atRiskCount = 0;
    const results = [];

    for (const order of orders as any[]) {
      const depositPaid = order.payments?.some(
        (p: any) => p.payment_type === 'deposit' && p.status === 'completed'
      );
      const remainderPaid = order.payments?.some(
        (p: any) => p.payment_type === 'remainder' && p.status === 'completed'
      );

      if (depositPaid && !remainderPaid) {
        await supabase
          .from('orders')
          .update({ at_risk: true })
          .eq('id', order.id);

        atRiskCount++;
        results.push({ order: order.order_number, status: 'marked_at_risk' });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Marked ${atRiskCount} orders as at risk`,
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
