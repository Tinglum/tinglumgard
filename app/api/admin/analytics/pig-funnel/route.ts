export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.max(1, Math.min(365, parseInt(searchParams.get('days') ?? '30', 10) || 30));

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // ── Funnel step 1 & 2: unique customers per event type ──
  const [browseRes, checkoutRes, ordersRes, paymentsRes] = await Promise.all([
    supabaseAdmin
      .from('page_events')
      .select('customer_id')
      .eq('event_type', 'pig_browse')
      .gte('created_at', cutoff),
    supabaseAdmin
      .from('page_events')
      .select('customer_id')
      .eq('event_type', 'pig_checkout_start')
      .gte('created_at', cutoff),
    supabaseAdmin
      .from('orders')
      .select('id, customer_email, status, created_at')
      .gte('created_at', cutoff)
      .not('status', 'in', '("cancelled","forfeited")'),
    supabaseAdmin
      .from('payments')
      .select('order_id, payment_type, status, created_at')
      .eq('payment_type', 'deposit')
      .eq('status', 'completed')
      .gte('created_at', cutoff),
  ]);

  const uniqueSet = (rows: Array<{ customer_id: string | null }>) =>
    new Set(rows.filter((r) => r.customer_id).map((r) => r.customer_id as string));

  const browseCustomers = uniqueSet(browseRes.data ?? []);
  const checkoutCustomers = uniqueSet(checkoutRes.data ?? []);
  const ordersData = ordersRes.data ?? [];
  const paymentsData = paymentsRes.data ?? [];

  const orderEmails = new Set(ordersData.map((o) => o.customer_email).filter(Boolean));
  const depositOrderIds = new Set(paymentsData.map((p) => p.order_id).filter(Boolean));

  // ── Warm leads: visited checkout but no order in period ──
  const checkoutVisitsAll = (checkoutRes.data ?? []) as Array<{
    customer_id: string | null;
  }>;

  // Get detailed info for warm leads (need email + visit count + last_seen)
  const warmLeadsRes = await supabaseAdmin
    .from('page_events')
    .select('customer_id, customer_email, created_at')
    .eq('event_type', 'pig_checkout_start')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false });

  const warmLeadsData = (warmLeadsRes.data ?? []) as Array<{
    customer_id: string | null;
    customer_email: string | null;
    created_at: string;
  }>;

  // Group by customer_id
  const warmMap = new Map<
    string,
    { customer_email: string | null; visits: number; last_seen: string }
  >();
  for (const row of warmLeadsData) {
    if (!row.customer_id) continue;
    const existing = warmMap.get(row.customer_id);
    if (!existing) {
      warmMap.set(row.customer_id, {
        customer_email: row.customer_email,
        visits: 1,
        last_seen: row.created_at,
      });
    } else {
      existing.visits += 1;
      // created_at is already DESC ordered, first occurrence is latest
    }
  }

  // Filter: no order email match
  const warmLeads = Array.from(warmMap.entries())
    .filter(([, v]) => !v.customer_email || !orderEmails.has(v.customer_email))
    .slice(0, 20)
    .map(([customer_id, v]) => ({
      customer_id,
      customer_email: v.customer_email,
      visits: v.visits,
      last_seen: v.last_seen,
    }));

  return NextResponse.json({
    period: days,
    funnel: {
      browse: browseCustomers.size,
      checkout_start: checkoutCustomers.size,
      order_placed: orderEmails.size,
      deposit_paid: depositOrderIds.size,
    },
    warm_leads: warmLeads,
  });
}
