import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { ensureHtmlDocument } from '@/lib/email/render';
import { resolveCampaignRecipients, upsertCampaignRecipients } from '@/lib/email/campaigns';

type LegacyFlowTemplate = {
  slug: string;
  product_type: 'mangalitsa' | 'eggs';
  flow_stage: string;
  name_no: string;
  name_en: string;
  subject_no: string;
  subject_en: string;
  body_no: string;
  body_en: string;
  active: boolean;
  trigger_event?: string | null;
  send_offset_days?: number | null;
  display_order?: number | null;
};

function replaceOrderVariables(value: string, customerName: string, orderNumber: string) {
  return value.replaceAll('{CUSTOMER_NAME}', customerName).replaceAll('{ORDER_NUMBER}', orderNumber);
}

function buildLegacyTemplateName(templateKey: string) {
  return templateKey.replaceAll('-', ' ');
}

async function getLegacyFlowTemplates() {
  const { data: flows } = await supabaseAdmin
    .from('email_flows')
    .select('flow_key, event_type, product_scope, template_key, mode, send_offset_minutes, active')
    .order('flow_key', { ascending: true });

  const { data: templates } = await supabaseAdmin
    .from('email_templates')
    .select('template_key, subject_no, subject_en, body_no, body_en, active')
    .order('template_key', { ascending: true });

  const templateByKey = new Map((templates || []).map((row) => [row.template_key, row]));
  const mapped: LegacyFlowTemplate[] = (flows || []).map((flow) => {
    const template = templateByKey.get(flow.template_key);
    return {
      slug: flow.flow_key,
      product_type: flow.product_scope === 'eggs' ? 'eggs' : 'mangalitsa',
      flow_stage: flow.event_type,
      name_no: buildLegacyTemplateName(flow.flow_key),
      name_en: buildLegacyTemplateName(flow.flow_key),
      subject_no: template?.subject_no || '',
      subject_en: template?.subject_en || '',
      body_no: template?.body_no || '',
      body_en: template?.body_en || '',
      active: Boolean(flow.active && template?.active),
      trigger_event: flow.event_type,
      send_offset_days: Math.round((flow.send_offset_minutes || 0) / 1440),
      display_order: 0,
    };
  });

  return mapped;
}

async function sendIndividualEmail(orderId: string, subject: string, message: string) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, customer_name, customer_email, order_number')
    .eq('id', orderId)
    .single();

  if (!order || !order.customer_email || order.customer_email === 'pending@vipps.no') {
    return NextResponse.json({ error: 'No valid recipient found' }, { status: 400 });
  }

  const renderedSubject = replaceOrderVariables(subject, order.customer_name || 'Kunde', order.order_number);
  const renderedBody = ensureHtmlDocument(
    replaceOrderVariables(message, order.customer_name || 'Kunde', order.order_number),
    'no'
  );

  const result = await dispatchEmail({
    to: order.customer_email,
    subject: renderedSubject,
    html: renderedBody,
    classification: 'support',
    sourcePath: '/api/admin/communication/send_individual',
    orderId: order.id,
    metadata: {
      legacy_route: true,
      legacy_action: 'send_individual',
    },
    idempotency: {
      source: 'legacy.communication',
      entity: 'order',
      id: order.id,
      template: 'manual',
    },
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to enqueue email' }, { status: 500 });
  }

  return NextResponse.json({ success: true, queue_id: result.queueId, mode: result.mode });
}

async function sendBulkEmail(orderIds: string[], subject: string, message: string) {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, customer_name, customer_email, order_number')
    .in('id', orderIds);

  let sent = 0;
  let failed = 0;
  const results: Array<{ order_number: string; success: boolean; queue_id?: string; error?: string }> = [];

  for (const order of orders || []) {
    if (!order.customer_email || order.customer_email === 'pending@vipps.no') continue;

    const renderedSubject = replaceOrderVariables(subject, order.customer_name || 'Kunde', order.order_number);
    const renderedBody = ensureHtmlDocument(
      replaceOrderVariables(message, order.customer_name || 'Kunde', order.order_number),
      'no'
    );

    const result = await dispatchEmail({
      to: order.customer_email,
      subject: renderedSubject,
      html: renderedBody,
      classification: 'support',
      sourcePath: '/api/admin/communication/send_bulk',
      orderId: order.id,
      metadata: { legacy_route: true, legacy_action: 'send_bulk' },
      idempotency: {
        source: 'legacy.communication',
        entity: 'order',
        id: `${order.id}:${subject}`,
        template: 'manual',
      },
    });

    if (result.success) {
      sent += 1;
      results.push({ order_number: order.order_number, success: true, queue_id: result.queueId });
    } else {
      failed += 1;
      results.push({ order_number: order.order_number, success: false, error: result.error });
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    failed,
    results,
  });
}

async function createApprovalCampaign(subject: string, message: string, filter: Record<string, unknown> | undefined) {
  const recipients = await resolveCampaignRecipients({
    recipientMode: 'all',
    recipientFilter: filter || {},
  });

  const { data: campaign, error } = await supabaseAdmin
    .from('email_campaigns')
    .insert({
      name: `Legacy utsendelse ${new Date().toISOString()}`,
      classification: 'promotional',
      status: 'ready',
      subject_no: subject,
      subject_en: subject,
      body_no: message,
      body_en: message,
      recipient_mode: 'all',
      recipient_filter: filter || {},
      created_by: 'legacy.communication',
      total_recipients: recipients.length,
    })
    .select('*')
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: 'Failed to create campaign draft' }, { status: 500 });
  }

  await upsertCampaignRecipients(campaign.id, recipients);

  return NextResponse.json({
    success: true,
    requires_approval: false,
    queued_by_cron: true,
    campaign_id: campaign.id,
    total_recipients: recipients.length,
  });
}

async function getLegacyTemplates() {
  const { data } = await supabaseAdmin
    .from('email_templates')
    .select('template_key, subject_no, body_no')
    .order('template_key', { ascending: true });

  return NextResponse.json({
    templates: (data || []).map((template) => ({
      id: template.template_key,
      name: buildLegacyTemplateName(template.template_key),
      subject: template.subject_no,
      message: template.body_no,
    })),
  });
}

async function saveFlowTemplate(template: LegacyFlowTemplate) {
  if (!template?.slug) {
    return NextResponse.json({ error: 'Template slug is required' }, { status: 400 });
  }

  const templateKey = template.slug;
  const productScope = template.product_type === 'eggs' ? 'eggs' : 'pig';

  const { data: upsertedTemplate, error: templateError } = await supabaseAdmin
    .from('email_templates')
    .upsert(
      {
        template_key: templateKey,
        classification: 'system',
        product_scope: productScope,
        subject_no: template.subject_no,
        subject_en: template.subject_en,
        body_no: template.body_no,
        body_en: template.body_en,
        active: template.active ?? true,
      },
      { onConflict: 'template_key' }
    )
    .select('*')
    .single();

  if (templateError || !upsertedTemplate) {
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
  }

  await supabaseAdmin
    .from('email_flows')
    .upsert(
      {
        flow_key: template.slug,
        event_type: template.trigger_event || template.flow_stage,
        product_scope: productScope,
        template_key: template.slug,
        mode: 'shadow',
        send_offset_minutes: (template.send_offset_days || 0) * 1440,
        active: template.active ?? true,
      },
      { onConflict: 'flow_key' }
    );

  return NextResponse.json({ template: upsertedTemplate });
}

async function getEmailHistory(orderId: string) {
  const { data } = await supabaseAdmin
    .from('email_dispatch_queue')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  return NextResponse.json({ history: data || [] });
}

async function getAllEmailHistory() {
  const { data } = await supabaseAdmin
    .from('email_dispatch_queue')
    .select('*, orders(order_number, customer_name, status)')
    .order('created_at', { ascending: false })
    .limit(100);
  return NextResponse.json({ history: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = String(body?.action || '');
    const data = body?.data || {};

    switch (action) {
      case 'send_individual':
        return sendIndividualEmail(String(data.orderId || ''), String(data.subject || ''), String(data.message || ''));
      case 'send_bulk':
        return sendBulkEmail(
          Array.isArray(data.orderIds) ? data.orderIds.map(String) : [],
          String(data.subject || ''),
          String(data.message || '')
        );
      case 'send_to_all':
        return createApprovalCampaign(String(data.subject || ''), String(data.message || ''), data.filter);
      case 'get_templates':
        return getLegacyTemplates();
      case 'get_flow_templates':
        return NextResponse.json({ templates: await getLegacyFlowTemplates() });
      case 'save_flow_template':
        return saveFlowTemplate(data.template as LegacyFlowTemplate);
      case 'get_history':
        return getEmailHistory(String(data.orderId || ''));
      case 'get_all_history':
        return getAllEmailHistory();
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('legacy communication route error', error);
    return NextResponse.json({ error: 'Communication operation failed' }, { status: 500 });
  }
}
