import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendPigLifecycleEmail, buildPigOrderEmailVariables } from '@/lib/orders/notifications';
import { logError } from '@/lib/logger';
import { VIPPS_PENDING_EMAIL } from '@/lib/constants/app';

export const dynamic = 'force-dynamic';

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const token = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('token');
  return Boolean(token && token === secret);
}

async function alreadySentTemplate(orderId: string, templateKey: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('email_dispatch_queue')
    .select('id')
    .eq('order_id', orderId)
    .eq('template_key', templateKey)
    .in('status', ['sent', 'pending', 'processing'])
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const threeDaysAgoIso = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const isPreSlaughterWindow =
    now.getUTCFullYear() === 2026 && now.getUTCMonth() === 11 && now.getUTCDate() >= 4 && now.getUTCDate() <= 10;

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_email, status, created_at')
    .in('status', ['deposit_paid', 'paid', 'fully_paid'])
    .gte('created_at', '2026-10-01T00:00:00Z')
    .limit(250);

  if (error) {
    logError('cron-pig-lifecycle-fetch', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ orderNumber: string; templateKey: string; sent: boolean }> = [];

  for (const order of orders || []) {
    const email = String(order.customer_email || '').trim().toLowerCase();
    if (!email || email === VIPPS_PENDING_EMAIL) continue;

    // 1. Day +3 viral referral nudge (for deposit_paid orders with < 5 paid friends)
    if (order.status === 'deposit_paid' && order.created_at <= threeDaysAgoIso) {
      if (!(await alreadySentTemplate(order.id, 'pig.order.referral.nudge'))) {
        try {
          const ctx = await buildPigOrderEmailVariables(order.id);
          if (ctx && ctx.paidFriendsCount < 5) {
            const res = await sendPigLifecycleEmail({
              orderId: order.id,
              templateKey: 'pig.order.referral.nudge',
              sourcePath: 'cron.pig-lifecycle',
            });
            results.push({ orderNumber: order.order_number, templateKey: 'pig.order.referral.nudge', sent: res.ok });
          }
        } catch (err) {
          logError('cron-pig-lifecycle-nudge', err, { orderId: order.id });
        }
      }
    }

    // 2. Early-December pre-slaughter explainer (Dec 4-10, before 2nd-week slaughter)
    if (isPreSlaughterWindow && order.status === 'deposit_paid') {
      if (!(await alreadySentTemplate(order.id, 'pig.remainder.explainer.full'))) {
        try {
          const res = await sendPigLifecycleEmail({
            orderId: order.id,
            templateKey: 'pig.remainder.explainer.full',
            sourcePath: 'cron.pig-lifecycle',
          });
          results.push({ orderNumber: order.order_number, templateKey: 'pig.remainder.explainer.full', sent: res.ok });
        } catch (err) {
          logError('cron-pig-lifecycle-explainer', err, { orderId: order.id });
        }
      }
    }
  }

  return NextResponse.json({
    checked: (orders || []).length,
    sent: results.filter((r) => r.sent).length,
    details: results,
  });
}
