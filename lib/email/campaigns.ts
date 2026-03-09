import { supabaseAdmin } from '@/lib/supabase/server';
import { getEffectiveBoxSize } from '@/lib/orders/display';
import { evaluateEmailConsent } from '@/lib/email/consent';
import { dispatchEmail } from '@/lib/email/dispatch';

export interface CampaignRecipient {
  email: string;
  phone?: string | null;
  name?: string | null;
}

type CampaignRecord = {
  id: string;
  classification: 'transactional' | 'support' | 'promotional' | 'system';
  recipient_mode: 'all' | 'manual' | 'filters';
  recipient_filter: Record<string, unknown>;
  subject_no: string;
  subject_en: string;
  body_no: string;
  body_en: string;
  status: string;
  scheduled_at: string | null;
};

type RecipientRow = {
  id: string;
  email: string;
  phone: string | null;
  name: string | null;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value?: string | null): string {
  return (value || '').replace(/\D/g, '');
}

function uniqueRecipients(input: CampaignRecipient[]): CampaignRecipient[] {
  const map = new Map<string, CampaignRecipient>();
  for (const recipient of input) {
    const email = normalizeEmail(recipient.email);
    if (!email) continue;
    if (!map.has(email)) {
      map.set(email, {
        email,
        phone: recipient.phone || null,
        name: recipient.name || null,
      });
    }
  }
  return Array.from(map.values());
}

async function resolveExtrasFilter(extraIds: string[]): Promise<Set<string>> {
  if (extraIds.length === 0) return new Set();
  const { data } = await supabaseAdmin.from('extras_catalog').select('id, slug').in('id', extraIds);
  return new Set((data || []).map((row) => row.slug as string).filter(Boolean));
}

async function getRecipientsFromOrders(filter: Record<string, unknown>): Promise<CampaignRecipient[]> {
  const awaitingFinalPayment = filter.awaitingFinalPayment === true;
  const boxSize = typeof filter.boxSize === 'number' ? filter.boxSize : null;
  const hasExtras = filter.hasExtras === true;
  const extraIds = Array.isArray(filter.extraIds) ? filter.extraIds.map(String) : [];

  let query = supabaseAdmin.from('orders').select(
    'id, customer_email, customer_phone, customer_name, status, box_size, extra_products, mangalitsa_preset:mangalitsa_box_presets(target_weight_kg)'
  );

  if (awaitingFinalPayment) {
    query = query.eq('status', 'deposit_paid');
  }

  const { data: orders, error } = await query;
  if (error) return [];

  const extraSlugs = await resolveExtrasFilter(extraIds);
  const recipients: CampaignRecipient[] = [];

  for (const order of orders || []) {
    const email = normalizeEmail(String(order.customer_email || ''));
    if (!email || email === 'pending@vipps.no') continue;

    if (boxSize && getEffectiveBoxSize(order as any) !== boxSize) continue;

    const orderExtras = Array.isArray(order.extra_products) ? order.extra_products : [];
    if (hasExtras && orderExtras.length === 0) continue;

    if (extraSlugs.size > 0) {
      const hasMatchingExtra = orderExtras.some((extra: any) => extraSlugs.has(String(extra?.slug || '')));
      if (!hasMatchingExtra) continue;
    }

    recipients.push({
      email,
      phone: order.customer_phone || null,
      name: order.customer_name || null,
    });
  }

  return recipients;
}

export async function resolveCampaignRecipients(params: {
  recipientMode: 'all' | 'manual' | 'filters';
  recipientFilter?: Record<string, unknown>;
  manualRecipients?: Array<{ email: string; phone?: string; name?: string }>;
}): Promise<CampaignRecipient[]> {
  const filter = params.recipientFilter || {};
  const excludedEmails = new Set(
    (Array.isArray(filter.excludeEmails) ? filter.excludeEmails : [])
      .map((value: unknown) => normalizeEmail(String(value || '')))
      .filter(Boolean)
  );
  const excludedPhones = new Set(
    (Array.isArray(filter.excludePhones) ? filter.excludePhones : [])
      .map((value: unknown) => normalizePhone(String(value || '')))
      .filter(Boolean)
  );

  let candidates: CampaignRecipient[] = [];

  if (params.recipientMode === 'manual') {
    candidates = (params.manualRecipients || [])
      .map((recipient) => ({
        email: normalizeEmail(recipient.email),
        phone: recipient.phone || null,
        name: recipient.name || null,
      }))
      .filter((recipient) => recipient.email.length > 0);
  } else if (params.recipientMode === 'filters') {
    candidates = await getRecipientsFromOrders(filter);
  } else {
    const { data: users } = await supabaseAdmin
      .from('vipps_users')
      .select('email, phone_number, name')
      .not('email', 'is', null);
    candidates = (users || [])
      .map((user) => ({
        email: normalizeEmail(String(user.email || '')),
        phone: user.phone_number || null,
        name: user.name || null,
      }))
      .filter((recipient) => recipient.email.length > 0);
  }

  return uniqueRecipients(candidates).filter((candidate) => {
    const emailBlocked = excludedEmails.has(candidate.email);
    const phoneBlocked = candidate.phone ? excludedPhones.has(normalizePhone(candidate.phone)) : false;
    return !emailBlocked && !phoneBlocked;
  });
}

export async function upsertCampaignRecipients(
  campaignId: string,
  recipients: CampaignRecipient[]
): Promise<number> {
  if (recipients.length === 0) return 0;

  const rows = recipients.map((recipient) => ({
    campaign_id: campaignId,
    email: recipient.email,
    phone: recipient.phone || null,
    name: recipient.name || null,
    status: 'planned',
    skip_reason: null,
    queue_id: null,
  }));

  const { error } = await supabaseAdmin
    .from('email_campaign_recipients')
    .upsert(rows, { onConflict: 'campaign_id,email' });

  if (error) {
    return 0;
  }

  return rows.length;
}

export async function evaluateCampaignRecipients(
  recipients: CampaignRecipient[]
): Promise<{
  allowed: CampaignRecipient[];
  skipped: Array<CampaignRecipient & { reason: string }>;
}> {
  const allowed: CampaignRecipient[] = [];
  const skipped: Array<CampaignRecipient & { reason: string }> = [];

  for (const recipient of recipients) {
    const consent = await evaluateEmailConsent({
      toEmail: recipient.email,
      toPhone: recipient.phone || null,
      classification: 'promotional',
    });

    if (consent.allowed) {
      allowed.push(recipient);
      continue;
    }

    skipped.push({
      ...recipient,
      reason: consent.reason || 'skipped',
    });
  }

  return { allowed, skipped };
}

function toCampaignRecipient(row: RecipientRow): CampaignRecipient {
  return {
    email: normalizeEmail(String(row.email || '')),
    phone: row.phone || null,
    name: row.name || null,
  };
}

async function campaignCronOnlyEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('app_config')
    .select('value')
    .eq('key', 'campaign_send_via_api_cron_only')
    .maybeSingle();

  if (typeof data?.value === 'boolean') return data.value;
  if (typeof data?.value === 'string') return data.value === 'true';
  return true;
}

export async function enqueueCampaignById(params: {
  campaignId: string;
  locale?: 'no' | 'en';
  sourcePath: string;
}): Promise<{
  ok: boolean;
  statusCode: number;
  payload: Record<string, unknown>;
}> {
  const locale: 'no' | 'en' = params.locale === 'en' ? 'en' : 'no';

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('email_campaigns')
    .select('*')
    .eq('id', params.campaignId)
    .single();

  if (campaignError || !campaign) {
    return {
      ok: false,
      statusCode: 404,
      payload: { error: 'Campaign not found' },
    };
  }

  const typedCampaign = campaign as unknown as CampaignRecord;
  if (!['ready', 'queued'].includes(typedCampaign.status)) {
    return {
      ok: false,
      statusCode: 400,
      payload: { error: 'Campaign must be in ready/queued status before enqueue' },
    };
  }

  let { data: recipientRows } = await supabaseAdmin
    .from('email_campaign_recipients')
    .select('id, email, phone, name')
    .eq('campaign_id', typedCampaign.id);

  if (!recipientRows || recipientRows.length === 0) {
    const resolved = await resolveCampaignRecipients({
      recipientMode: typedCampaign.recipient_mode,
      recipientFilter: (typedCampaign.recipient_filter || {}) as Record<string, unknown>,
    });
    await upsertCampaignRecipients(typedCampaign.id, resolved);
    const refreshed = await supabaseAdmin
      .from('email_campaign_recipients')
      .select('id, email, phone, name')
      .eq('campaign_id', typedCampaign.id);
    recipientRows = (refreshed.data || []) as RecipientRow[];
  }

  const recipients = (recipientRows || []).map((row) => toCampaignRecipient(row as RecipientRow));
  const eligibility = await evaluateCampaignRecipients(recipients);
  const recipientIdByEmail = new Map<string, string>();

  for (const row of recipientRows || []) {
    recipientIdByEmail.set(
      normalizeEmail(String((row as RecipientRow).email || '')),
      String((row as RecipientRow).id)
    );
  }

  for (const skipped of eligibility.skipped) {
    const recipientId = recipientIdByEmail.get(skipped.email);
    if (!recipientId) continue;
    await supabaseAdmin
      .from('email_campaign_recipients')
      .update({
        status: 'skipped',
        skip_reason: skipped.reason,
      })
      .eq('id', recipientId);
  }

  const subject = locale === 'en' ? typedCampaign.subject_en : typedCampaign.subject_no;
  const bodyHtml = locale === 'en' ? typedCampaign.body_en : typedCampaign.body_no;

  let queued = 0;
  let sent = 0;
  let failed = 0;

  await supabaseAdmin
    .from('email_campaigns')
    .update({
      status: 'sending',
    })
    .eq('id', typedCampaign.id);

  for (const recipient of eligibility.allowed) {
    const recipientId = recipientIdByEmail.get(recipient.email);
    if (!recipientId) continue;

    const result = await dispatchEmail({
      to: recipient.email,
      toPhone: recipient.phone || undefined,
      subject,
      html: bodyHtml,
      classification: typedCampaign.classification,
      locale,
      campaignId: typedCampaign.id,
      sourcePath: params.sourcePath,
      metadata: {
        campaign_id: typedCampaign.id,
        recipient_name: recipient.name || null,
      },
      idempotency: {
        source: 'campaign',
        entity: 'recipient',
        id: `${typedCampaign.id}:${recipient.email}`,
        template: 'campaign',
      },
    });

    if (!result.success) {
      failed += 1;
      await supabaseAdmin
        .from('email_campaign_recipients')
        .update({
          status: 'failed',
          skip_reason: result.error || 'enqueue_failed',
          queue_id: result.queueId || null,
        })
        .eq('id', recipientId);
      continue;
    }

    const recipientStatus = result.mode === 'active' ? 'queued' : 'sent';
    await supabaseAdmin
      .from('email_campaign_recipients')
      .update({
        status: recipientStatus,
        skip_reason: result.skipped ? result.skipReason || 'skipped' : null,
        queue_id: result.queueId || null,
      })
      .eq('id', recipientId);

    if (recipientStatus === 'queued') {
      queued += 1;
    } else {
      sent += 1;
    }
  }

  const nextStatus = queued > 0 ? 'queued' : sent > 0 ? 'completed' : 'cancelled';
  await supabaseAdmin
    .from('email_campaigns')
    .update({
      status: nextStatus,
      total_recipients: recipients.length,
    })
    .eq('id', typedCampaign.id);

  return {
    ok: true,
    statusCode: 200,
    payload: {
      campaignId: typedCampaign.id,
      total: recipients.length,
      skipped: eligibility.skipped.length,
      queued,
      sent,
      failed,
      status: nextStatus,
    },
  };
}

export async function processScheduledCampaigns(params?: {
  locale?: 'no' | 'en';
  sourcePath?: string;
  enforceCronOnly?: boolean;
}): Promise<{ scanned: number; queued: number; failed: number }> {
  const locale: 'no' | 'en' = params?.locale === 'en' ? 'en' : 'no';
  const sourcePath = params?.sourcePath || '/api/cron/email-flow-runner';
  const enforceCronOnly = params?.enforceCronOnly !== false;

  if (enforceCronOnly) {
    const enabled = await campaignCronOnlyEnabled();
    if (!enabled) {
      return { scanned: 0, queued: 0, failed: 0 };
    }
  }

  const { data: campaigns } = await supabaseAdmin
    .from('email_campaigns')
    .select('id, status, scheduled_at')
    .eq('status', 'ready')
    .order('created_at', { ascending: true })
    .limit(100);

  const nowMs = Date.now();

  let scanned = 0;
  let queued = 0;
  let failed = 0;

  for (const campaign of campaigns || []) {
    if (campaign.scheduled_at) {
      const scheduledMs = new Date(campaign.scheduled_at).getTime();
      if (Number.isFinite(scheduledMs) && scheduledMs > nowMs) {
        continue;
      }
    }
    scanned += 1;
    const result = await enqueueCampaignById({
      campaignId: String(campaign.id),
      locale,
      sourcePath,
    });

    if (!result.ok) {
      failed += 1;
      continue;
    }

    const payloadQueued = Number(result.payload.queued || 0);
    queued += payloadQueued;
  }

  return {
    scanned,
    queued,
    failed,
  };
}
