import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import { isMissingEmailRelationError } from '@/lib/email/schema';

export async function GET(request: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const email = searchParams.get('email');
  const campaignId = searchParams.get('campaignId');
  const limit = Math.max(1, Math.min(500, Number.parseInt(searchParams.get('limit') || '100', 10)));

  let query = supabaseAdmin
    .from('email_dispatch_queue')
    .select('*, email_delivery_events(id, event_type, recipient, event_at, created_at)')
    .in('status', ['sent', 'failed', 'dead', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }
  if (email) {
    query = query.ilike('to_email', `%${email}%`);
  }
  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingEmailRelationError(error)) {
      let legacyQuery = supabaseAdmin
        .from('email_log')
        .select('id, recipient, subject, sent_at, created_at, order_id')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (email) {
        legacyQuery = legacyQuery.ilike('recipient', `%${email}%`);
      }

      const { data: legacyRows, error: legacyError } = await legacyQuery;
      if (legacyError && !isMissingEmailRelationError(legacyError)) {
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
      }

      const legacyHistory = (legacyRows || []).map((row: any) => ({
        id: row.id,
        status: 'sent',
        classification: 'system',
        to_email: row.recipient,
        subject: row.subject,
        created_at: row.created_at,
        sent_at: row.sent_at || row.created_at,
        source_path: 'legacy.email_log',
        order_id: row.order_id,
        email_delivery_events: [],
      }));

      return NextResponse.json({
        history: legacyHistory,
        legacyFallback: true,
        unavailableReason: 'email_dispatch_queue table is not available in this environment yet',
      });
    }

    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }

  return NextResponse.json({ history: data || [] });
}
