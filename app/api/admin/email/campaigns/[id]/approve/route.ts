import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const approvedBy = admin.session?.email || admin.session?.name || 'admin';
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
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

  if (error || !data) {
    return NextResponse.json(
      { error: 'Campaign cannot be approved from its current status' },
      { status: 400 }
    );
  }

  return NextResponse.json({ campaign: data });
}
