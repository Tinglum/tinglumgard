import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';

export async function GET(request: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
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

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }

  return NextResponse.json({ history: data || [] });
}
