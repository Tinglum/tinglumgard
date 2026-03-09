import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import type { EmailFlowMode } from '@/lib/email/types';

const ALLOWED_MODES: EmailFlowMode[] = ['shadow', 'active', 'disabled'];

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === '42P01' ||
    typeof candidate.message === 'string' && candidate.message.includes('does not exist')
  );
}

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

  if (!error && data) {
    return NextResponse.json({ flow: data });
  }

  if (!isMissingRelationError(error)) {
    return NextResponse.json({ error: 'Failed to update flow' }, { status: 500 });
  }

  // Legacy fallback for environments where unified email tables are not migrated yet.
  const legacyUpdates: Record<string, unknown> = {};

  if (typeof body?.active === 'boolean') {
    legacyUpdates.active = body.active;
  }

  if (typeof body?.mode === 'string') {
    const mode = body.mode.trim() as EmailFlowMode;
    if (mode === 'disabled') {
      legacyUpdates.active = false;
    }
    if (mode === 'active' || mode === 'shadow') {
      legacyUpdates.active = true;
    }
  }

  if (typeof body?.eventType === 'string' && body.eventType.trim()) {
    legacyUpdates.trigger_event = body.eventType.trim();
  }

  if (typeof body?.sendOffsetMinutes === 'number' && Number.isFinite(body.sendOffsetMinutes)) {
    legacyUpdates.send_offset_days = Math.round(body.sendOffsetMinutes / 1440);
  }

  if (Object.keys(legacyUpdates).length === 0) {
    return NextResponse.json({ error: 'No compatible updates for legacy flows' }, { status: 400 });
  }

  const { data: legacyFlow, error: legacyError } = await supabaseAdmin
    .from('communication_flow_templates')
    .update(legacyUpdates)
    .eq('id', params.id)
    .select(
      'id, slug, product_type, flow_stage, trigger_event, send_offset_days, active, subject_no, subject_en'
    )
    .single();

  if (legacyError || !legacyFlow) {
    return NextResponse.json({ error: 'Failed to update flow' }, { status: 500 });
  }

  return NextResponse.json({
    flow: {
      id: legacyFlow.id,
      flow_key: legacyFlow.slug,
      event_type: legacyFlow.trigger_event || legacyFlow.flow_stage,
      mode: legacyFlow.active ? 'active' : 'disabled',
      active: Boolean(legacyFlow.active),
      send_offset_minutes: Math.round(Number(legacyFlow.send_offset_days || 0) * 1440),
      template_key: legacyFlow.slug,
    },
    legacyFallback: true,
  });
}
