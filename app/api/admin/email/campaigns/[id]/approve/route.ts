import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === '42P01' ||
    (typeof candidate.message === 'string' && candidate.message.includes('does not exist'))
  );
}

function isInvalidCampaignStatusError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === '22P02' &&
    typeof candidate.message === 'string' &&
    candidate.message.includes('email_campaign_status')
  );
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const approvedBy = admin.session?.email || admin.session?.name || 'admin';
  const nowIso = new Date().toISOString();

  let { data, error } = await supabaseAdmin
    .from('email_campaigns')
    .update({
      status: 'ready',
      approved_by: approvedBy,
      approved_at: nowIso,
    })
    .eq('id', params.id)
    .in('status', ['draft', 'ready_for_approval', 'approved'])
    .select('*')
    .single();

  if (error && isInvalidCampaignStatusError(error)) {
    const legacyUpdate = await supabaseAdmin
      .from('email_campaigns')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: nowIso,
      })
      .eq('id', params.id)
      .in('status', ['draft', 'ready_for_approval', 'approved'])
      .select('*')
      .single();
    data = legacyUpdate.data;
    error = legacyUpdate.error;
  }

  if (isMissingRelationError(error)) {
    return NextResponse.json(
      { error: 'Campaign tables are not migrated yet in this environment' },
      { status: 503 }
    );
  }

  if (error || !data) {
    return NextResponse.json(
      { error: 'Campaign cannot be approved from its current status' },
      { status: 400 }
    );
  }

  return NextResponse.json({ campaign: data });
}
