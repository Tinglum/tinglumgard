import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === '42P01' ||
    typeof candidate.message === 'string' && candidate.message.includes('does not exist')
  );
}

export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const { data, error } = await supabaseAdmin
    .from('email_flows')
    .select('*, email_templates(template_key, subject_no, subject_en, classification, active)')
    .order('flow_key', { ascending: true });

  if (!error) {
    return NextResponse.json({ flows: data || [] });
  }

  if (!isMissingRelationError(error)) {
    return NextResponse.json({ error: 'Failed to fetch flows' }, { status: 500 });
  }

  // Legacy fallback for environments where unified email tables are not migrated yet.
  const { data: legacyFlows, error: legacyError } = await supabaseAdmin
    .from('communication_flow_templates')
    .select(
      'id, slug, product_type, flow_stage, trigger_event, send_offset_days, active, subject_no, subject_en'
    )
    .order('display_order', { ascending: true });

  if (legacyError) {
    return NextResponse.json({ error: 'Failed to fetch flows' }, { status: 500 });
  }

  const mapped = (legacyFlows || []).map((flow: any) => ({
    id: flow.id,
    flow_key: flow.slug,
    event_type: flow.trigger_event || flow.flow_stage,
    mode: flow.active ? 'active' : 'disabled',
    active: Boolean(flow.active),
    send_offset_minutes: Math.round(Number(flow.send_offset_days || 0) * 1440),
    template_key: flow.slug,
    email_templates: {
      template_key: flow.slug,
      subject_no: flow.subject_no || '',
      subject_en: flow.subject_en || '',
      classification: 'system',
      active: Boolean(flow.active),
    },
  }));

  return NextResponse.json({ flows: mapped, legacyFallback: true });
}
