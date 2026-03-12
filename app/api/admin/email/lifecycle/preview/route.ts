import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import { supabaseAdmin } from '@/lib/supabase/server';
import { renderManagedTemplate } from '@/lib/email/render';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export async function GET(request: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const { searchParams } = new URL(request.url);
  const instanceId = String(searchParams.get('instanceId') || '').trim();
  if (!instanceId) {
    return NextResponse.json({ error: 'instanceId is required' }, { status: 400 });
  }

  const { data: instance, error: instanceError } = await supabaseAdmin
    .from('email_flow_instances')
    .select('id, flow_key, locale, payload, to_email, scheduled_for, status, entity_type, entity_id')
    .eq('id', instanceId)
    .maybeSingle();

  if (instanceError || !instance) {
    return NextResponse.json({ error: 'Lifecycle instance not found' }, { status: 404 });
  }

  const flowKey = String(instance.flow_key || '').trim();
  const { data: flow, error: flowError } = await supabaseAdmin
    .from('email_flows')
    .select('flow_key, template_key')
    .eq('flow_key', flowKey)
    .maybeSingle();

  if (flowError || !flow?.template_key) {
    return NextResponse.json({ error: 'Template mapping not found for flow instance' }, { status: 404 });
  }

  const locale = String(instance.locale || 'no').toLowerCase() === 'en' ? 'en' : 'no';
  const rendered = await renderManagedTemplate({
    templateKey: String(flow.template_key),
    locale,
    variables: asRecord(instance.payload),
  });

  if (!rendered) {
    return NextResponse.json({ error: 'Could not render template preview' }, { status: 404 });
  }

  return NextResponse.json({
    preview: {
      instanceId: String(instance.id),
      flowKey,
      templateKey: String(flow.template_key),
      locale,
      toEmail: instance.to_email ? String(instance.to_email) : null,
      scheduledFor: String(instance.scheduled_for || ''),
      status: String(instance.status || ''),
      entityType: String(instance.entity_type || ''),
      entityId: String(instance.entity_id || ''),
      subject: rendered.subject,
      html: rendered.html,
    },
  });
}

