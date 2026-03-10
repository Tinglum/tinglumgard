import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/app/api/admin/email/_shared';
import { resolveCampaignRecipients, upsertCampaignRecipients } from '@/lib/email/campaigns';
import type { EmailClassification } from '@/lib/email/types';

const ALLOWED_CLASSIFICATIONS: EmailClassification[] = [
  'transactional',
  'support',
  'promotional',
  'system',
];

const ALLOWED_STATUSES = new Set([
  'draft',
  'ready',
  'queued',
  'sending',
  'completed',
  'cancelled',
]);

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

export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const { data, error } = await supabaseAdmin
    .from('email_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    if (isMissingRelationError(error)) {
      return NextResponse.json({
        campaigns: [],
        legacyFallback: true,
        unavailableReason: 'email_campaigns table is not available in this environment yet',
      });
    }

    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }

  return NextResponse.json({ campaigns: data || [] });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return admin.response;

  const body = await request.json();
  const name = String(body?.name || '').trim();
  const classification = String(body?.classification || 'promotional').trim() as EmailClassification;
  const subjectNo = String(body?.subjectNo || '').trim();
  const subjectEn = String(body?.subjectEn || '').trim();
  const bodyNo = String(body?.bodyNo || '').trim();
  const bodyEn = String(body?.bodyEn || '').trim();
  const recipientMode = String(body?.recipientMode || 'all').trim() as 'all' | 'manual' | 'filters';
  const recipientFilter = typeof body?.recipientFilter === 'object' && body?.recipientFilter ? body.recipientFilter : {};
  const manualRecipients = Array.isArray(body?.manualRecipients) ? body.manualRecipients : [];
  const requestedStatus = String(body?.status || 'draft').trim();
  const mappedStatus =
    requestedStatus === 'ready_for_approval' || requestedStatus === 'approved'
      ? 'ready'
      : requestedStatus;
  const status = ALLOWED_STATUSES.has(mappedStatus) ? mappedStatus : 'draft';

  if (!name || !subjectNo || !subjectEn || !bodyNo || !bodyEn) {
    return NextResponse.json({ error: 'Missing campaign fields' }, { status: 400 });
  }

  if (!ALLOWED_CLASSIFICATIONS.includes(classification)) {
    return NextResponse.json({ error: 'Invalid classification' }, { status: 400 });
  }

  if (!['all', 'manual', 'filters'].includes(recipientMode)) {
    return NextResponse.json({ error: 'Invalid recipient mode' }, { status: 400 });
  }

  const basePayload = {
    name,
    classification,
    status,
    subject_no: subjectNo,
    subject_en: subjectEn,
    body_no: bodyNo,
    body_en: bodyEn,
    recipient_mode: recipientMode,
    recipient_filter: recipientFilter,
    created_by: admin.session?.email || admin.session?.name || 'admin',
  };

  let { data: campaign, error: campaignError } = await supabaseAdmin
    .from('email_campaigns')
    .insert(basePayload)
    .select('*')
    .single();

  if (campaignError && isInvalidCampaignStatusError(campaignError) && status === 'ready') {
    const legacyFallbackInsert = await supabaseAdmin
      .from('email_campaigns')
      .insert({
        ...basePayload,
        status: 'approved',
      })
      .select('*')
      .single();
    campaign = legacyFallbackInsert.data;
    campaignError = legacyFallbackInsert.error;
  }

  if (campaignError || !campaign) {
    if (isMissingRelationError(campaignError)) {
      return NextResponse.json(
        { error: 'Campaign tables are not migrated yet in this environment' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }

  const recipients = await resolveCampaignRecipients({
    recipientMode,
    recipientFilter,
    manualRecipients,
  });
  const totalRecipients = await upsertCampaignRecipients(campaign.id, recipients);

  if (recipients.length > 0 && totalRecipients === 0) {
    return NextResponse.json(
      { error: 'Campaign recipients table is not available in this environment' },
      { status: 503 }
    );
  }

  await supabaseAdmin
    .from('email_campaigns')
    .update({ total_recipients: totalRecipients })
    .eq('id', campaign.id);

  return NextResponse.json({
    campaign: {
      ...campaign,
      total_recipients: totalRecipients,
    },
    totalRecipients,
  });
}
