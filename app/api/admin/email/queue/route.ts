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
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);
  if (campaignId) query = query.eq('campaign_id', campaignId);
  if (email) query = query.ilike('to_email', `%${email}%`);

  const { data, error } = await query;
  if (error) {
    if (isMissingEmailRelationError(error)) {
      return NextResponse.json({
        queue: [],
        legacyFallback: true,
        unavailableReason: 'email_dispatch_queue table is not available in this environment yet',
      });
    }

    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }

  return NextResponse.json({ queue: data || [] });
}
