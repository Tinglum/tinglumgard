import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
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
