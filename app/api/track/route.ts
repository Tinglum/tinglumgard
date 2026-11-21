export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

const ANONYMOUS_ALLOWED_EVENTS = new Set([
  'pig_browse',
  'pig_campaign_visit',
  'pig_referral_visit',
  'pig_share_hub_visit',
  'pig_checkout_start',
]);

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (session?.isAdmin) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.eventType !== 'string' || typeof body.page !== 'string') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { eventType, page, metadata } = body as {
      eventType: string;
      page: string;
      metadata?: Record<string, unknown>;
    };

    if (!session?.userId && !ANONYMOUS_ALLOWED_EVENTS.has(eventType)) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { error } = await supabaseAdmin.from('page_events').insert({
      event_type: eventType,
      customer_id: session?.userId ?? null,
      customer_email: session?.email ?? null,
      vipps_sub: session?.vippsSub ?? null,
      page: page.slice(0, 200),
      metadata: metadata ?? null,
    });

    // Unique constraint violation (dedup) — swallow silently
    if (error && error.code !== '23505') {
      console.error('[track] insert error:', error.message);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    // Never break the caller
    console.error('[track] unexpected error:', err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
