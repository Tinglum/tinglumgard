import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import type { EmailFlowMode } from '@/lib/email/types';

const ALLOWED_MODES: EmailFlowMode[] = ['shadow', 'active', 'disabled'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (typeof body?.mode === 'string' && body.mode.trim()) {
    const mode = body.mode.trim() as EmailFlowMode;
    if (!ALLOWED_MODES.includes(mode)) {
      return NextResponse.json({ error: 'Invalid flow mode' }, { status: 400 });
    }
    updates.mode = mode;
  }

  if (typeof body?.active === 'boolean') {
    updates.active = body.active;
  }

  if (typeof body?.templateKey === 'string' && body.templateKey.trim()) {
    updates.template_key = body.templateKey.trim();
  }

  if (typeof body?.eventType === 'string' && body.eventType.trim()) {
    updates.event_type = body.eventType.trim();
  }

  if (typeof body?.sendOffsetMinutes === 'number' && Number.isFinite(body.sendOffsetMinutes)) {
    updates.send_offset_minutes = Math.round(body.sendOffsetMinutes);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('email_flows')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update flow' }, { status: 500 });
  }

  return NextResponse.json({ flow: data });
}
