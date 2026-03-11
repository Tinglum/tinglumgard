import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { fetchCommunicationHistory, resolveOrderIdsForIdentity } from '@/lib/email/history';
import { isMissingEmailRelationError } from '@/lib/email/schema';
import type { EmailClassification } from '@/lib/email/types';

type CustomerIdentity = {
  email: string;
  phone: string;
  userId: string;
};

function normalizeEmail(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizePhone(value?: string | null): string {
  return String(value || '').trim();
}

function phoneDigits(value?: string | null): string {
  return String(value || '').replace(/\D/g, '');
}

function parseCustomerId(raw: string): Partial<CustomerIdentity> {
  const value = String(raw || '').trim();
  if (!value) return {};

  if (value.startsWith('email:')) {
    return { email: normalizeEmail(value.slice(6)) };
  }
  if (value.startsWith('phone:')) {
    return { phone: value.slice(6) };
  }
  if (value.startsWith('user:')) {
    return { userId: value.slice(5) };
  }

  const email = normalizeEmail(value);
  if (email.includes('@')) {
    return { email };
  }

  return { phone: value };
}

function sanitizeClassification(value: unknown): EmailClassification {
  const classification = String(value || '').trim() as EmailClassification;
  if (classification === 'transactional') return 'transactional';
  if (classification === 'support') return 'support';
  if (classification === 'promotional') return 'promotional';
  return 'system';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function wrapPlainTextAsHtml(value: string): string {
  const safe = escapeHtml(String(value || ''));
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="font-family:Arial,sans-serif;line-height:1.5;padding:16px;white-space:pre-wrap;">${safe}</body></html>`;
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ''));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

async function requireAdmin() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }),
      session: null,
    };
  }
  return {
    ok: true as const,
    response: null,
    session,
  };
}

async function getSuppression(email: string) {
  if (!email) return null;

  const { data, error } = await supabaseAdmin
    .from('email_suppression_list')
    .select('email, reason, source, created_at')
    .ilike('email', email)
    .maybeSingle();

  if (error) {
    if (isMissingEmailRelationError(error)) {
      return null;
    }
    throw error;
  }

  return data || null;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { searchParams } = new URL(request.url);
  const action = String(searchParams.get('action') || '').trim();

  if (action === 'preview-scheduled') {
    const id = String(searchParams.get('id') || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data: instance, error: instanceError } = await supabaseAdmin
      .from('email_flow_instances')
      .select(
        'id, flow_key, entity_type, entity_id, trigger_date_key, status, locale, to_email, payload, metadata, scheduled_for, created_at, last_error'
      )
      .eq('id', id)
      .maybeSingle();

    if (instanceError) {
      if (isMissingEmailRelationError(instanceError)) {
        return NextResponse.json(
          { error: 'Email flow tables are not available in this environment yet' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Failed to fetch scheduled email preview' }, { status: 500 });
    }
    if (!instance) {
      return NextResponse.json({ error: 'Scheduled email not found' }, { status: 404 });
    }

    let templateKey: string | null = null;
    const { data: flow, error: flowError } = await supabaseAdmin
      .from('email_flows')
      .select('template_key')
      .eq('flow_key', String(instance.flow_key || ''))
      .maybeSingle();

    if (flowError && !isMissingEmailRelationError(flowError)) {
      return NextResponse.json({ error: 'Failed to resolve flow template for preview' }, { status: 500 });
    }

    if (flow?.template_key) {
      templateKey = String(flow.template_key);
    } else {
      const metadata = asRecord(instance.metadata);
      if (metadata.template_key) {
        templateKey = String(metadata.template_key);
      }
    }

    const locale: 'no' | 'en' = String(instance.locale || 'no') === 'en' ? 'en' : 'no';
    const variables = asRecord(instance.payload);

    const rendered = templateKey
      ? await renderManagedTemplate({
          templateKey,
          locale,
          variables,
        })
      : null;

    const fallbackSubject =
      locale === 'en'
        ? `Planned email: ${String(instance.flow_key || '')}`
        : `Planlagt e-post: ${String(instance.flow_key || '')}`;

    const fallbackBody = [
      locale === 'en'
        ? 'This is a preview of a scheduled automated email.'
        : 'Dette er en forhåndsvisning av en planlagt automatisk e-post.',
      '',
      `Flow: ${String(instance.flow_key || '')}`,
      `Status: ${String(instance.status || 'scheduled')}`,
      `Template: ${templateKey || 'n/a'}`,
      `Scheduled: ${String(instance.scheduled_for || '')}`,
      '',
      locale === 'en' ? 'Payload variables:' : 'Variabler:',
      JSON.stringify(variables, null, 2),
    ].join('\n');

    const entityType = String(instance.entity_type || '');
    const entityId = String(instance.entity_id || '');

    return NextResponse.json({
      preview: {
        id: String(instance.id),
        source: 'email_flow_instance',
        subject: rendered?.subject || fallbackSubject,
        html: rendered?.html || wrapPlainTextAsHtml(fallbackBody),
        classification: String(rendered?.classification || 'system'),
        status: String(instance.status || 'scheduled'),
        toEmail: instance.to_email ? String(instance.to_email) : null,
        templateKey: rendered?.templateKey || templateKey,
        sourcePath: '/api/cron/email-flow-runner',
        sentAt: null,
        scheduledFor: instance.scheduled_for ? String(instance.scheduled_for) : null,
        createdAt: instance.created_at ? String(instance.created_at) : null,
        lastError: instance.last_error ? String(instance.last_error) : null,
        orderRefs: {
          orderId: entityType === 'order' ? entityId : null,
          eggOrderId: entityType === 'egg_order' ? entityId : null,
          chickenOrderId: entityType === 'chicken_order' ? entityId : null,
          campaignId: null,
        },
      },
    });
  }

  if (action === 'preview') {
    const source = String(searchParams.get('source') || '').trim();
    const id = String(searchParams.get('id') || '').trim();
    if (!id || (source !== 'email_dispatch_queue' && source !== 'legacy_email_log')) {
      return NextResponse.json({ error: 'Valid source and id are required' }, { status: 400 });
    }

    if (source === 'email_dispatch_queue') {
      const { data, error } = await supabaseAdmin
        .from('email_dispatch_queue')
        .select(
          'id, subject, html, classification, status, to_email, template_key, source_path, sent_at, created_at, last_error, order_id, egg_order_id, chicken_order_id, campaign_id'
        )
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (isMissingEmailRelationError(error)) {
          return NextResponse.json(
            { error: 'Email queue table is not available in this environment yet' },
            { status: 503 }
          );
        }
        return NextResponse.json({ error: 'Failed to fetch email preview' }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: 'Email not found' }, { status: 404 });
      }

      return NextResponse.json({
        preview: {
          id: String(data.id),
          source: 'email_dispatch_queue',
          subject: String(data.subject || ''),
          html: String(data.html || ''),
          classification: String(data.classification || 'system'),
          status: String(data.status || 'unknown'),
          toEmail: data.to_email ? String(data.to_email) : null,
          templateKey: data.template_key ? String(data.template_key) : null,
          sourcePath: data.source_path ? String(data.source_path) : null,
          sentAt: data.sent_at ? String(data.sent_at) : null,
          createdAt: data.created_at ? String(data.created_at) : null,
          lastError: data.last_error ? String(data.last_error) : null,
          orderRefs: {
            orderId: data.order_id ? String(data.order_id) : null,
            eggOrderId: data.egg_order_id ? String(data.egg_order_id) : null,
            chickenOrderId: data.chicken_order_id ? String(data.chicken_order_id) : null,
            campaignId: data.campaign_id ? String(data.campaign_id) : null,
          },
        },
      });
    }

    const { data, error } = await supabaseAdmin
      .from('email_log')
      .select('id, recipient, subject, message, sent_at, created_at, order_id')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (isMissingEmailRelationError(error)) {
        return NextResponse.json(
          { error: 'Legacy email_log table is not available in this environment' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Failed to fetch email preview' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    const legacyMessage = String(data.message || '');
    return NextResponse.json({
      preview: {
        id: String(data.id),
        source: 'legacy_email_log',
        subject: String(data.subject || ''),
        html: looksLikeHtml(legacyMessage) ? legacyMessage : wrapPlainTextAsHtml(legacyMessage),
        classification: 'system',
        status: 'sent',
        toEmail: data.recipient ? String(data.recipient) : null,
        templateKey: null,
        sourcePath: 'legacy.email_log',
        sentAt: data.sent_at ? String(data.sent_at) : null,
        createdAt: data.created_at ? String(data.created_at) : null,
        lastError: null,
        orderRefs: {
          orderId: data.order_id ? String(data.order_id) : null,
          eggOrderId: null,
          chickenOrderId: null,
          campaignId: null,
        },
      },
    });
  }

  const inputEmail = normalizeEmail(searchParams.get('email'));
  const inputPhone = normalizePhone(searchParams.get('phone'));
  const inputUserId = String(searchParams.get('userId') || '').trim();
  const customerId = String(searchParams.get('customerId') || '').trim();
  const parsedFromCustomerId = parseCustomerId(customerId);

  const email = inputEmail || normalizeEmail(parsedFromCustomerId.email);
  const phone = inputPhone || normalizePhone(parsedFromCustomerId.phone);
  const userId = inputUserId || String(parsedFromCustomerId.userId || '').trim();
  const limit = Math.max(20, Math.min(500, Number.parseInt(searchParams.get('limit') || '200', 10)));

  if (!email && !phone && !userId) {
    return NextResponse.json(
      { error: 'Provide at least one identifier: email, phone, userId, or customerId' },
      { status: 400 }
    );
  }

  const resolvedOrderIds = await resolveOrderIdsForIdentity({
    email: email || undefined,
    phone: phone || undefined,
    userId: userId || undefined,
    limitPerQuery: limit,
  });

  const communications = await fetchCommunicationHistory({
    email: email || undefined,
    phone: phone || undefined,
    userId: userId || undefined,
    pigOrderIds: resolvedOrderIds.pigOrderIds,
    eggOrderIds: resolvedOrderIds.eggOrderIds,
    chickenOrderIds: resolvedOrderIds.chickenOrderIds,
    limit,
  });

  const suppression = await getSuppression(email);

  return NextResponse.json({
    communications,
    suppression,
    resolvedOrderIds,
    identity: {
      email,
      phone,
      phoneDigits: phoneDigits(phone),
      userId,
    },
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || '').trim();

  if (!action) {
    return NextResponse.json({ error: 'Action is required' }, { status: 400 });
  }

  if (action === 'suppress') {
    const email = normalizeEmail(body?.email);
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const reasonRaw = String(body?.reason || 'manual_unsubscribe').trim();
    const reason = ['manual_unsubscribe', 'bounced', 'complaint'].includes(reasonRaw)
      ? reasonRaw
      : 'manual_unsubscribe';
    const source = String(admin.session?.email || admin.session?.name || 'admin').slice(0, 200);

    const { error } = await supabaseAdmin
      .from('email_suppression_list')
      .upsert({ email, reason, source }, { onConflict: 'email' });

    if (error) {
      if (isMissingEmailRelationError(error)) {
        return NextResponse.json(
          { error: 'Suppression list table is not available in this environment yet' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Failed to suppress email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, email, reason, source });
  }

  if (action === 'unsuppress') {
    const email = normalizeEmail(body?.email);
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('email_suppression_list').delete().ilike('email', email);
    if (error) {
      if (isMissingEmailRelationError(error)) {
        return NextResponse.json(
          { error: 'Suppression list table is not available in this environment yet' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Failed to remove suppression' }, { status: 500 });
    }

    return NextResponse.json({ success: true, email });
  }

  if (action === 'resend') {
    const queueId = String(body?.queueId || '').trim();
    if (!queueId) {
      return NextResponse.json({ error: 'queueId is required' }, { status: 400 });
    }

    const { data: queueRow, error } = await supabaseAdmin
      .from('email_dispatch_queue')
      .select(
        'id, to_email, to_phone, subject, html, classification, locale, template_key, campaign_id, order_id, egg_order_id, chicken_order_id, customer_message_id, metadata'
      )
      .eq('id', queueId)
      .maybeSingle();

    if (error) {
      if (isMissingEmailRelationError(error)) {
        return NextResponse.json(
          { error: 'Email queue table is not available in this environment yet' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Failed to read queue entry' }, { status: 500 });
    }

    if (!queueRow) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 });
    }

    const to = normalizeEmail(queueRow.to_email);
    if (!to) {
      return NextResponse.json({ error: 'Queue entry has no recipient email' }, { status: 400 });
    }

    const now = Date.now();
    const result = await dispatchEmail({
      to,
      toPhone: queueRow.to_phone || undefined,
      subject: String(queueRow.subject || ''),
      html: String(queueRow.html || ''),
      classification: sanitizeClassification(queueRow.classification),
      locale: queueRow.locale === 'en' ? 'en' : 'no',
      templateKey: queueRow.template_key || undefined,
      campaignId: queueRow.campaign_id || undefined,
      orderId: queueRow.order_id || undefined,
      eggOrderId: queueRow.egg_order_id || undefined,
      chickenOrderId: queueRow.chicken_order_id || undefined,
      customerMessageId: queueRow.customer_message_id || undefined,
      sourcePath: '/api/admin/customers/email?action=resend',
      metadata: {
        ...(queueRow.metadata && typeof queueRow.metadata === 'object'
          ? (queueRow.metadata as Record<string, unknown>)
          : {}),
        resend_of_queue_id: queueId,
        resent_by_admin: admin.session?.email || admin.session?.name || 'admin',
        resent_at: new Date(now).toISOString(),
      },
      idempotency: {
        source: 'admin.resend',
        entity: 'queue_email',
        id: `${queueId}:${now}`,
        template: queueRow.template_key || 'resend',
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to resend email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mode: result.mode,
      queueId: result.queueId || null,
      id: result.id || null,
      skipped: Boolean(result.skipped),
      skipReason: result.skipReason || null,
    });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
